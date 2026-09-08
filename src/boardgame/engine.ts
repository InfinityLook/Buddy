import type { FazeTahu, Hrac, LimitMinut, Pole2D, Smer, TrhStav } from './types'
import type { PostavaId } from './postavy'
import { najdiObchodNaPoli, OBCHODY_PODLE_KLICE } from './obchody'

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
  posledniUdalost: null,
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

/** Které směry z aktuální pozice hráče doopravdy vedou na mřížku —
 *  sdílené s ai.ts, ať bot nikdy nezkusí krok mimo hranici. */
export const platneSmery = (pozice: Pole2D, stav: TrhStav): Smer[] =>
  (['nahoru', 'dolu', 'vlevo', 'vpravo'] as Smer[]).filter((s) => vHranicich(posunPole(pozice, s), stav))

/** Hodí kostkou (1–6) a otevře fázi pohybu s tolika kroky. No-op mimo
 *  fázi 'hod' — appka i síťová vrstva klidně zavolá tuhle funkci
 *  víckrát, aniž by musela sama hlídat, jestli už se hodilo. */
export const krokHodu = (stav: TrhStav, nahodne: () => number = Math.random): TrhStav => {
  if (stav.faze !== 'hod' || stav.konec) return stav
  const hod = Math.floor(nahodne() * 6) + 1
  return { ...stav, faze: 'pohyb', zbyvaKroku: hod, posledniHod: hod }
}

/** Posune aktivního hráče o jedno pole daným směrem. Krok mimo mřížku
 *  je tiše zahozen (nespotřebuje krok) — hráč prostě nemůže tím
 *  směrem, ne že by přišel o pohyb navíc za to, že to zkusil. Fáze
 *  přejde na 'konec-tahu', jakmile dojdou kroky — a jen tehdy, na
 *  úplně poslední doběhnuté políčko, se řeší ekonomika (nájem/nabídka
 *  koupě), stejně jako v Monopoly rozhoduje jen políčko, na kterém
 *  hráč doopravdy skončí, ne ta, přes která jen prošel. */
export const krokPohybu = (stav: TrhStav, smer: Smer): TrhStav => {
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
        posledniUdalost = `${hrac.jmeno} zaplatil ${castka} Kč hráči ${vlastnik?.jmeno ?? '?'} za ${obchod.nazev}.`
      }
    }
  }

  return {
    ...stav,
    hraci: noviHraci,
    zbyvaKroku: zbyva,
    faze: doslo ? ('konec-tahu' as FazeTahu) : ('pohyb' as FazeTahu),
    nabidkaKoupe,
    posledniUdalost,
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
    posledniUdalost: `${hrac.jmeno} koupil ${obchod.nazev} za ${obchod.cena} Kč.`,
  }
}

/** Odmítne nabídku koupě — obchod zůstává bance, tah může pokračovat
 *  ke konci. */
export const odmitnoutKoupi = (stav: TrhStav): TrhStav => {
  if (!stav.nabidkaKoupe) return stav
  return { ...stav, nabidkaKoupe: null }
}

/** Ukončí tah dřív, i když ještě zbývají kroky — hráč nemusí kroky
 *  dovyčerpat, jen je ztratí. Dovoleno z fáze 'pohyb' i 'konec-tahu',
 *  ale ne dokud čeká nerozhodnutá nabídka koupě — appka by jinak
 *  mohla tiše přeskočit rozhodnutí, na které hráč ani nesáhl. */
export const ukonciTah = (stav: TrhStav): TrhStav => {
  if (stav.faze === 'hod' || stav.konec || stav.nabidkaKoupe) return stav
  const dalsiIndex = (stav.aktivniIndex + 1) % stav.poradiHracu.length
  return {
    ...stav,
    aktivniIndex: dalsiIndex,
    faze: 'hod',
    zbyvaKroku: 0,
    posledniHod: null,
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
