// ==========================================
// Buddyho Trh — sdílené typy. Stejné rozdělení jako u Souboje
// (src/fighting/): tenhle soubor jen popisuje tvar dat, žádná logika.
// ==========================================

import type { PostavaId } from './postavy'

/** Souřadnice na otevřené mřížce (celá čísla, ne skutečná 3D pozice —
 *  tu si dopočítá až vykreslovací vrstva ze sirkaMrizky/vyskaMrizky). */
export interface Pole2D {
  x: number
  z: number
}

export interface Hrac {
  id: string
  jmeno: string
  postavaId: PostavaId
  pozice: Pole2D
  penize: number
  jeBot: boolean
}

export type Smer = 'nahoru' | 'dolu' | 'vlevo' | 'vpravo'

/** Fáze jednoho tahu — Fáze 0 má jen hod kostkou a pohyb, žádnou
 *  ekonomiku (nákup/poplatky přijdou ve Fázi 1). */
export type FazeTahu = 'hod' | 'pohyb' | 'konec-tahu'

export interface TrhStav {
  hraci: Hrac[]
  /** Pořadí tahů jako pole id hráčů — samostatně od `hraci`, protože
   *  pořadí se v pozdější fázi (karty typu "přeskoč tah") může měnit
   *  nezávisle na tom, kdo ve hře vůbec je. */
  poradiHracu: string[]
  aktivniIndex: number
  faze: FazeTahu
  /** Kolik políček zbývá tenhle tah urazit — dopočítá se z hodu
   *  kostkou a ubývá s každým platným krokem. */
  zbyvaKroku: number
  posledniHod: number | null
  sirkaMrizky: number
  vyskaMrizky: number
  konec: boolean
}
