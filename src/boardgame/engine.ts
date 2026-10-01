import type { FazeTahu, Hrac, LimitMinut, Pole2D, ProbihajiciMinihra, Smer, TrhStav } from './types'
import type { PostavaId } from './postavy'
import { najdiObchodNaPoli, OBCHODY_PODLE_KLICE } from './obchody'
import { jeOsudovePole } from './osud'
import { jeKoloStestiPole } from './kolostesti'
import { jeMinihrovePole } from './minihry'
import { UDALOSTI, type EfektUdalosti } from './data/udalosti'
import { vyberVysledekKola, type EfektKola } from './data/kolaStesti'
import { SABOTAZNI_AKCE } from './data/sabotaze'
import {
  MINIHRY_PODLE_TYPU,
  odmenaZaPexeso,
  POLOZKY_DRAZBY,
  POLOZKY_DRAZBY_PODLE_ID,
  PRIHOZ_DRAZBY,
  stupenOdmenyRychleAukce,
  SYMBOLY_PEXESA,
  vyberTypMinihry,
} from './data/minihry'

// ==========================================
// Buddyho Trh — čistý herní engine, stejná disciplína jako
// src/fighting/combat/engine.ts: žádný React, žádná síť, jen funkce
// a data. `krokHodu`/`krokPohybu`/`ukonciTah` berou `TrhStav` a vrací
// nový — appka (Fáze 0) je volá jak z lokálního pass-and-play UI, tak
// (v pozdější fázi) ze sítového TV/telefon vrstvení, přesně jako
// Souboj sdílí jeden `krokSouboje` mezi LocalniZapas.tsx a TvHost.tsx.
//
// Náhoda (hod kostkou) je injektovatelná (`nahodne`), ne natvrdo
// Math.random() — stejný důvod jako u Souboj's postavy/arény: appka
// tak umí psát deterministické testy bez mockování globálu.
// ==========================================

export const SIRKA_MRIZKY = 7
export const VYSKA_MRIZKY = 7
export const POCATECNI_PENIZE = 1000

export const vytvorHrace = (
  id: string,
  jmeno: string,
  postavaId: PostavaId,
  jeBot: boolean,
  pozice: Pole2D
): Hrac => ({
  id,
  jmeno,
  postavaId,
  pozice,
  penize: POCATECNI_PENIZE,
  jeBot,
  preskociTah: false,
  maBonusovyHod: false,
  sabotazPouzita: false,
})

/** Rozmístí hráče na okraj mřížky, ať nezačínají na sobě navzájem —
 *  jednoduché rovnoměrné rozdělení po obvodu, ne náhodné (start hry
 *  nemá důvod být nedeterministický). */
export const startovniPozice = (poradi: number, pocetHracu: number): Pole2D => {
  const stred = { x: Math.floor(SIRKA_MRIZKY / 2), z: Math.floor(VYSKA_MRIZKY / 2) }
  const uhel = (poradi / Math.max(1, pocetHracu)) * Math.PI * 2
  const polomer = Math.floor(Math.min(SIRKA_MRIZKY, VYSKA_MRIZKY) / 2)
  const x = Math.max(0, Math.min(SIRKA_MRIZKY - 1, Math.round(stred.x + Math.cos(uhel) * polomer)))
  const z = Math.max(0, Math.min(VYSKA_MRIZKY - 1, Math.round(stred.z + Math.sin(uhel) * polomer)))
  return { x, z }
}

export const VYCHOZI_LIMIT_MINUT: LimitMinut = 30

export const vytvorTrhStav = (hraci: Hrac[], limitMinut: LimitMinut = VYCHOZI_LIMIT_MINUT): TrhStav => ({
  hraci,
  poradiHracu: hraci.map((h) => h.id),
  aktivniIndex: 0,
  faze: 'hod',
  zbyvaKroku: 0,
  posledniHod: null,
  sirkaMrizky: SIRKA_MRIZKY,
  vyskaMrizky: VYSKA_MRIZKY,
  konec: false,
  vlastnictvi: {},
  nabidkaKoupe: null,
  nabidkaObchodu: null,
  minihra: null,
  posledniUdalost: null,
  posledniVysledekKolaId: null,
  kolostestiPocet: 0,
  limitMinut,
  konecCasuMs: Date.now() + limitMinut * 60_000,
})

export const aktivniHrac = (stav: TrhStav): Hrac | undefined =>
  stav.hraci.find((h) => h.id === stav.poradiHracu[stav.aktivniIndex])

const posunPole = (p: Pole2D, smer: Smer): Pole2D => {
  switch (smer) {
    case 'nahoru':
      return { x: p.x, z: p.z - 1 }
    case 'dolu':
      return { x: p.x, z: p.z + 1 }
    case 'vlevo':
      return { x: p.x - 1, z: p.z }
    case 'vpravo':
      return { x: p.x + 1, z: p.z }
  }
}

const vHranicich = (p: Pole2D, stav: TrhStav): boolean =>
  p.x >= 0 && p.x < stav.sirkaMrizky && p.z >= 0 && p.z < stav.vyskaMrizky

/** Posune pozici o `kroku` polí daným směrem, zastaví se dřív, pokud
 *  by přešla mřížku — sdílené mezi Osudovou kartou "posun" a sabotáží
 *  "odstrčení" (Fáze 4): obě chtějí identické chování, žádné
 *  přetečení přes okraj, ne teleport na druhou stranu. */
const posunOPoleHranicemi = (pozice: Pole2D, smer: Smer, kroku: number, stav: TrhStav): Pole2D => {
  let vysledek = pozice
  for (let i = 0; i < kroku; i++) {
    const dalsi = posunPole(vysledek, smer)
    if (!vHranicich(dalsi, stav)) break
    vysledek = dalsi
  }
  return vysledek
}

/** Které směry z aktuální pozice hráče doopravdy vedou na mřížku —
 *  sdílené s ai.ts, ať bot nikdy nezkusí krok mimo hranici. */
export const platneSmery = (pozice: Pole2D, stav: TrhStav): Smer[] =>
  (['nahoru', 'dolu', 'vlevo', 'vpravo'] as Smer[]).filter((s) => vHranicich(posunPole(pozice, s), stav))

/** Hodí kostkou (1–6) a otevře fázi pohybu s tolika kroky. No-op mimo
 *  fázi 'hod' — appka i síťová vrstva klidně zavolá tuhle funkci
 *  víckrát, aniž by musela sama hlídat, jestli už se hodilo.
 *
 *  Nejdřív ale zkontroluje kartu "přeskoč tah" (Fáze 2) — pokud ji
 *  aktivní hráč nese z minulého tahu, tenhle tah se vůbec nehodí,
 *  příznak se smaže a tah rovnou přejde na dalšího hráče. */
export const krokHodu = (stav: TrhStav, nahodne: () => number = Math.random): TrhStav => {
  if (stav.faze !== 'hod' || stav.konec) return stav
  const hrac = aktivniHrac(stav)
  if (hrac?.preskociTah) {
    // Tahle větev taky přesouvá aktivniIndex na jiného hráče, stejně
    // jako ukonciTah výš — musí proto stejně resetovat sabotazPouzita
    // (Fáze 4) novému aktivnímu hráči, jinak by ho mohl zdědit ještě
    // od jeho VLASTNÍHO posledního tahu (ukonciTah to při normálním
    // předání vyřeší, ale tahle "přeskoč celý tah" větev jde kolem
    // ukonciTah úplně).
    const dalsiIndex = (stav.aktivniIndex + 1) % stav.poradiHracu.length
    const dalsiId = stav.poradiHracu[dalsiIndex]
    const noviHraci = stav.hraci.map((h) => {
      if (h.id === hrac.id) return { ...h, preskociTah: false }
      if (h.id === dalsiId) return { ...h, sabotazPouzita: false }
      return h
    })
    return {
      ...stav,
      hraci: noviHraci,
      aktivniIndex: dalsiIndex,
      faze: 'hod',
      zbyvaKroku: 0,
      posledniHod: null,
      posledniUdalost: `${hrac.jmeno} vynechává tah.`,
    }
  }
  const hod = Math.floor(nahodne() * 6) + 1
  return { ...stav, faze: 'pohyb', zbyvaKroku: hod, posledniHod: hod }
}

/** Aplikuje efekt vytažené karty Osudu (Fáze 2) na hráče, co na ni
 *  doběhl — čistá funkce, žádný vedlejší účinek mimo vrácené pole
 *  hráčů. 'posun' jede po jednom poli stejnou hranici-respektující
 *  logikou jako obyčejný tah (zastaví se dřív, nepřeteče přes
 *  okraj) a NIKDY nespouští druhé vyhodnocení na nové pozici — appka
 *  tak nikdy neřeší řetězec karta→nájem→další karta. */
const aplikujEfektKarty = (hraci: Hrac[], hracId: string, efekt: EfektUdalosti, stav: TrhStav): Hrac[] => {
  switch (efekt.typ) {
    case 'penize':
      return hraci.map((h) => (h.id === hracId ? { ...h, penize: Math.max(0, h.penize + efekt.castka) } : h))
    case 'posun': {
      const pozice = posunOPoleHranicemi(hraci.find((h) => h.id === hracId)!.pozice, efekt.smer, efekt.kroku, stav)
      return hraci.map((h) => (h.id === hracId ? { ...h, pozice } : h))
    }
    case 'preskoc-tah':
      return hraci.map((h) => (h.id === hracId ? { ...h, preskociTah: true } : h))
  }
}

/** Aplikuje efekt vytaženého výsledku kola štěstí (Fáze 3) — stejná
 *  čistá, žádný-vedlejší-účinek-mimo-vrácené-pole disciplína jako
 *  aplikujEfektKarty výš. 'bonusovy-hod' jen nastaví vlajku, skutečný
 *  druhý hod řeší `ukonciTah` (viz jeho vlastní komentář) — ne krokHodu
 *  jako u preskociTah, protože se tahle vlajka konzumuje HNED ve
 *  stejném tahu, ne na začátku příštího. */
const aplikujEfektKola = (hraci: Hrac[], hracId: string, efekt: EfektKola): Hrac[] => {
  switch (efekt.typ) {
    case 'penize':
      return hraci.map((h) => (h.id === hracId ? { ...h, penize: Math.max(0, h.penize + efekt.castka) } : h))
    case 'bonusovy-hod':
      return hraci.map((h) => (h.id === hracId ? { ...h, maBonusovyHod: true } : h))
    case 'nic':
      return hraci
  }
}

/** Zamíchá dvanáct karet pexesa (šest dvojic, viz data/minihry.ts's
 *  SYMBOLY_PEXESA) — standardní Fisher-Yates, stejný injektovatelný
 *  `nahodne` jako zbytek enginu, žádné druhé, nezávislé míchání jinde
 *  v appce. */
const zamichejKartyPexesa = (nahodne: () => number): { symbol: string; nalezena: boolean }[] => {
  const symboly = [...SYMBOLY_PEXESA, ...SYMBOLY_PEXESA]
  for (let i = symboly.length - 1; i > 0; i--) {
    const j = Math.floor(nahodne() * (i + 1))
    ;[symboly[i], symboly[j]] = [symboly[j], symboly[i]]
  }
  return symboly.map((symbol) => ({ symbol, nalezena: false }))
}

/** Otevře novou minihru (Fáze 6) na políčku, na které hráč `hracId`
 *  doběhl — appka nejdřív vybere typ (vyberTypMinihry), pak pro něj
 *  sestaví počáteční stav. Dražba (viz StavDrazby's vlastní komentář
 *  v types.ts) jede jedno kolo dokola počínaje hráčem, co na pole
 *  doběhl — appka proto otočí `stav.poradiHracu` tak, ať ten hráč
 *  stojí na indexu 0. */
const otevriMinihru = (stav: TrhStav, hracId: string, nahodne: () => number): ProbihajiciMinihra => {
  const definice = vyberTypMinihry(nahodne)
  switch (definice.typ) {
    case 'pexeso':
      return { typ: 'pexeso', karty: zamichejKartyPexesa(nahodne), otevrene: [], cekaNaPotvrzeni: false, pokusy: 0 }
    case 'drazba': {
      const polozka = POLOZKY_DRAZBY[Math.min(Math.floor(nahodne() * POLOZKY_DRAZBY.length), POLOZKY_DRAZBY.length - 1)]
      const indexHrace = Math.max(0, stav.poradiHracu.indexOf(hracId))
      const poradiUcastniku = [...stav.poradiHracu.slice(indexHrace), ...stav.poradiHracu.slice(0, indexHrace)]
      return {
        typ: 'drazba',
        polozkaId: polozka.id,
        aktualniNabidka: polozka.vyvolavaciCena - PRIHOZ_DRAZBY,
        vedeId: null,
        poradiUcastniku,
        indexNaTahu: 0,
      }
    }
    case 'rychla-aukce':
      return { typ: 'rychla-aukce' }
  }
}

/** Posune aktivního hráče o jedno pole daným směrem. Krok mimo mřížku
 *  je tiše zahozen (nespotřebuje krok) — hráč prostě nemůže tím
 *  směrem, ne že by přišel o pohyb navíc za to, že to zkusil. Fáze
 *  přejde na 'konec-tahu', jakmile dojdou kroky — a jen tehdy, na
 *  úplně poslední doběhnuté políčko, se řeší ekonomika (nájem/nabídka
 *  koupě), karta Osudu (Fáze 2) nebo kolo štěstí (Fáze 3), stejně jako
 *  v Monopoly rozhoduje jen políčko, na kterém hráč doopravdy skončí,
 *  ne ta, přes která jen prošel.
 *
 *  `nahodne` je injektovatelné (stejně jako u krokHodu) kvůli
 *  deterministickým testům vytažené karty/kola — appka ho jinak v
 *  reálné hře vůbec neřeší, defaultní Math.random stačí. */
export const krokPohybu = (stav: TrhStav, smer: Smer, nahodne: () => number = Math.random): TrhStav => {
  if (stav.faze !== 'pohyb' || stav.zbyvaKroku <= 0 || stav.konec) return stav
  const hrac = aktivniHrac(stav)
  if (!hrac) return stav

  const novaPozice = posunPole(hrac.pozice, smer)
  if (!vHranicich(novaPozice, stav)) return stav

  let noviHraci = stav.hraci.map((h) => (h.id === hrac.id ? { ...h, pozice: novaPozice } : h))
  const zbyva = stav.zbyvaKroku - 1
  const doslo = zbyva <= 0

  let nabidkaKoupe: string | null = null
  let posledniUdalost = stav.posledniUdalost
  let posledniVysledekKolaId = stav.posledniVysledekKolaId
  let kolostestiPocet = stav.kolostestiPocet
  let minihra: ProbihajiciMinihra | null = null

  if (doslo) {
    const obchod = najdiObchodNaPoli(novaPozice)
    if (obchod) {
      const vlastnikId = stav.vlastnictvi[obchod.klic]
      if (!vlastnikId) {
        nabidkaKoupe = obchod.klic
      } else if (vlastnikId !== hrac.id) {
        const najemce = noviHraci.find((h) => h.id === hrac.id)!
        const castka = Math.min(najemce.penize, obchod.najem)
        noviHraci = noviHraci.map((h) => {
          if (h.id === hrac.id) return { ...h, penize: h.penize - castka }
          if (h.id === vlastnikId) return { ...h, penize: h.penize + castka }
          return h
        })
        const vlastnik = stav.hraci.find((h) => h.id === vlastnikId)
        posledniUdalost = `${hrac.jmeno} zaplatil ${castka} kreditů hráči ${vlastnik?.jmeno ?? '?'} za ${obchod.nazev}.`
      }
    } else if (jeOsudovePole(novaPozice)) {
      const karta = UDALOSTI[Math.min(Math.floor(nahodne() * UDALOSTI.length), UDALOSTI.length - 1)]
      noviHraci = aplikujEfektKarty(noviHraci, hrac.id, karta.efekt, stav)
      posledniUdalost = `🔮 ${hrac.jmeno}: ${karta.text}`
    } else if (jeKoloStestiPole(novaPozice)) {
      const vysledek = vyberVysledekKola(nahodne)
      noviHraci = aplikujEfektKola(noviHraci, hrac.id, vysledek.efekt)
      posledniUdalost = `🎡 ${hrac.jmeno}: ${vysledek.text}`
      posledniVysledekKolaId = vysledek.id
      kolostestiPocet = stav.kolostestiPocet + 1
    } else if (jeMinihrovePole(novaPozice)) {
      minihra = otevriMinihru(stav, hrac.id, nahodne)
      const definice = MINIHRY_PODLE_TYPU[minihra.typ]
      posledniUdalost = `🎮 ${hrac.jmeno} spustil(a) minihru: ${definice.nazev}!`
    }
  }

  return {
    ...stav,
    hraci: noviHraci,
    zbyvaKroku: zbyva,
    faze: doslo ? ('konec-tahu' as FazeTahu) : ('pohyb' as FazeTahu),
    nabidkaKoupe,
    minihra,
    posledniUdalost,
    posledniVysledekKolaId,
    kolostestiPocet,
  }
}

/** Koupí obchod, na který právě aktivní hráč doběhl — no-op, pokud
 *  žádná nabídka koupě neběží nebo na ni hráč nemá dost peněz. UI
 *  (Deska.tsx) tohle taky kontroluje a tlačítko rovnou zablokuje, ale
 *  engine si to hlídá nezávisle, stejný "nedůvěřuj jen volajícímu"
 *  postoj jako `krokHodu`/`krokPohybu` mají vůči vlastní fázi. */
export const koupitPole = (stav: TrhStav): TrhStav => {
  if (!stav.nabidkaKoupe || stav.konec) return stav
  const obchod = OBCHODY_PODLE_KLICE[stav.nabidkaKoupe]
  const hrac = aktivniHrac(stav)
  if (!obchod || !hrac || hrac.penize < obchod.cena) return stav

  return {
    ...stav,
    hraci: stav.hraci.map((h) => (h.id === hrac.id ? { ...h, penize: h.penize - obchod.cena } : h)),
    vlastnictvi: { ...stav.vlastnictvi, [obchod.klic]: hrac.id },
    nabidkaKoupe: null,
    posledniUdalost: `${hrac.jmeno} koupil ${obchod.nazev} za ${obchod.cena} kreditů.`,
  }
}

/** Odmítne nabídku koupě — obchod zůstává bance, tah může pokračovat
 *  ke konci. */
export const odmitnoutKoupi = (stav: TrhStav): TrhStav => {
  if (!stav.nabidkaKoupe) return stav
  return { ...stav, nabidkaKoupe: null }
}

/** Provede sabotážní akci aktivního hráče proti vybranému soupeři
 *  (Fáze 4) — na rozdíl od Osudu/kola štěstí (appka je vybírá sama
 *  náhodou, když na ně hráč políčkem narazí) je sabotáž VOLBA
 *  aktivního hráče, dostupná jen ve fázi 'konec-tahu' (po doběhnutí
 *  pohybu, po vyřešení políčka, na kterém skončil) a nejvýš jednou za
 *  tah — `Hrac.sabotazPouzita` se resetuje vždycky, když se
 *  `aktivniIndex` doopravdy přesune na někoho jiného (viz
 *  `ukonciTah`/`krokHodu`'s "přeskoč tah" větev níž), nikdy uvnitř
 *  bonusového hodu kola štěstí (ten nepočítá jako nový tah — pořád
 *  stejný hráč, pořád stejná už-vyčerpaná sabotáž).
 *
 *  Stejná "nedůvěřuj volajícímu" disciplína jako `koupitPole` — UI
 *  tlačítko appka sama zablokuje, ale engine si každou podmínku
 *  ověřuje znovu nezávisle.
 *
 *  Dokud čeká `nabidkaObchodu` (Fáze 5), je sabotáž taky no-op — na
 *  rozdíl od `nabidkaKoupe` (které `provedSabotaz` kontroluje odjakživa
 *  přes `stav.faze`, protože obě mohou nastat jen ve stejné fázi a
 *  vzájemně se vylučují) tohle je JEDINÉ místo mimo `ukonciTah`, kde se
 *  musí hlídat výslovně — fáze sama zůstává 'konec-tahu' po celou dobu
 *  obchodní nabídky, takže by `provedSabotaz` jinak prošel i uprostřed
 *  ještě nevyřízeného obchodu. Stejný důvod platí pro `stav.minihra`
 *  (Fáze 6) — dokud běží minihra, sabotáž musí počkat. */
export const provedSabotaz = (stav: TrhStav, akceId: string, cilId: string): TrhStav => {
  if (stav.faze !== 'konec-tahu' || stav.konec || stav.nabidkaKoupe || stav.nabidkaObchodu || stav.minihra) return stav
  const utocnik = aktivniHrac(stav)
  if (!utocnik || utocnik.sabotazPouzita || cilId === utocnik.id) return stav

  const akce = SABOTAZNI_AKCE.find((a) => a.id === akceId)
  if (!akce || utocnik.penize < akce.cena) return stav

  const cil = stav.hraci.find((h) => h.id === cilId)
  if (!cil) return stav

  let noviHraci = stav.hraci.map((h) =>
    h.id === utocnik.id ? { ...h, penize: h.penize - akce.cena, sabotazPouzita: true } : h
  )
  let posledniUdalost: string

  switch (akce.efekt.typ) {
    case 'krast': {
      const castka = Math.min(akce.efekt.castka, cil.penize)
      noviHraci = noviHraci.map((h) => {
        if (h.id === utocnik.id) return { ...h, penize: h.penize + castka }
        if (h.id === cil.id) return { ...h, penize: h.penize - castka }
        return h
      })
      posledniUdalost = `🥷 ${utocnik.jmeno} ukradl(a) ${cil.jmeno} ${castka} kreditů.`
      break
    }
    case 'zpomaleni':
      noviHraci = noviHraci.map((h) => (h.id === cil.id ? { ...h, preskociTah: true } : h))
      posledniUdalost = `🐌 ${utocnik.jmeno} zpomalil(a) ${cil.jmeno} — vynechá příští tah.`
      break
    case 'odstrceni': {
      const pozice = posunOPoleHranicemi(cil.pozice, akce.efekt.smer, akce.efekt.kroku, stav)
      noviHraci = noviHraci.map((h) => (h.id === cil.id ? { ...h, pozice } : h))
      posledniUdalost = `👊 ${utocnik.jmeno} odstrčil(a) ${cil.jmeno} o ${akce.efekt.kroku} pole zpět.`
      break
    }
  }

  return { ...stav, hraci: noviHraci, posledniUdalost }
}

/** Ukončí tah dřív, i když ještě zbývají kroky — hráč nemusí kroky
 *  dovyčerpat, jen je ztratí. Dovoleno z fáze 'pohyb' i 'konec-tahu',
 *  ale ne dokud čeká nerozhodnutá nabídka koupě nebo obchodu (Fáze 5)
 *  — appka by jinak mohla tiše přeskočit rozhodnutí, na které hráč ani
 *  nesáhl, nebo (u obchodu) předat tah, zatímco druhá strana na
 *  nabídku ještě vůbec nestihla zareagovat.
 *
 *  Nejdřív ale zkontroluje "bonusový hod" z kola štěstí (Fáze 3) —
 *  pokud ho aktivní hráč právě nese, appka vlajku smaže a vrátí hru do
 *  fáze 'hod' BEZ posunu `aktivniIndex`: hráč tak dostane druhý hod ve
 *  stejném tahu, místo aby tah doopravdy skončil a předal se dalšímu
 *  na řadě. Symetrické k `preskociTah` v krokHodu výš, jen opačným
 *  směrem — tamta vlajka ubírá příští tah, tahle přidává tenhle. Ani
 *  tahle větev proto nereskuje `sabotazPouzita` (Fáze 4) — bonusový
 *  hod pořád počítá jako stejný tah, ne nový, takže hráč, co sabotáž
 *  už použil, ji nedostane podruhé zadarmo jen díky bonusovému hodu.
 *
 *  Teprve VĚTEV, co `aktivniIndex` doopravdy přesune na dalšího
 *  hráče, resetuje JEHO `sabotazPouzita` na `false` — ten hráč tak
 *  vždycky dostane čistou, nepoužitou sabotáž, až na něj přijde řada.
 *
 *  `stav.minihra` (Fáze 6) blokuje stejně jako `nabidkaKoupe`/
 *  `nabidkaObchodu` výš — appka by jinak mohla předat tah (a u
 *  bonusového hodu rovnou otočit na druhý hod) uprostřed ještě
 *  nevyřešené minihry. */
export const ukonciTah = (stav: TrhStav): TrhStav => {
  if (stav.faze === 'hod' || stav.konec || stav.nabidkaKoupe || stav.nabidkaObchodu || stav.minihra) return stav
  const hrac = aktivniHrac(stav)
  if (hrac?.maBonusovyHod) {
    return {
      ...stav,
      hraci: stav.hraci.map((h) => (h.id === hrac.id ? { ...h, maBonusovyHod: false } : h)),
      faze: 'hod',
      zbyvaKroku: 0,
      posledniHod: null,
    }
  }
  const dalsiIndex = (stav.aktivniIndex + 1) % stav.poradiHracu.length
  const dalsiId = stav.poradiHracu[dalsiIndex]
  return {
    ...stav,
    hraci: stav.hraci.map((h) => (h.id === dalsiId ? { ...h, sabotazPouzita: false } : h)),
    aktivniIndex: dalsiIndex,
    faze: 'hod',
    zbyvaKroku: 0,
    posledniHod: null,
  }
}

// ==========================================
// Fáze 5 — obchodování mezi hráči. Na rozdíl od Osudu/kola štěstí
// (náhodné) a sabotáže (volba JEN aktivního hráče proti komukoli
// jinému) je obchod jediná akce, co může navrhnout i hráč, který
// zrovna NA TAHU není — appka to dovolí ve dvou tvarech, lidské
// iniciativě (aktivní hráč → kdokoli jiný) a botí iniciativě
// (kterýkoli bot → aktivní hráč, viz ai.ts's
// `zvazBotuNabidkuObchodu`), obojí pokryté jedinou podmínkou v
// `navrhniObchod` níž: jedna ze dvou stran musí být právě ten, kdo je
// na tahu. Dokud `nabidkaObchodu` běží, nic jiného se nestihne stát
// (viz nahoře přidané `|| stav.nabidkaObchodu` v `provedSabotaz` a
// `ukonciTah`, a strukturální nemožnost u krokHodu/krokPohybu/
// koupitPole/odmitnoutKoupi — ty všechny vyžadují fázi 'hod'/'pohyb'
// nebo nenulové `nabidkaKoupe`, a obchod existuje jen ve fázi
// 'konec-tahu' s nulovým `nabidkaKoupe`), takže se žádná z obou stran
// nemůže mezitím změnit — validace při přijetí proto jen opakuje tu
// samou kontrolu, co už proběhla při návrhu, ne proto, že by se
// cokoli mohlo mezitím posunout.
// ==========================================

/** Zkontroluje, že daný hráč doopravdy vlastní všechna uvedená pole —
 *  sdílené mezi `navrhniObchod` a (přes něj) `navrhniProtinabidku`, ať
 *  validace nikdy nezapomene na jednu ze dvou stran obchodu. */
const vlastniVsechnaPole = (hracId: string, pole: string[], stav: TrhStav): boolean =>
  pole.every((klic) => stav.vlastnictvi[klic] === hracId)

/** Navrhne obchod mezi `odKoho` a `komu` — no-op mimo fázi 'konec-tahu',
 *  s čekající nabídkou koupě, s UŽ čekajícím jiným obchodem, mezi
 *  hráčem a jím samým, s prázdnou nabídkou na obou stranách zároveň
 *  ("nic za nic"), bez dost peněz na kteroukoli stranu, nebo pokud
 *  kterákoli strana nevlastní všechna pole, co má podle nabídky dát.
 *  Stejná "nedůvěřuj volajícímu" disciplína jako `koupitPole`/
 *  `provedSabotaz` — appka to ověřuje znovu uvnitř funkce samotné, bez
 *  ohledu na to, co už zkontrolovalo volající UI. S čekající minihrou
 *  (Fáze 6, `stav.minihra`) je taky no-op, ze stejného důvodu jako
 *  `provedSabotaz`/`ukonciTah`. */
export const navrhniObchod = (
  stav: TrhStav,
  odKoho: string,
  komu: string,
  nabizenePenize: number,
  nabizenaPole: string[],
  pozadovanePenize: number,
  pozadovanaPole: string[]
): TrhStav => {
  if (stav.faze !== 'konec-tahu' || stav.konec || stav.nabidkaKoupe || stav.nabidkaObchodu || stav.minihra) return stav
  if (odKoho === komu) return stav
  const navrhovatel = stav.hraci.find((h) => h.id === odKoho)
  const cil = stav.hraci.find((h) => h.id === komu)
  if (!navrhovatel || !cil) return stav

  const aktivni = aktivniHrac(stav)
  if (aktivni?.id !== odKoho && aktivni?.id !== komu) return stav

  if (nabizenePenize < 0 || pozadovanePenize < 0) return stav
  if (nabizenePenize === 0 && nabizenaPole.length === 0 && pozadovanePenize === 0 && pozadovanaPole.length === 0) {
    return stav
  }
  if (navrhovatel.penize < nabizenePenize || cil.penize < pozadovanePenize) return stav
  if (!vlastniVsechnaPole(odKoho, nabizenaPole, stav) || !vlastniVsechnaPole(komu, pozadovanaPole, stav)) return stav

  return {
    ...stav,
    nabidkaObchodu: { odKoho, komu, nabizenePenize, nabizenaPole, pozadovanePenize, pozadovanaPole },
    posledniUdalost: `🤝 ${navrhovatel.jmeno} nabízí obchod hráči ${cil.jmeno}.`,
  }
}

/** Přijme čekající obchod — převede peníze i vlastnictví polí mezi
 *  oběma stranami najednou a nabídku vynuluje. No-op, pokud žádná
 *  neběží. */
export const prijmoutObchod = (stav: TrhStav): TrhStav => {
  const n = stav.nabidkaObchodu
  if (!n || stav.konec) return stav
  const odKoho = stav.hraci.find((h) => h.id === n.odKoho)
  const komu = stav.hraci.find((h) => h.id === n.komu)
  if (!odKoho || !komu) return { ...stav, nabidkaObchodu: null }

  const noviHraci = stav.hraci.map((h) => {
    if (h.id === n.odKoho) return { ...h, penize: h.penize - n.nabizenePenize + n.pozadovanePenize }
    if (h.id === n.komu) return { ...h, penize: h.penize - n.pozadovanePenize + n.nabizenePenize }
    return h
  })
  const noveVlastnictvi = { ...stav.vlastnictvi }
  for (const klic of n.nabizenaPole) noveVlastnictvi[klic] = n.komu
  for (const klic of n.pozadovanaPole) noveVlastnictvi[klic] = n.odKoho

  return {
    ...stav,
    hraci: noviHraci,
    vlastnictvi: noveVlastnictvi,
    nabidkaObchodu: null,
    posledniUdalost: `🤝 ${komu.jmeno} přijal(a) obchod s ${odKoho.jmeno}.`,
  }
}

/** Odmítne čekající obchod beze změny majetku. No-op, pokud žádná
 *  neběží. */
export const odmitnoutObchod = (stav: TrhStav): TrhStav => {
  const n = stav.nabidkaObchodu
  if (!n) return stav
  const odKoho = stav.hraci.find((h) => h.id === n.odKoho)
  const komu = stav.hraci.find((h) => h.id === n.komu)
  return {
    ...stav,
    nabidkaObchodu: null,
    posledniUdalost: `🤝 ${komu?.jmeno ?? '?'} odmítl(a) obchod od ${odKoho?.jmeno ?? '?'}.`,
  }
}

/** Zruší vlastní čekající nabídku bez odpovědi druhé strany — appka to
 *  nabízí hlavně navrhovateli, co si to rozmyslel, než stihla
 *  protistrana zareagovat (lidský hráč u sdíleného zařízení; bota
 *  nikdy nenapadne vlastní nabídku rušit, viz ai.ts). No-op, pokud
 *  žádná nabídka neběží. */
export const zrusitObchod = (stav: TrhStav): TrhStav => {
  if (!stav.nabidkaObchodu) return stav
  return { ...stav, nabidkaObchodu: null }
}

/** Pošle protinabídku na místo té čekající — appka prohodí role
 *  (dosavadní příjemce `komu` se stává novým navrhovatelem, původní
 *  navrhovatel `odKoho` novým příjemcem) a validuje nové podmínky z
 *  pohledu NOVÉHO navrhovatele přes `navrhniObchod` samotné — žádná
 *  druhá, nezávislá kopie stejné kontroly. Boti nikdy protinabídku
 *  neposílají (viz ai.ts's `melByBotPrijmoutObchod` — jen přijme, nebo
 *  odmítne), takže řetězec protinabídek vždycky skončí, jakmile
 *  dorazí k botovi.
 *
 *  No-op (beze změny PŮVODNÍ čekající nabídky), pokud žádná neběží
 *  nebo nové podmínky neprojdou validací — appka to pozná přes
 *  referenční rovnost s dočasně vynulovaným vstupem, stejnou, jakou
 *  `navrhniObchod` sám vrací při vlastním no-opu. */
export const navrhniProtinabidku = (
  stav: TrhStav,
  novaNabizenaPenize: number,
  novaNabizenaPole: string[],
  novaPozadovanaPenize: number,
  novaPozadovanaPole: string[]
): TrhStav => {
  const n = stav.nabidkaObchodu
  if (!n || stav.konec) return stav
  const vstup: TrhStav = { ...stav, nabidkaObchodu: null }
  const vysledek = navrhniObchod(
    vstup,
    n.komu,
    n.odKoho,
    novaNabizenaPenize,
    novaNabizenaPole,
    novaPozadovanaPenize,
    novaPozadovanaPole
  )
  if (vysledek === vstup) return stav

  const novyNavrhovatel = stav.hraci.find((h) => h.id === n.komu)
  const novyCil = stav.hraci.find((h) => h.id === n.odKoho)
  return {
    ...vysledek,
    posledniUdalost: `🔁 ${novyNavrhovatel?.jmeno ?? '?'} poslal(a) protinabídku zpátky ${novyCil?.jmeno ?? '?'}.`,
  }
}

// ==========================================
// Fáze 6 — minihry na políčkách. Na rozdíl od sabotáže/obchodu (volba
// aktivního hráče) nebo Osudu/kola štěstí (jediné vytažení) je
// minihra dvoufázová: `krokPohybu` výš jen OTEVŘE `stav.minihra` (viz
// otevriMinihru), teprve funkce níž ji VYŘEŠÍ — jedním voláním u
// rychlé aukce, několika postupnými u pexesa/dražby. Všechny tři
// sdílí stejnou "nedůvěřuj volajícímu" disciplínu jako
// koupitPole/provedSabotaz/navrhniObchod výš.
// ==========================================

/** Otočí jednu kartu pexesa — no-op mimo pexeso, na neplatný/už
 *  otočený/už nalezený index, nebo dokud appka čeká na potvrzení
 *  neshody (viz StavPexesa's vlastní komentář v types.ts). Appka
 *  dvojici vyhodnotí hned, jakmile je otočená druhá karta: shoda obě
 *  označí za nalezené a (pokud to byla poslední dvojice) rovnou
 *  vyplatí odměnu a minihru ukončí; neshoda obě nechá otočené a čeká
 *  na `potvrdNeshoduPexesa`. */
export const otocitKartuPexesa = (stav: TrhStav, index: number): TrhStav => {
  if (stav.minihra?.typ !== 'pexeso' || stav.konec) return stav
  const m = stav.minihra
  if (m.cekaNaPotvrzeni) return stav
  if (index < 0 || index >= m.karty.length) return stav
  if (m.karty[index].nalezena || m.otevrene.includes(index)) return stav

  const noveOtevrene = [...m.otevrene, index]
  if (noveOtevrene.length < 2) {
    return { ...stav, minihra: { ...m, otevrene: noveOtevrene } }
  }

  const [i1, i2] = noveOtevrene
  const shoda = m.karty[i1].symbol === m.karty[i2].symbol
  const pokusy = m.pokusy + 1

  if (!shoda) {
    return { ...stav, minihra: { ...m, otevrene: noveOtevrene, cekaNaPotvrzeni: true, pokusy } }
  }

  const noveKarty = m.karty.map((k, idx) => (idx === i1 || idx === i2 ? { ...k, nalezena: true } : k))
  const vsechnyNalezeny = noveKarty.every((k) => k.nalezena)
  if (!vsechnyNalezeny) {
    return { ...stav, minihra: { ...m, karty: noveKarty, otevrene: [], pokusy } }
  }

  const hrac = aktivniHrac(stav)!
  const odmena = odmenaZaPexeso(pokusy)
  return {
    ...stav,
    hraci: stav.hraci.map((h) => (h.id === hrac.id ? { ...h, penize: h.penize + odmena } : h)),
    minihra: null,
    posledniUdalost: `🧠 ${hrac.jmeno} vyluštil(a) pexeso na ${pokusy}. pokus — +${odmena} kreditů!`,
  }
}

/** Potvrdí, že appka/hráč viděl(a) neshodnou dvojici, a otočí obě
 *  karty zpátky — no-op mimo pexeso nebo dokud appka na potvrzení
 *  zrovna nečeká. */
export const potvrdNeshoduPexesa = (stav: TrhStav): TrhStav => {
  if (stav.minihra?.typ !== 'pexeso' || !stav.minihra.cekaNaPotvrzeni) return stav
  return { ...stav, minihra: { ...stav.minihra, otevrene: [], cekaNaPotvrzeni: false } }
}

/** Vyhodnotí dokončenou dražbu (appka ji volá, jakmile `indexNaTahu`
 *  doběhne na konec `poradiUcastniku`, viz zvysNabidkuDrazby/
 *  odstupOdDrazby níž) — appka vítězi (pokud vůbec někdo přihodil)
 *  strhne `aktualniNabidka` a PŘIPÍŠE `hodnota` předmětu, obojí v
 *  jednom kroku (viz PolozkaDrazby's vlastní komentář proč to appka
 *  nedělá jako dvě oddělené transakce). */
const vyhodnotDrazbu = (stav: TrhStav, m: { polozkaId: string; aktualniNabidka: number; vedeId: string | null }): TrhStav => {
  const polozka = POLOZKY_DRAZBY_PODLE_ID[m.polozkaId]
  if (!polozka) return { ...stav, minihra: null }

  if (!m.vedeId) {
    return { ...stav, minihra: null, posledniUdalost: `🔨 Nikdo nenabídl na ${polozka.nazev} — dražba bez vítěze.` }
  }

  const vitez = stav.hraci.find((h) => h.id === m.vedeId)
  if (!vitez) return { ...stav, minihra: null }

  return {
    ...stav,
    hraci: stav.hraci.map((h) =>
      h.id === vitez.id ? { ...h, penize: h.penize - m.aktualniNabidka + polozka.hodnota } : h
    ),
    minihra: null,
    posledniUdalost: `🔨 ${vitez.jmeno} vydražil(a) ${polozka.nazev} za ${m.aktualniNabidka} kreditů!`,
  }
}

/** Přihodí v probíhající dražbě — no-op mimo dražbu, mimo tah
 *  volajícího hráče, nebo pokud by mu po zaplacení nového přihození
 *  nezbylo dost peněz. Appka jde kolem `poradiUcastniku` přesně
 *  jednou (viz StavDrazby's vlastní komentář v types.ts), takže
 *  `indexNaTahu` roste bez ohledu na výsledek, a jakmile dosáhne
 *  konce pole, appka rovnou zavolá vyhodnotDrazbu. */
export const zvysNabidkuDrazby = (stav: TrhStav, hracId: string): TrhStav => {
  if (stav.minihra?.typ !== 'drazba' || stav.konec) return stav
  const m = stav.minihra
  if (m.indexNaTahu >= m.poradiUcastniku.length || m.poradiUcastniku[m.indexNaTahu] !== hracId) return stav

  const hrac = stav.hraci.find((h) => h.id === hracId)
  const novaNabidka = m.aktualniNabidka + PRIHOZ_DRAZBY
  if (!hrac || hrac.penize < novaNabidka) return stav

  const novyM = { ...m, aktualniNabidka: novaNabidka, vedeId: hracId, indexNaTahu: m.indexNaTahu + 1 }
  if (novyM.indexNaTahu >= novyM.poradiUcastniku.length) return vyhodnotDrazbu(stav, novyM)
  return { ...stav, minihra: novyM, posledniUdalost: `${hrac.jmeno} nabízí ${novaNabidka} kreditů.` }
}

/** Vzdá se v probíhající dražbě (bez přihození) — stejné strážní
 *  podmínky jako zvysNabidkuDrazby, jen beze změny nabídky/vedoucího. */
export const odstupOdDrazby = (stav: TrhStav, hracId: string): TrhStav => {
  if (stav.minihra?.typ !== 'drazba' || stav.konec) return stav
  const m = stav.minihra
  if (m.indexNaTahu >= m.poradiUcastniku.length || m.poradiUcastniku[m.indexNaTahu] !== hracId) return stav

  const hrac = stav.hraci.find((h) => h.id === hracId)
  const novyM = { ...m, indexNaTahu: m.indexNaTahu + 1 }
  if (novyM.indexNaTahu >= novyM.poradiUcastniku.length) return vyhodnotDrazbu(stav, novyM)
  return { ...stav, minihra: novyM, posledniUdalost: `${hrac?.jmeno ?? '?'} se dražby vzdal(a).` }
}

/** Vyhodnotí rychlou aukci s časovačem — appka bere `presnost` (0–100)
 *  jako hotový vstup, sama žádný reálný čas neřeší (viz data/
 *  minihry.ts's vlastní komentář u ODMENY_RYCHLE_AUKCE, proč tahle
 *  funkce zůstává čistě deterministická, i když appka ji v
 *  Deska.tsx volá z reálně odměřeného zásahu). No-op mimo rychlou
 *  aukci. */
export const vyhodnotRychlouAukci = (stav: TrhStav, presnost: number): TrhStav => {
  if (stav.minihra?.typ !== 'rychla-aukce' || stav.konec) return stav
  const hrac = aktivniHrac(stav)
  if (!hrac) return { ...stav, minihra: null }

  const stupen = stupenOdmenyRychleAukce(presnost)
  return {
    ...stav,
    hraci: stupen.odmena !== 0 ? stav.hraci.map((h) => (h.id === hrac.id ? { ...h, penize: h.penize + stupen.odmena } : h)) : stav.hraci,
    minihra: null,
    posledniUdalost:
      stupen.odmena > 0 ? `⚡ ${hrac.jmeno}: ${stupen.text} (+${stupen.odmena} kreditů)` : `⚡ ${hrac.jmeno}: ${stupen.text}`,
  }
}

/** Kolik milisekund zbývá do konce časového limitu — appka to čte
 *  přímo z hodin (Date.now()) při každém překreslení, engine sám
 *  žádný tikající stav neudržuje. */
export const zbyvaCasuMs = (stav: TrhStav, ted: number = Date.now()): number => Math.max(0, stav.konecCasuMs - ted)

/** Zkontroluje časový limit a případně hru ukončí — appka volá
 *  periodicky (setInterval v Deska.tsx), protože na rozdíl od
 *  Souboj's tikajícího combat/engine.ts je tahle hra tahová, ne
 *  kolová, a nemá vlastní smyčku, do které by se dal test na čas
 *  zavěsit. No-op, dokud čas neuplynul nebo hra už neskončila. */
export const zkontrolujCas = (stav: TrhStav, ted: number = Date.now()): TrhStav => {
  if (stav.konec || ted < stav.konecCasuMs) return stav
  return { ...stav, konec: true }
}

/** Hráč(i) s nejvíc penězi po konci hry — pole, ne jeden hráč, protože
 *  remíza je reálná možnost a appka nemá pravidlo, jak ji rozseknout
 *  (žádný tie-breaker nebyl domluvený, takže se zobrazí čestně jako
 *  remíza, ne se náhodně vybere vítěz). */
export const vitezovePodleStavu = (stav: TrhStav): Hrac[] => {
  const nejvic = Math.max(...stav.hraci.map((h) => h.penize))
  return stav.hraci.filter((h) => h.penize === nejvic)
}
