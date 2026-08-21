export interface Predmet {
  id: string
  nazev: string
  popis: string
  ikona: string
  /** Základní cena v kreditech — skutečná cena se ještě násobí
   *  postaviným obchodNasobicCeny (viz postavy.ts, zatím jen Angel). */
  cena: number
  /** Krátký popisek efektu pro kartu, např. "+15 výdrže". */
  efekt: string
}
