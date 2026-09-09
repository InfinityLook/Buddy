// ==========================================
// Kniha — appka Writer's Roomu na psaní knih po kapitolách.
// ==========================================

export interface Kapitola {
  id: string
  nazev: string
  text: string
  createdAt: string
}

export interface Kniha {
  id: string
  nazev: string
  // null = žádný cíl nenastaven, appka jen počítá, kolik slov už je hotovo.
  cilSlov: number | null
  kapitoly: Kapitola[]
  createdAt: string
  // Kdy byla kniha naposledy skutečně upravena (nová/upravená/smazaná
  // kapitola, změna cíle) — ne kdy byla založena. Bez tohohle dashboard
  // Writer's Roomu i seznam knih ukazovaly vždycky nejnověji ZALOŽENOU
  // knihu, ne tu, na které se doopravdy pracuje.
  upravenoAt: string
}

// Prostý rozdělovač podle bílých znaků — appka nepotřebuje přesné
// typografické počítadlo, jen orientační číslo pro cíl a přehled.
export const pocetSlov = (text: string): number => {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export const celkovyPocetSlov = (kniha: Kniha): number =>
  kniha.kapitoly.reduce((soucet, k) => soucet + pocetSlov(k.text), 0)

// Seřadí knihy podle poslední úpravy, ne podle pořadí v poli (to je
// pořadí založení) — použito jak seznamem knih v appce samotné, tak
// Writer's Roomovým náhledem, ať obojí ukazuje totéž.
export const serazenoPodleUpravy = <T extends { upravenoAt: string }>(polozky: T[]): T[] =>
  [...polozky].sort((a, b) => b.upravenoAt.localeCompare(a.upravenoAt))

// Poskládá celou knihu do jednoho čitelného textu pro export — nadpisy
// kapitol jako řádky navíc, jinak čistý text tak, jak ho autor napsal.
export const sestavTextKnihy = (kniha: Kniha): string =>
  [
    kniha.nazev.toUpperCase(),
    '',
    ...kniha.kapitoly.map((k, i) => `${i + 1}. ${k.nazev}\n\n${k.text.trim() || '(prázdná kapitola)'}`),
  ].join('\n\n')
