import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { mistniDatum } from '@/core/utils/date'
import { validateDailyGoalDatum, validateDailyGoalSplneno } from '@/core/utils/dailyGoalValidation'
import { zavibrujSplneniCile } from '@/core/utils/haptika'
import { useGamificationStore } from './useGamificationStore'

// Hubova "Dnešního cíle" (Krok 13) bonus — holé addXp, ne recordAction:
// tenhle cíl nepatří žádné konkrétní miniaplikaci a nemá vlastní
// ActivityKind/odznak vázaný na počet, je to jen jednorázová denní
// prémie za "dokonči JAKOUKOLI aktivitu" — stejný už existující vzor
// jako Soubojovo addXp(XP_UCAST) nebo Exam Prepovo addXp(confidence*10),
// kde holá částka nesedí do recordAction's "jeden counter, jedna
// akce" tvaru.
export const DENNI_CIL_ODMENA_XP = 50

interface DailyGoalState {
  datum: string | null
  splneno: boolean
  oznacitSplneno: () => void
}

// Appka cíl vyhodnocuje vždycky znovu při čtení, nikdy jen podle
// uloženého splneno samotného — stejná "neukládej odvozený stav,
// spočítej ho při čtení" zásada jako resolveActiveRoleId/
// resolveActiveThemeId jinde v appce. Jedině tak se splneno z
// minulého dne nemůže omylem zatoulat do dnešního zobrazení.
export const jeDnesniCilSplnen = (datum: string | null, splneno: boolean, dnes: string = mistniDatum()): boolean =>
  datum === dnes && splneno

export const useDailyGoalStore = create<DailyGoalState>()(
  persist(
    (set, get) => ({
      datum: null,
      splneno: false,

      oznacitSplneno: () => {
        const dnes = mistniDatum()
        // Dnešní cíl je už splněný — no-op, ať se bonusové XP nikdy
        // nepřipočte dvakrát za jediný kalendářní den.
        if (jeDnesniCilSplnen(get().datum, get().splneno, dnes)) return

        set({ datum: dnes, splneno: true })
        useGamificationStore.getState().addXp(DENNI_CIL_ODMENA_XP)
        // Krok 14c: appka vibraci volá přímo tady, ne z Hub.tsx — tím
        // pádem appka spoléhá na no-op guard výš a vibrace se nikdy
        // nespustí podruhé za stejný den, i kdyby oznacitSplneno()
        // zavolal ještě jednou odkudkoli jiného.
        zavibrujSplneniCile()
      },
    }),
    {
      name: 'schoolbuddy-daily-goal-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const saved = persisted as Partial<DailyGoalState> | undefined
        return {
          ...current,
          datum: validateDailyGoalDatum(saved?.datum),
          splneno: validateDailyGoalSplneno(saved?.splneno),
        }
      },
    }
  )
)
