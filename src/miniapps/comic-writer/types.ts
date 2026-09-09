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
  // Kdy panel vznikl — potřeba jen pro "dnes napsáno" statistiku ve
  // Writer's Roomu (spocitejDnesniTvorbu), Strana/Kniha/Scenar svoje
  // createdAt už měly odjakživa, Panel ne.
  createdAt: string
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
  // Stejný důvod jako u Kniha.upravenoAt/Scenar.upravenoAt — kdy se na
  // komiksu naposledy doopravdy pracovalo, ne kdy byl založen.
  upravenoAt: string
}

export const celkovyPocetPanelu = (komiks: Komiks): number =>
  komiks.strany.reduce((soucet, s) => soucet + s.panely.length, 0)

// Stejná "podle poslední úpravy" logika jako u Knihy/Scénáře.
export const serazenoPodleUpravy = <T extends { upravenoAt: string }>(polozky: T[]): T[] =>
  [...polozky].sort((a, b) => b.upravenoAt.localeCompare(a.upravenoAt))

// Poskládá celý komiks do jednoho čitelného scénáristického textu pro
// export — strana → panel → řádky, stejná hierarchie, jakou appka
// sama používá.
export const sestavTextKomiksu = (komiks: Komiks): string =>
  [
    komiks.nazev.toUpperCase(),
    '',
    ...komiks.strany.map((s) =>
      [
        `STRANA ${s.cislo}`,
        '',
        ...(s.panely.length > 0
          ? s.panely.map((p, i) => {
              const radky = p.radky.map((r) =>
                r.typ === 'dialog' ? `${(r.postava || 'POSTAVA').toUpperCase()}: ${r.text}` : `(${r.text})`
              )
              return [`Panel ${i + 1}: ${p.vizual}`, ...radky].join('\n')
            })
          : ['(strana zatím nemá žádný panel)']),
      ].join('\n\n')
    ),
  ].join('\n\n')
