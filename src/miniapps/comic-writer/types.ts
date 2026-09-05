// ==========================================
// Komiks — appka Writer's Roomu na psaní komiksových scénářů:
// strana → panel → řádky (dialog nebo popisek), stejná struktura,
// jakou komiksoví scénáristé profesionálně používají.
// ==========================================

export type TypRadku = 'dialog' | 'popisek'

export interface PanelRadek {
  id: string
  typ: TypRadku
  // Jméno postavy — jen u dialogu, u popisku se nepoužívá.
  postava: string
  text: string
}

export interface Panel {
  id: string
  vizual: string
  radky: PanelRadek[]
}

export interface Strana {
  id: string
  cislo: number
  panely: Panel[]
}

export interface Komiks {
  id: string
  nazev: string
  strany: Strana[]
  createdAt: string
}

export const celkovyPocetPanelu = (komiks: Komiks): number =>
  komiks.strany.reduce((soucet, s) => soucet + s.panely.length, 0)
