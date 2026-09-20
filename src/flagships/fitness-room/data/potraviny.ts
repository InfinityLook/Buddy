export interface Potravina {
  id: string
  nazev: string
  kcal: number
}

// ==========================================
// Pevná sada běžných potravin s odhadovanou hodnotou kcal na obvyklou
// porci — appka nemá žádnou databázi výživových hodnot ani skener
// čárových kódů, jde jen o rychlou volbu pro časté položky. Vlastní
// název + kalorie jde do jídelníčku zapsat i ručně (viz
// useJidelnicek.ts's pridatJidlo) — tahle sada je zkratka, ne jediná
// možnost, stejná "pevná sada, ne libovolný vstup, ale ruční vstup
// zůstává vždycky otevřený" zásada jako appčiny ostatní katalogy.
// ==========================================
export const POTRAVINY: Potravina[] = [
  { id: 'banan', nazev: 'Banán', kcal: 105 },
  { id: 'vejce', nazev: 'Vejce', kcal: 78 },
  { id: 'kureci-prsa', nazev: 'Kuřecí prsa (150 g)', kcal: 250 },
  { id: 'ryze', nazev: 'Rýže vařená (100 g)', kcal: 130 },
  { id: 'chleba', nazev: 'Chléb (1 krajíc)', kcal: 80 },
  { id: 'jogurt', nazev: 'Bílý jogurt', kcal: 120 },
  { id: 'ovesna-kase', nazev: 'Ovesná kaše', kcal: 150 },
  { id: 'losos', nazev: 'Losos (150 g)', kcal: 280 },
  { id: 'brokolice', nazev: 'Brokolice (100 g)', kcal: 35 },
  { id: 'orechy', nazev: 'Ořechy (30 g)', kcal: 180 },
  { id: 'jablko', nazev: 'Jablko', kcal: 95 },
  { id: 'tvaroh', nazev: 'Tvaroh (100 g)', kcal: 98 },
  { id: 'protein', nazev: 'Proteinový nápoj', kcal: 120 },
  { id: 'syr', nazev: 'Sýr (30 g)', kcal: 110 },
  { id: 'testoviny', nazev: 'Těstoviny vařené (100 g)', kcal: 160 },
]
