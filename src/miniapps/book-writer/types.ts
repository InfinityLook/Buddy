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
}

// Prostý rozdělovač podle bílých znaků — appka nepotřebuje přesné
// typografické počítadlo, jen orientační číslo pro cíl a přehled.
export const pocetSlov = (text: string): number => {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export const celkovyPocetSlov = (kniha: Kniha): number =>
  kniha.kapitoly.reduce((soucet, k) => soucet + pocetSlov(k.text), 0)
