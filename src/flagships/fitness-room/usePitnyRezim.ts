import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validatePitnyRezimPocty, validatePitnyRezimCil } from '@/core/utils/pitnyRezimValidation'

// ==========================================
// Pitný režim — denní počet vypitých sklenic vody, klíčovaný datem
// ('YYYY-MM-DD', stejná zone-less opatrnost jako Kalendář/Planer jinde
// v appce), ne rostoucí historie záznamů jako u tělesných měr — appku
// tady zajímá jen "kolik dnes", ne trend v čase jednotlivých sklenic.
//
// Appka za sklenice záměrně neuděluje XP — tlačítko "+ sklenice" je
// triviálně opakovatelné klepnutí bez skutečné práce za ním, na rozdíl
// od Form Checkova sledovaného cviku; udělovat body by jen otevřelo
// snadné, bezpracné XP farmení.
// ==========================================

interface PitnyRezimState {
  pocty: Record<string, number>
  cilSklenic: number | null
  pridatSklenici: (datum: string) => void
  odebratSklenici: (datum: string) => void
  setCilSklenic: (pocet: number | null) => void
}

export const usePitnyRezim = create<PitnyRezimState>()(
  persist(
    (set) => ({
      pocty: {},
      cilSklenic: 8,

      pridatSklenici: (datum) => {
        set((state) => ({ pocty: { ...state.pocty, [datum]: (state.pocty[datum] ?? 0) + 1 } }))
      },

      odebratSklenici: (datum) => {
        set((state) => {
          const aktualni = state.pocty[datum] ?? 0
          if (aktualni <= 0) return state
          return { pocty: { ...state.pocty, [datum]: aktualni - 1 } }
        })
      },

      setCilSklenic: (pocet) => set({ cilSklenic: pocet !== null && pocet > 0 ? pocet : null }),
    }),
    {
      name: 'schoolbuddy-pitny-rezim-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const saved = persisted as Partial<PitnyRezimState> | undefined
        const validace = validatePitnyRezimPocty(saved?.pocty)
        return {
          ...current,
          pocty: validace.success ? validace.data : current.pocty,
          cilSklenic: 'cilSklenic' in (saved ?? {}) ? validatePitnyRezimCil(saved?.cilSklenic) : current.cilSklenic,
        }
      },
    }
  )
)
