// Sjednocení textu pro vyhledávání: malá písmena a pryč s diakritikou.
// Student napíše "cestina" nebo "maturitni" a nemá důvod dostat prázdný
// výsledek jen kvůli chybějící čárce nebo háčku.
//
// NFD rozloží písmeno na základ a spojovací znaménko ("č" na "c" + háček),
// druhý krok pak zahodí celý blok spojovacích znamének U+0300 az U+036F.
export const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

// Skloňování počtu úkolů podle českých pravidel: 1 úkol / 2–4 úkoly / 5+ úkolů.
export const sklonujUkoly = (pocet: number): string => {
  if (pocet === 1) return 'úkol'
  if (pocet >= 2 && pocet <= 4) return 'úkoly'
  return 'úkolů'
}

// Sloveso ke stejnému počtu: "zbývá 1 úkol", ale "zbývají 2 úkoly".
export const zbyvaSloveso = (pocet: number): string =>
  pocet >= 2 && pocet <= 4 ? 'Zbývají' : 'Zbývá'
