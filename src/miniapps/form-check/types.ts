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
  LEVY_LOKET: 13,
  PRAVY_LOKET: 14,
  LEVE_ZAPESTI: 15,
  PRAVE_ZAPESTI: 16,
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

/** Druhy cvičení, co Form Check umí kamerou sledovat a počítat opakování
 *  sám — dřep (úhel v koleně) byl jediný od začátku, klik (úhel v lokti)
 *  je druhý, přidaný stejnou geometrií (poseMath.ts), jen jiným trojicí
 *  bodů a jinými prahy. */
export type TypCviku = 'dřep' | 'klik'

export const NAZEV_CVIKU: Record<TypCviku, string> = {
  dřep: 'Dřep',
  klik: 'Klik',
}

/** Subjektivní náročnost sezení — čistě pro deník uživatele, appka s tím
 *  nijak nepočítá (na rozdíl od odhadu kalorií to není měřená hodnota). */
export type Narocnost = 'lehka' | 'stredni' | 'tezka'

export const NAROCNOST_LABEL: Record<Narocnost, string> = {
  lehka: 'Lehké',
  stredni: 'Střední',
  tezka: 'Těžké',
}

/** Jedno dokončené cvičební sezení, jak se ukládá do historie.
 *  `poznamka`/`narocnost` jsou nepovinné a přidávají se až po skončení
 *  sezení (viz nastavPoznamkuSezeni v useFormCheck.ts) — starší uložená
 *  sezení je prostě nemají, což je v pořádku, appka je nikdy nevynucovala. */
export interface Sezeni {
  id: string
  cvik: TypCviku
  pocetOpakovani: number
  trvaniSekund: number
  createdAt: string
  poznamka?: string
  narocnost?: Narocnost | null
}

// Hrubý odhad energetického výdeje na jedno opakování, podle cviku —
// běžně citované hodnoty se pohybují kolem 0,3–0,5 kcal/opakování pro
// průměrnou dospělou osobu u cviků s vlastní vahou. Appka to ukazuje
// jako "odhad", ne jako přesné měření (na to by potřebovala váhu/tep
// uživatele, což nemá). Žije tady, ne ve fitnessStats.ts, protože jde
// o vlastnost samotného cviku (Form Checkova doména), ne o prezentaci
// Fitness Roomova dashboardu — fitnessStats.ts si ji odsud importuje.
// Dřepova hodnota zůstává 0,32 beze změny od dob, kdy appka uměla jen
// dřep — měnit ji teď, když existuje druhý cvik, by potichu přepsalo
// dřívější zobrazená čísla stávajícím uživatelům.
export const KCAL_ZA_OPAKOVANI: Record<TypCviku, number> = {
  dřep: 0.32,
  klik: 0.29,
}

// ==========================================
// Export do CSV — stejná česká Excel konvence (středník, BOM) jako
// Financeova sestavCsvTransakci, samostatná kopie csvEscape místo
// importu odtamtud — nezávislé miniapky, stejná přijatá duplikace jako
// BARVY_UZLU jinde v appce.
// ==========================================

const csvEscape = (hodnota: string): string => {
  if (/[";\n]/.test(hodnota)) return `"${hodnota.replace(/"/g, '""')}"`
  return hodnota
}

export const sestavCsvSezeni = (sezeni: Sezeni[]): string => {
  const hlavicka = ['Datum', 'Cvik', 'Opakování', 'Délka (s)', 'Odhad kcal', 'Náročnost', 'Poznámka'].join(';')
  const radky = sezeni.map((s) =>
    [
      new Date(s.createdAt).toLocaleString('cs-CZ'),
      NAZEV_CVIKU[s.cvik],
      String(s.pocetOpakovani),
      String(s.trvaniSekund),
      String(Math.round(s.pocetOpakovani * KCAL_ZA_OPAKOVANI[s.cvik])),
      s.narocnost ? NAROCNOST_LABEL[s.narocnost] : '',
      csvEscape(s.poznamka ?? ''),
    ].join(';')
  )
  // BOM na začátku, ať Excel český text (diakritiku) rozpozná jako
  // UTF-8 a nezobrazí ho jako změť — bez něj Excel často naslepo
  // předpokládá Windows-1250.
  return `﻿${[hlavicka, ...radky].join('\r\n')}`
}
