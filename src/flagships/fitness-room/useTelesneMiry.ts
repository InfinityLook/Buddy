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
  // Výška je jedna hodnota pro celý účet, ne pole u každého záznamu —
  // na rozdíl od váhy se v týdnu/měsíci nemění, takže by se u každého
  // záznamu jen znovu opisovala ta samá hodnota. Slouží jedině k výpočtu
  // BMI (telesneMiryStats.ts's vypocitejBmi) — appka jinde výšku
  // nepoužívá ani neodhaduje.
  vyskaCm: number | null
  pridatZaznam: (datum: string, vahaKg: number | null, obvodPasuCm: number | null) => void
  smazatZaznam: (id: string) => void
  setVyska: (vyskaCm: number | null) => void
}

export const useTelesneMiry = create<TelesneMiryState>()(
  persist(
    (set) => ({
      zaznamy: [],
      vyskaCm: null,

      pridatZaznam: (datum, vahaKg, obvodPasuCm) => {
        set((state) => ({
          zaznamy: [...state.zaznamy, { id: noveId(), datum, vahaKg, obvodPasuCm }],
        }))
      },

      smazatZaznam: (id) => {
        set((state) => ({ zaznamy: state.zaznamy.filter((z) => z.id !== id) }))
      },

      setVyska: (vyskaCm) => set({ vyskaCm: vyskaCm !== null && vyskaCm > 0 ? vyskaCm : null }),
    }),
    {
      name: 'schoolbuddy-telesne-miry-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const saved = persisted as Partial<TelesneMiryState> | undefined
        const validace = validateTelesneMiryData(saved?.zaznamy)
        const vyska = saved?.vyskaCm
        return {
          ...current,
          zaznamy: validace.success ? validace.data : current.zaznamy,
          vyskaCm: typeof vyska === 'number' && Number.isFinite(vyska) && vyska > 0 ? vyska : null,
        }
      },
    }
  )
)

export type { ZaznamMiry }
