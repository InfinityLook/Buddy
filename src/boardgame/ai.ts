import { platneSmery } from './engine'
import type { DefiniceObchodu } from './obchody'
import { SABOTAZNI_AKCE } from './data/sabotaze'
import type { Hrac, Smer, TrhStav } from './types'

// ==========================================
// Buddyho Trh — jednoduchý bot, stejná "reaktivní, žádná paměť"
// disciplína jako Souboj's combat/ai.ts: každé rozhodnutí se dělá
// znovu z aktuálního TrhStav, žádné plánování dopředu. Fáze 0 dala
// botovi jen výběr směru; Fáze 1 (ekonomika) přidala jediné další
// rozhodnutí, "koupit, nebo ne"; Fáze 4 (sabotáž) přidává třetí —
// "okrást nejbohatšího soupeře, nebo ne" — pořád jedno ploché
// pravidlo na rozhodnutí, žádný chytrý model.
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
