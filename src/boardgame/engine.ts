import type { FazeTahu, Hrac, Pole2D, Smer, TrhStav } from './types'
import type { PostavaId } from './postavy'

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

export const vytvorTrhStav = (hraci: Hrac[]): TrhStav => ({
  hraci,
  poradiHracu: hraci.map((h) => h.id),
  aktivniIndex: 0,
  faze: 'hod',
  zbyvaKroku: 0,
  posledniHod: null,
  sirkaMrizky: SIRKA_MRIZKY,
  vyskaMrizky: VYSKA_MRIZKY,
  konec: false,
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
 *  přejde na 'konec-tahu', jakmile dojdou kroky. */
export const krokPohybu = (stav: TrhStav, smer: Smer): TrhStav => {
  if (stav.faze !== 'pohyb' || stav.zbyvaKroku <= 0 || stav.konec) return stav
  const hrac = aktivniHrac(stav)
  if (!hrac) return stav

  const novaPozice = posunPole(hrac.pozice, smer)
  if (!vHranicich(novaPozice, stav)) return stav

  const noviHraci = stav.hraci.map((h) => (h.id === hrac.id ? { ...h, pozice: novaPozice } : h))
  const zbyva = stav.zbyvaKroku - 1

  return {
    ...stav,
    hraci: noviHraci,
    zbyvaKroku: zbyva,
    faze: zbyva <= 0 ? ('konec-tahu' as FazeTahu) : ('pohyb' as FazeTahu),
  }
}

/** Ukončí tah dřív, i když ještě zbývají kroky — hráč nemusí kroky
 *  dovyčerpat, jen je ztratí. Dovoleno z fáze 'pohyb' i 'konec-tahu'. */
export const ukonciTah = (stav: TrhStav): TrhStav => {
  if (stav.faze === 'hod' || stav.konec) return stav
  const dalsiIndex = (stav.aktivniIndex + 1) % stav.poradiHracu.length
  return {
    ...stav,
    aktivniIndex: dalsiIndex,
    faze: 'hod',
    zbyvaKroku: 0,
    posledniHod: null,
  }
}
