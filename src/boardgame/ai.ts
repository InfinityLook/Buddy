import { platneSmery } from './engine'
import { OBCHODY_PODLE_KLICE, type DefiniceObchodu } from './obchody'
import { SABOTAZNI_AKCE } from './data/sabotaze'
import type { Hrac, NabidkaObchodu, Smer, TrhStav } from './types'

// ==========================================
// Buddyho Trh — jednoduchý bot, stejná "reaktivní, žádná paměť"
// disciplína jako Souboj's combat/ai.ts: každé rozhodnutí se dělá
// znovu z aktuálního TrhStav, žádné plánování dopředu. Fáze 0 dala
// botovi jen výběr směru; Fáze 1 (ekonomika) přidala jediné další
// rozhodnutí, "koupit, nebo ne"; Fáze 4 (sabotáž) přidala třetí —
// "okrást nejbohatšího soupeře, nebo ne"; Fáze 5 (obchodování) přidává
// dvě poslední: "navrhnout obchod aktivnímu hráči, nebo ne" a "přijmout
// čekající obchod, nebo ne" — pořád jedno ploché pravidlo na
// rozhodnutí, žádný chytrý model. Bot u obchodu navíc NIKDY neposílá
// protinabídku (ta zůstává čistě lidská schopnost, viz engine.ts's
// `navrhniProtinabidku`) — jen navrhne jedno jednoduché "peníze za
// pole", nebo cizí nabídku přijme/odmítne.
//
// `nahodne` injektovatelné kvůli testovatelnosti, stejný důvod jako
// u Souboj's `nahodnaPostava`/`pripravAkciAi` — tenhle bot běží jen
// lokálně, nikdy se s ničím nesynchronizuje, takže na determinismus
// enginu samotného to nemá vliv.
// ==========================================

/** Vybere směr dalšího kroku pro bota — rovnoměrně náhodně mezi
 *  směry, které doopravdy vedou na mřížku. Nikdy nevrátí `null`,
 *  protože mřížka 7×7 vždycky nabízí aspoň jeden platný směr. */
export const pripravSmerBota = (hrac: Hrac, stav: TrhStav, nahodne: () => number = Math.random): Smer => {
  const platne = platneSmery(hrac.pozice, stav)
  const index = Math.floor(nahodne() * platne.length)
  return platne[Math.min(index, platne.length - 1)]
}

/** Kolik peněz si bot vždycky nechá stranou, i kdyby si mohl koupit
 *  ještě dražší obchod — ne chytrá strategie, jen pojistka proti
 *  utracení úplně do nuly na první nabídce. */
const BOT_MINIMALNI_REZERVA = 100

/** Koupí bot nabízený obchod? Ano, pokud mu po zaplacení zbyde aspoň
 *  rezerva výš — žádné vážení výhodnosti ceny/nájmu, stejná
 *  jednoduchost jako Souboj's vlastní reaktivní bot. */
export const melByBotKoupit = (hrac: Hrac, obchod: DefiniceObchodu): boolean =>
  hrac.penize - obchod.cena >= BOT_MINIMALNI_REZERVA

/** Kolik kreditů musí mít soupeř, aby ho bot vůbec stálo za to okrást
 *  — pojistka proti "sabotuj, i když soupeř nemá skoro nic". */
const BOT_SABOTAZ_MIN_CIL = 50

/** Rozhodne, jestli a koho má bot sabotovat (Fáze 4) — zatím jen
 *  akcí "Krádež" (jediná s jasně vyhodnotitelným ziskem plochým
 *  pravidlem), vždycky na NEJBOHATŠÍHO soupeře (nejjednodušší "útoč
 *  na vedoucího", žádný výhled dopředu). Vrátí `null`, pokud bot
 *  sabotáž tenhle tah už použil, nemá na ni (s rezervou) dost peněz,
 *  nebo žádný soupeř nemá co ukrást. Zpomalení/Odstrčení zůstávají
 *  ve verzi 1 jen pro lidské hráče — bot je nepoužívá, zdokumentovaná
 *  škrtnutá hranice rozsahu, ne přehlédnutí. */
export const melByBotSabotovat = (bot: Hrac, ostatni: Hrac[]): { akceId: string; cilId: string } | null => {
  if (bot.sabotazPouzita) return null
  const akce = SABOTAZNI_AKCE.find((a) => a.id === 'krast')
  if (!akce || bot.penize - akce.cena < BOT_MINIMALNI_REZERVA) return null
  const nejbohatsi = ostatni.filter((h) => h.id !== bot.id).sort((a, b) => b.penize - a.penize)[0]
  if (!nejbohatsi || nejbohatsi.penize < BOT_SABOTAZ_MIN_CIL) return null
  return { akceId: akce.id, cilId: nejbohatsi.id }
}

/** Jaký podíl ceny pole bot nabídne za cizí pole, o které stojí —
 *  záměrně podhodnocená, ale ne urážlivá nabídka, stejná jednoduchost
 *  jako melByBotSabotovat's pevná 150 kreditová krádež. */
const NABIDKA_BOTU_PODIL_CENY = 0.7

/** Jak často (jednou na vstup aktivního hráče do fáze 'konec-tahu') má
 *  bot vůbec ZVÁŽIT návrh obchodu — appka to drží pravděpodobnostní,
 *  ne "pokaždé", ať to nepůsobí jako spam při každém jednom tahu. */
const SANCE_BOTU_NABIDNOUT_OBCHOD = 0.3

/** Zváží, jestli má bot navrhnout obchod aktivnímu hráči `cil` (Fáze
 *  5) — nejdřív hodí kostkou náhody, jestli to tenhle tah vůbec
 *  zkusí (viz `nahodne` komentář níž), pak náhodně vybere jedno z
 *  cílových vlastněných polí a nabídne za něj peníze rovné
 *  NABIDKA_BOTU_PODIL_CENY podílu jeho ceny — nikdy nenabízí vlastní
 *  pole ani nepožaduje nic jiného než to jedno pole, nejjednodušší
 *  koherentní tvar nabídky od bota (lidský hráč na druhé straně má
 *  mnohem víc svobody při vlastním návrhu). Vrátí `null`, pokud kostka
 *  náhody řekne "tenhle tah ne", cíl nic nevlastní, nebo by bot po
 *  zaplacení klesl pod rezervu.
 *
 *  `nahodne` appka volá v pevném pořadí (nejdřív šance-na-pokus,
 *  teprve POTOM výběr konkrétního pole) — test, co chce ověřit "bot to
 *  tenhle tah nezkusí", proto potřebuje zafrontovat jen jednu hodnotu
 *  nad SANCE_BOTU_NABIDNOUT_OBCHOD, žádnou druhou. */
export const zvazBotuNabidkuObchodu = (
  bot: Hrac,
  cil: Hrac,
  stav: TrhStav,
  nahodne: () => number = Math.random
): { nabizenePenize: number; nabizenaPole: string[]; pozadovanePenize: number; pozadovanaPole: string[] } | null => {
  if (nahodne() > SANCE_BOTU_NABIDNOUT_OBCHOD) return null

  const cilovaPole = Object.entries(stav.vlastnictvi)
    .filter(([, vlastnikId]) => vlastnikId === cil.id)
    .map(([klic]) => klic)
  if (cilovaPole.length === 0) return null

  const index = Math.min(Math.floor(nahodne() * cilovaPole.length), cilovaPole.length - 1)
  const obchod = OBCHODY_PODLE_KLICE[cilovaPole[index]]
  if (!obchod) return null

  const nabidka = Math.round(obchod.cena * NABIDKA_BOTU_PODIL_CENY)
  if (bot.penize - nabidka < BOT_MINIMALNI_REZERVA) return null

  return { nabizenePenize: nabidka, nabizenaPole: [], pozadovanePenize: 0, pozadovanaPole: [obchod.klic] }
}

/** Rozhodne, jestli má bot `bot` (vždycky příjemce, `nabidka.komu`)
 *  čekající obchod přijmout — spočítá čistý přínos (peníze + cena
 *  nabízených polí, co by bot DOSTAL, mínus peníze + cena požadovaných
 *  polí, co by bot DAL) a přijme, jen pokud vyjde kladně a botovi po
 *  obchodu zbyde rezerva. Žádné váhání "jak moc se mi ten konkrétní
 *  obchod líbí" navíc — stejná plochá jednoduchost jako
 *  melByBotKoupit. Bot nikdy neposílá protinabídku (viz engine.ts's
 *  `navrhniProtinabidku`) — tahle funkce vrací jen ano/ne, nikdy
 *  upravený návrh. */
export const melByBotPrijmoutObchod = (bot: Hrac, nabidka: NabidkaObchodu): boolean => {
  const cenaPole = (klice: string[]): number => klice.reduce((s, k) => s + (OBCHODY_PODLE_KLICE[k]?.cena ?? 0), 0)
  const hodnotaZisku = nabidka.nabizenePenize + cenaPole(nabidka.nabizenaPole)
  const hodnotaVydaje = nabidka.pozadovanePenize + cenaPole(nabidka.pozadovanaPole)
  if (hodnotaZisku <= hodnotaVydaje) return false
  return bot.penize - nabidka.pozadovanePenize >= BOT_MINIMALNI_REZERVA
}
