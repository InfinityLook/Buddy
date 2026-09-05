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
}

// Skládá skutečný scénáristický nadpis scény z jejích tří polí — appka
// je nikdy neukládá jako jeden řetězec, ať se dá místo/čas upravit
// samostatně beze změny formátu.
export const nadpisSceny = (s: Scena, poradi: number): string =>
  `${poradi}. ${s.typMista}. ${s.misto.toUpperCase()} – ${s.cas.toUpperCase()}`
