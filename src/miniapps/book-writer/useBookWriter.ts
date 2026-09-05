import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateBookWriterData } from '@/core/utils/bookWriterValidation'
import { Kniha } from './types'

// Stejně nízké XP jako u ostatních tvůrčích miniaplikací (Music Studio,
// Kalendář) — odměna za jednu kapitolu, ne za celou knihu, ať se to dá
// dělat opakovaně.
const BOOK_XP = 6

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface BookWriterState {
  knihy: Kniha[]
  addKniha: (nazev: string) => string
  deleteKniha: (id: string) => void
  setCilSlov: (knihaId: string, cil: number | null) => void
  addKapitola: (knihaId: string, nazev: string) => void
  updateKapitola: (knihaId: string, kapitolaId: string, data: { nazev?: string; text?: string }) => void
  deleteKapitola: (knihaId: string, kapitolaId: string) => void
}

const useBookWriterStore = create<BookWriterState>()(
  persist(
    (set) => ({
      knihy: [],

      addKniha: (nazev) => {
        const id = noveId()
        const nova: Kniha = { id, nazev: nazev.trim() || 'Nová kniha', cilSlov: null, kapitoly: [], createdAt: new Date().toISOString() }
        set((state) => ({ knihy: [nova, ...state.knihy] }))
        return id
      },

      deleteKniha: (id) => set((state) => ({ knihy: state.knihy.filter((k) => k.id !== id) })),

      setCilSlov: (knihaId, cil) =>
        set((state) => ({
          knihy: state.knihy.map((k) => (k.id === knihaId ? { ...k, cilSlov: cil } : k)),
        })),

      addKapitola: (knihaId, nazev) => {
        const nova = { id: noveId(), nazev: nazev.trim() || 'Nová kapitola', text: '', createdAt: new Date().toISOString() }
        set((state) => ({
          knihy: state.knihy.map((k) => (k.id === knihaId ? { ...k, kapitoly: [...k.kapitoly, nova] } : k)),
        }))
        useGamificationStore.getState().recordAction('book', BOOK_XP)
      },

      updateKapitola: (knihaId, kapitolaId, data) =>
        set((state) => ({
          knihy: state.knihy.map((k) =>
            k.id !== knihaId
              ? k
              : { ...k, kapitoly: k.kapitoly.map((kap) => (kap.id === kapitolaId ? { ...kap, ...data } : kap)) }
          ),
        })),

      deleteKapitola: (knihaId, kapitolaId) =>
        set((state) => ({
          knihy: state.knihy.map((k) =>
            k.id !== knihaId ? k : { ...k, kapitoly: k.kapitoly.filter((kap) => kap.id !== kapitolaId) }
          ),
        })),
    }),
    {
      name: 'schoolbuddy-book-writer-storage',
      storage: createJSONStorage(() => secureStorage),
      // merge, ne migrate — stejná zásada jako Music Studio's store:
      // poškozená kniha/kapitola se má zahodit po jedné, ne shodit celý
      // uložený stav.
      merge: (persisted, current) => {
        const validation = validateBookWriterData(persisted)
        if (!validation.success) {
          console.error('Data Knihy v LocalStorage byla poškozena. Obnovuji výchozí stav.')
          return current
        }
        return { ...current, ...validation.data }
      },
    }
  )
)

export const useBookWriter = () => useBookWriterStore()
