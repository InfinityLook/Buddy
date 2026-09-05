import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateScreenplayWriterData } from '@/core/utils/screenplayWriterValidation'
import { AkcePrvek, DialogPrvek, Scenar, TypMista } from './types'

const SCREENPLAY_XP = 6

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface ScreenplayWriterState {
  scenare: Scenar[]
  addScenar: (nazev: string) => string
  deleteScenar: (id: string) => void
  addScena: (scenarId: string, data: { typMista: TypMista; misto: string; cas: string }) => void
  deleteScena: (scenarId: string, scenaId: string) => void
  addAkce: (scenarId: string, scenaId: string, text: string) => void
  addDialog: (scenarId: string, scenaId: string, data: { postava: string; text: string; poznamka?: string }) => void
  deletePrvek: (scenarId: string, scenaId: string, prvekId: string) => void
}

const useScreenplayWriterStore = create<ScreenplayWriterState>()(
  persist(
    (set) => ({
      scenare: [],

      addScenar: (nazev) => {
        const id = noveId()
        const novy: Scenar = { id, nazev: nazev.trim() || 'Nový scénář', sceny: [], createdAt: new Date().toISOString() }
        set((state) => ({ scenare: [novy, ...state.scenare] }))
        return id
      },

      deleteScenar: (id) => set((state) => ({ scenare: state.scenare.filter((s) => s.id !== id) })),

      // Odměna se dává za dokončenou scénu, ne za jednotlivou repliku —
      // scéna je tu ta smysluplná jednotka tvorby, stejně jako kapitola
      // u Knihy.
      addScena: (scenarId, data) => {
        const nova = { id: noveId(), ...data, prvky: [], createdAt: new Date().toISOString() }
        set((state) => ({
          scenare: state.scenare.map((s) => (s.id === scenarId ? { ...s, sceny: [...s.sceny, nova] } : s)),
        }))
        useGamificationStore.getState().recordAction('screenplay', SCREENPLAY_XP)
      },

      deleteScena: (scenarId, scenaId) =>
        set((state) => ({
          scenare: state.scenare.map((s) =>
            s.id !== scenarId ? s : { ...s, sceny: s.sceny.filter((sc) => sc.id !== scenaId) }
          ),
        })),

      addAkce: (scenarId, scenaId, text) => {
        const prvek: AkcePrvek = { id: noveId(), typ: 'akce', text }
        set((state) => ({
          scenare: state.scenare.map((s) =>
            s.id !== scenarId
              ? s
              : { ...s, sceny: s.sceny.map((sc) => (sc.id === scenaId ? { ...sc, prvky: [...sc.prvky, prvek] } : sc)) }
          ),
        }))
      },

      addDialog: (scenarId, scenaId, data) => {
        const prvek: DialogPrvek = {
          id: noveId(),
          typ: 'dialog',
          postava: data.postava.trim() || 'POSTAVA',
          text: data.text,
          poznamka: data.poznamka ?? '',
        }
        set((state) => ({
          scenare: state.scenare.map((s) =>
            s.id !== scenarId
              ? s
              : { ...s, sceny: s.sceny.map((sc) => (sc.id === scenaId ? { ...sc, prvky: [...sc.prvky, prvek] } : sc)) }
          ),
        }))
      },

      deletePrvek: (scenarId, scenaId, prvekId) =>
        set((state) => ({
          scenare: state.scenare.map((s) =>
            s.id !== scenarId
              ? s
              : {
                  ...s,
                  sceny: s.sceny.map((sc) =>
                    sc.id !== scenaId ? sc : { ...sc, prvky: sc.prvky.filter((p) => p.id !== prvekId) }
                  ),
                }
          ),
        })),
    }),
    {
      name: 'schoolbuddy-screenplay-writer-storage',
      storage: createJSONStorage(() => secureStorage),
      merge: (persisted, current) => {
        const validation = validateScreenplayWriterData(persisted)
        if (!validation.success) {
          console.error('Data Scénáře v LocalStorage byla poškozena. Obnovuji výchozí stav.')
          return current
        }
        return { ...current, ...validation.data }
      },
    }
  )
)

export const useScreenplayWriter = () => useScreenplayWriterStore()
