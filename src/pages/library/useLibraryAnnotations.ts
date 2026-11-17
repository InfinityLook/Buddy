import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import {
  MAX_ANOTACI_NA_DILO,
  MAX_EXCERPT,
  MAX_POZNAMKA,
  validateLibraryAnnotationsData,
  type AnotaceZaznam,
  type BarvaAnotace,
  type DruhAnotace,
} from '@/core/utils/libraryAnnotationsValidation'
import { vytvorIdAnotace } from './libraryAnnotations'

// ==========================================
// Záložky, zvýraznění a poznámky čtenáře. Záznam je měkce smazatelný
// (deletedAt), ať jde smazání synchronizovat mezi zařízeními (viz
// librarySync.ts). Zdrojem pravdy je tenhle lokální store; cloud je zrcadlo.
// ==========================================

export interface NovaAnotace {
  workId: string
  versionId: string | null
  kind: DruhAnotace
  chapterPos: number
  blockIdx: number
  charStart?: number
  charEnd?: number
  excerpt?: string
  note?: string | null
  color?: BarvaAnotace | null
}

export type ZmenaAnotace = Partial<Pick<AnotaceZaznam, 'note' | 'color'>>

interface AnotaceState {
  anotace: AnotaceZaznam[]
  /** Přidá záznam; vrací jeho id, nebo null, když je dílo na limitu. */
  pridej: (vstup: NovaAnotace) => string | null
  /** Změní barvu/poznámku zvýraznění. Poznámka zvýraznění ↔ poznámka mění druh. */
  uprav: (id: string, zmena: ZmenaAnotace) => void
  smaz: (id: string) => void
}

export const zivePodleDila = (anotace: readonly AnotaceZaznam[], workId: string): AnotaceZaznam[] =>
  anotace.filter((a) => a.workId === workId && !a.deletedAt)

export const useLibraryAnnotations = create<AnotaceState>()(
  persist(
    (set, get) => ({
      anotace: [],
      pridej: (v) => {
        if (zivePodleDila(get().anotace, v.workId).length >= MAX_ANOTACI_NA_DILO) return null
        const ted = Date.now()
        const jeZalozka = v.kind === 'zalozka'
        const poznamka = !jeZalozka && v.note && v.note.trim() ? v.note.slice(0, MAX_POZNAMKA) : null
        const zaznam: AnotaceZaznam = {
          id: vytvorIdAnotace(),
          workId: v.workId,
          versionId: v.versionId,
          kind: poznamka ? 'poznamka' : v.kind === 'poznamka' ? 'zvyrazneni' : v.kind,
          chapterPos: v.chapterPos,
          blockIdx: v.blockIdx,
          charStart: jeZalozka ? 0 : (v.charStart ?? 0),
          charEnd: jeZalozka ? 0 : (v.charEnd ?? 0),
          excerpt: (v.excerpt ?? '').slice(0, MAX_EXCERPT),
          note: poznamka,
          color: jeZalozka ? null : (v.color ?? 'zluta'),
          createdAt: ted,
          updatedAt: ted,
          deletedAt: null,
        }
        set({ anotace: [zaznam, ...get().anotace] })
        return zaznam.id
      },
      uprav: (id, zmena) => {
        const ted = Date.now()
        set({
          anotace: get().anotace.map((a) => {
            if (a.id !== id || a.deletedAt || a.kind === 'zalozka') return a
            const note = 'note' in zmena ? (zmena.note && zmena.note.trim() ? zmena.note.slice(0, MAX_POZNAMKA) : null) : a.note
            return {
              ...a,
              note,
              kind: note ? 'poznamka' : 'zvyrazneni',
              color: zmena.color ?? a.color,
              updatedAt: ted,
            }
          }),
        })
      },
      smaz: (id) => {
        const ted = Date.now()
        // Tombstone nenese soukromý text — v cloudu zůstane jen informace o smazání.
        set({
          anotace: get().anotace.map((a) =>
            a.id === id && !a.deletedAt ? { ...a, deletedAt: ted, updatedAt: ted, excerpt: '', note: null } : a,
          ),
        })
      },
    }),
    {
      name: 'schoolbuddy-library-anotace-storage',
      storage: createJSONStorage(() => secureStorage),
      merge: (persisted, current) => ({ ...current, ...validateLibraryAnnotationsData(persisted) }),
    },
  ),
)

/** Surový stav pro synchronizaci (včetně tombstonů). */
export const getRawLibraryAnotace = () => useLibraryAnnotations.getState()
export const setRawLibraryAnotace = (anotace: AnotaceZaznam[]) => useLibraryAnnotations.setState({ anotace })
export const subscribeLibraryAnotace = (posluchac: () => void) => useLibraryAnnotations.subscribe(posluchac)
