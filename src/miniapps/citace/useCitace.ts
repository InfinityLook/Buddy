import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateCitaceData } from '@/core/utils/citaceValidation'
import { Citace, TypCitacnihoStylu, TypZdroje } from './types'

const XP_ZA_CITACI = 4

interface CitaceState {
  citace: Citace[]
  // Zvolený citační styl — vykreslovací volba, ne vlastnost jednotlivé
  // citace (viz vlastní komentář u TypCitacnihoStylu v types.ts).
  // Přetrvává mezi otevřeními appky, stejně jako Math Solverovo
  // angleMode — kdo píše práci v jednom stylu, chce ho mít nastavený
  // příště zas.
  aktivniStyl: TypCitacnihoStylu
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
  nastavStyl: (styl: TypCitacnihoStylu) => void
}

export const useCitaceStore = create<CitaceState>()(
  persist(
    (set) => ({
      citace: [],
      aktivniStyl: 'iso690',

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

      nastavStyl: (styl) => set({ aktivniStyl: styl }),
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
  const { citace, aktivniStyl, pridatCitaci, upravitCitaci, smazatCitaci, nastavStyl } = useCitaceStore()
  return { citace, aktivniStyl, pridatCitaci, upravitCitaci, smazatCitaci, nastavStyl }
}
