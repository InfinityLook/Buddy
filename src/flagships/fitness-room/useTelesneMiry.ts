import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateTelesneMiryData, type ZaznamMiry } from '@/core/utils/telesneMiryValidation'

// ==========================================
// Deník tělesných měr — váha a obvod pasu v čase, čistě ruční záznam
// uživatele. Appka je nikde jinde neodvozuje ani neodhaduje (na rozdíl
// od Kalorií/Tréninku ve fitnessStats.ts) — jen ukládá a kreslí trend.
//
// Vlastní malý store, ne pole navíc na useFitnessCil.ts — jiný tvar dat
// (rostoucí historie záznamů v čase, ne tři nastavitelná čísla cíle)
// a jiná otázka (co jsem doopravdy naměřil, ne co si přeju dosáhnout).
//
// datum je prostý řetězec 'YYYY-MM-DD', ne Date/timestamp — stejná
// "zone-less literál, ne UTC posunutý" opatrnost jako u Kalendáře/
// Planeru jinde v appce.
// ==========================================

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface TelesneMiryState {
  zaznamy: ZaznamMiry[]
  pridatZaznam: (datum: string, vahaKg: number | null, obvodPasuCm: number | null) => void
  smazatZaznam: (id: string) => void
}

export const useTelesneMiry = create<TelesneMiryState>()(
  persist(
    (set) => ({
      zaznamy: [],

      pridatZaznam: (datum, vahaKg, obvodPasuCm) => {
        set((state) => ({
          zaznamy: [...state.zaznamy, { id: noveId(), datum, vahaKg, obvodPasuCm }],
        }))
      },

      smazatZaznam: (id) => {
        set((state) => ({ zaznamy: state.zaznamy.filter((z) => z.id !== id) }))
      },
    }),
    {
      name: 'schoolbuddy-telesne-miry-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const saved = persisted as Partial<TelesneMiryState> | undefined
        const validace = validateTelesneMiryData(saved?.zaznamy)
        if (!validace.success) return current
        return { ...current, zaznamy: validace.data }
      },
    }
  )
)

export type { ZaznamMiry }
