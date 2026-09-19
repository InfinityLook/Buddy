import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateCitaceData } from '@/core/utils/citaceValidation'
import { Citace, TypZdroje } from './types'

const XP_ZA_CITACI = 4

interface CitaceState {
  citace: Citace[]
  pridatCitaci: (
    typ: TypZdroje,
    autor: string,
    nazev: string,
    rok: string,
    vydavatelNeboWeb: string,
    url: string,
    datumCitace: string
  ) => void
  /** Loose merge-by-id, stejný tvar jako updateKapitola jinde v appce —
   *  volající pošle jen pole, co doopravdy mění. */
  upravitCitaci: (id: string, patch: Partial<Omit<Citace, 'id' | 'createdAt'>>) => void
  smazatCitaci: (id: string) => void
}

const useCitaceStore = create<CitaceState>()(
  persist(
    (set) => ({
      citace: [],

      pridatCitaci: (typ, autor, nazev, rok, vydavatelNeboWeb, url, datumCitace) => {
        if (!nazev.trim()) return

        const nova: Citace = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          typ,
          autor: autor.trim(),
          nazev: nazev.trim(),
          rok: rok.trim(),
          vydavatelNeboWeb: vydavatelNeboWeb.trim(),
          url: url.trim(),
          datumCitace,
          createdAt: new Date().toISOString(),
        }

        set((state) => ({ citace: [nova, ...state.citace] }))
        useGamificationStore.getState().recordAction('citace', XP_ZA_CITACI)
      },

      upravitCitaci: (id, patch) =>
        set((state) => ({
          citace: state.citace.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      smazatCitaci: (id) =>
        set((state) => ({ citace: state.citace.filter((c) => c.id !== id) })),
    }),
    {
      name: 'schoolbuddy-citace-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateCitaceData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)

export const useCitace = () => {
  const { citace, pridatCitaci, upravitCitaci, smazatCitaci } = useCitaceStore()
  return { citace, pridatCitaci, upravitCitaci, smazatCitaci }
}
