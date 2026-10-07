import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateDailyGoalDatum } from '@/core/utils/dailyGoalValidation'

// ==========================================
// Krok 14e (Hubovo "Upozornění na blížící se konec série") — appka
// tady drží jen datum POSLEDNÍHO odeslaného upozornění, ať appka
// nevaruje víckrát za stejný kalendářní den, stejný "vlastní malý
// store jen na odstínění opakování" vzor jako useFitnessPripomenuti.ts.
//
// validateDailyGoalDatum appka znovupoužívá přímo z
// core/utils/dailyGoalValidation.ts — appka validuje úplně stejný tvar
// (nullable YYYY-MM-DD řetězec), druhá, skoro identická kopie by appce
// nic nepřidala.
// ==========================================

interface StreakWarningState {
  posledniUpozorneneDatum: string | null
  oznacUpozorneno: (datum: string) => void
}

export const useStreakWarningStore = create<StreakWarningState>()(
  persist(
    (set) => ({
      posledniUpozorneneDatum: null,
      oznacUpozorneno: (datum) => set({ posledniUpozorneneDatum: datum }),
    }),
    {
      name: 'schoolbuddy-streak-warning-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const saved = persisted as Partial<StreakWarningState> | undefined
        return { ...current, posledniUpozorneneDatum: validateDailyGoalDatum(saved?.posledniUpozorneneDatum) }
      },
    }
  )
)
