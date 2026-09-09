// ==========================================
// Scénář — appka Writer's Roomu na psaní scénářů ve skutečném
// scénáristickém formátu: scéna má nadpis (INT/EXT. MÍSTO – ČAS)
// a sled prvků (akce, nebo postava+dialog).
// ==========================================

export type TypMista = 'INT' | 'EXT' | 'INT/EXT'
export const TYPY_MIST: TypMista[] = ['INT', 'EXT', 'INT/EXT']

export interface AkcePrvek {
  id: string
  typ: 'akce'
  text: string
}

export interface DialogPrvek {
  id: string
  typ: 'dialog'
  postava: string
  text: string
  // Nepovinná herecká poznámka v závorce, např. "(bez otáčení)".
  poznamka: string
}

export type ScenaPrvek = AkcePrvek | DialogPrvek

export interface Scena {
  id: string
  typMista: TypMista
  misto: string
  cas: string
  prvky: ScenaPrvek[]
  createdAt: string
}

export interface Scenar {
  id: string
  nazev: string
  sceny: Scena[]
  createdAt: string
  // Stejný důvod jako u Kniha.upravenoAt — kdy se na scénáři naposledy
  // doopravdy psalo, ne kdy byl založen.
  upravenoAt: string
  // Stejná role jako Kniha.cilSlov, jen v počtu scén — null = žádný cíl
  // nenastaven.
  cilScen: number | null
}

// Skládá skutečný scénáristický nadpis scény z jejích tří polí — appka
// je nikdy neukládá jako jeden řetězec, ať se dá místo/čas upravit
// samostatně beze změny formátu.
export const nadpisSceny = (s: Scena, poradi: number): string =>
  `${poradi}. ${s.typMista}. ${s.misto.toUpperCase()} – ${s.cas.toUpperCase()}`

// Stejná "podle poslední úpravy, ne podle založení" logika jako u Knihy.
export const serazenoPodleUpravy = <T extends { upravenoAt: string }>(polozky: T[]): T[] =>
  [...polozky].sort((a, b) => b.upravenoAt.localeCompare(a.upravenoAt))

// Poskládá celý scénář do jednoho čitelného scénáristického textu pro
// export — stejný formát, jaký appka sama vykresluje v editoru
// (nadpis scény, akce prostým textem, dialog s postavou velkými
// písmeny a nepovinnou herecká poznámkou v závorce).
export const sestavTextScenare = (scenar: Scenar): string =>
  [
    scenar.nazev.toUpperCase(),
    '',
    ...scenar.sceny.map((s, i) => {
      const radky = s.prvky.map((p) =>
        p.typ === 'akce'
          ? p.text
          : `${p.postava.toUpperCase()}${p.poznamka ? ` (${p.poznamka})` : ''}\n${p.text}`
      )
      return [nadpisSceny(s, i + 1), '', ...(radky.length > 0 ? radky : ['(scéna zatím nemá žádný text)'])].join('\n\n')
    }),
  ].join('\n\n')
