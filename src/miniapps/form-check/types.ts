// ==========================================
// Tvary dat Form Checku.
//
// Landmarky (33 bodů kostry) přicházejí z MediaPipe Pose Landmarker
// v normalizovaných souřadnicích [0,1] vzhledem k rámu videa — (0,0) je
// levý horní roh, y roste dolů (obrazový prostor, ne matematický).
// ==========================================

export interface Bod {
  x: number
  y: number
  z: number
  visibility?: number
}

/** Index bodu ve 33bodovém modelu MediaPipe Pose. Číslování dává model,
 *  ne my — proto konstanty místo magických čísel v matematice níž. */
export const LM = {
  LEVE_RAMENO: 11,
  PRAVE_RAMENO: 12,
  LEVY_BOK: 23,
  PRAVY_BOK: 24,
  LEVE_KOLENO: 25,
  PRAVE_KOLENO: 26,
  LEVY_KOTNIK: 27,
  PRAVY_KOTNIK: 28,
} as const

export type Strana = 'levá' | 'pravá'

export type FazePohybu = 'nahore' | 'dole'

export interface StavOpakovani {
  faze: FazePohybu
  pocet: number
}

export type StavKamery = 'vypnuto' | 'nacita-se' | 'bezi' | 'chyba'

export type Zpetnavazba = 'v-poradku' | 'narovnej-zada' | null

/** Jedno dokončené cvičební sezení, jak se ukládá do historie. */
export interface Sezeni {
  id: string
  cvik: 'dřep'
  pocetOpakovani: number
  trvaniSekund: number
  createdAt: string
}
