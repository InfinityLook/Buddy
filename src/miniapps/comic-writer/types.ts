// ==========================================
// Komiks — appka Writer's Roomu na psaní komiksových scénářů:
// strana → panel → řádky (dialog nebo popisek), stejná struktura,
// jakou komiksoví scénáristé profesionálně používají.
// ==========================================

import { StavPolozky } from '@/flagships/writer-room/writerRoomStav'

export type TypRadku = 'dialog' | 'popisek'

export interface PanelRadek {
  id: string
  typ: TypRadku
  // Jméno postavy — jen u dialogu, u popisku se nepoužívá.
  postava: string
  text: string
}

// Typ záběru panelu — běžná součást profesionálního komiksového
// scénáře (spolu s vizuálním popisem panel obvykle nese i informaci,
// jak "blízko" se má kreslíř na scénu podívat). Pevná, malá sada — ne
// libovolný vstup, stejná zásada jako u appce fixních barevných palet
// jinde (BARVY_DNE/IKONY_SKUPIN). null = typ záběru nezadán, což je i
// výchozí stav každého nového panelu.
export type TypZaberu = 'detail' | 'polocelek' | 'celek' | 'celkovy'

export const TYPY_ZABERU: { id: TypZaberu; label: string }[] = [
  { id: 'detail', label: 'Detail' },
  { id: 'polocelek', label: 'Polocelek' },
  { id: 'celek', label: 'Celek' },
  { id: 'celkovy', label: 'Celkový záběr' },
]

export const oznaceniZaberu = (zaber: TypZaberu | null): string | null =>
  zaber ? (TYPY_ZABERU.find((z) => z.id === zaber)?.label ?? null) : null

export interface Panel {
  id: string
  vizual: string
  radky: PanelRadek[]
  // Kdy panel vznikl — potřeba jen pro "dnes napsáno" statistiku ve
  // Writer's Roomu (spocitejDnesniTvorbu), Strana/Kniha/Scenar svoje
  // createdAt už měly odjakživa, Panel ne.
  createdAt: string
  // Nepovinný typ záběru (viz TypZaberu výš) — null = zatím nezadán.
  // Nepovinné pole, starší uložený panel ho nemá vůbec, fallback na
  // null (viz comicWriterValidation.ts).
  zaber: TypZaberu | null
}

export interface Strana {
  id: string
  cislo: number
  panely: Panel[]
  // Stejný ruční štítek postupu jako Kapitola.stav v Knize/Scena.stav
  // ve Scénáři — cyklovaný jedním klepnutím.
  stav: StavPolozky
  // Stejná role jako Kapitola.poznamka/Scena.poznamka — autorova
  // soukromá poznámka, do exportu/Náhledu se nepromítá.
  poznamka: string
  // Stejná role jako Kapitola.stitky v Knize/Scena.stitky ve Scénáři —
  // volné, autorem psané štítky. Nepovinné pole, fallback na prázdný
  // řetězec (viz comicWriterValidation.ts).
  stitky: string
}

export interface Komiks {
  id: string
  nazev: string
  strany: Strana[]
  createdAt: string
  // Stejný důvod jako u Kniha.upravenoAt/Scenar.upravenoAt — kdy se na
  // komiksu naposledy doopravdy pracovalo, ne kdy byl založen.
  upravenoAt: string
  // Stejná role jako Kniha.cilSlov/Scenar.cilScen, jen v počtu stran —
  // null = žádný cíl nenastaven.
  cilStran: number | null
  // "Bible postav" — stejná role a stejné klíčování jménem jako
  // Scenar.postavyPoznamky vedle. Nepovinné pole, fallback na prázdný
  // objekt (viz comicWriterValidation.ts).
  postavyPoznamky: Record<string, string>
}

export const celkovyPocetPanelu = (komiks: Komiks): number =>
  komiks.strany.reduce((soucet, s) => soucet + s.panely.length, 0)

// Stejná "podle poslední úpravy" logika jako u Knihy/Scénáře.
export const serazenoPodleUpravy = <T extends { upravenoAt: string }>(polozky: T[]): T[] =>
  [...polozky].sort((a, b) => b.upravenoAt.localeCompare(a.upravenoAt))

// Stejná role jako Scenar.ziskejPostavy — jména postav skutečně
// použitá v dialogu napříč celým komiksem, bez duplicit a abecedně,
// pro nabídku už-použitých jmen při psaní řádku.
export const ziskejPostavy = (komiks: Komiks): string[] => {
  const jmena = new Set<string>()
  komiks.strany.forEach((s) =>
    s.panely.forEach((p) =>
      p.radky.forEach((r) => {
        if (r.typ === 'dialog' && r.postava.trim()) jmena.add(r.postava.trim())
      })
    )
  )
  return [...jmena].sort((a, b) => a.localeCompare(b, 'cs'))
}

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
              const zaberText = oznaceniZaberu(p.zaber)
              const hlavicka = zaberText ? `Panel ${i + 1} (${zaberText}): ${p.vizual}` : `Panel ${i + 1}: ${p.vizual}`
              return [hlavicka, ...radky].join('\n')
            })
          : ['(strana zatím nemá žádný panel)']),
      ].join('\n\n')
    ),
  ].join('\n\n')
