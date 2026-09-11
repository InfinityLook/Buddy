import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateCvicebniPlanData, type DenVTydnu, type HodnotaPlanu } from '@/core/utils/cvicebniPlanValidation'

export type { DenVTydnu, HodnotaPlanu }

// ==========================================
// Cvičební plán / rozvrh — kdo si nastaví, co má na kterém dnu v týdnu
// trénovat, appka mu to připomene (viz fitnessReminders.ts) i ukáže na
// dashboardu (FitnessRoomModule.tsx). Malý samostatný store, stejný tvar
// jako useFitnessCil.ts/useTelesneMiry.ts — žádná odvozená logika navíc,
// exportovaný přímo jako Zustand hook.
//
// Prázdný plán (chybějící den) je "nenastaveno", ne "odpočinek" — appka
// dnešek bez nastaveného plánu prostě žádnou hláškou nezmiňuje, místo
// aby si vymýšlela, že jde o den volna.
// ==========================================

/** JS getDay() vrací 0=neděle..6=sobota; appka jinde (Kalendář/Rozvrh)
 *  drží pondělí jako první den týdne, takže se přepočítá na 1=Po..7=Ne. */
export const dnesniDenVTydnu = (ted = new Date()): DenVTydnu => (((ted.getDay() + 6) % 7) + 1) as DenVTydnu

export const NAZEV_DNE: Record<DenVTydnu, string> = {
  1: 'Pondělí',
  2: 'Úterý',
  3: 'Středa',
  4: 'Čtvrtek',
  5: 'Pátek',
  6: 'Sobota',
  7: 'Neděle',
}

interface CvicebniPlanState {
  plan: Partial<Record<DenVTydnu, HodnotaPlanu>>
  nastavDen: (den: DenVTydnu, hodnota: HodnotaPlanu | null) => void
}

export const useCvicebniPlan = create<CvicebniPlanState>()(
  persist(
    (set) => ({
      plan: {},

      nastavDen: (den, hodnota) =>
        set((state) => {
          const novyPlan = { ...state.plan }
          if (hodnota === null) delete novyPlan[den]
          else novyPlan[den] = hodnota
          return { plan: novyPlan }
        }),
    }),
    {
      name: 'schoolbuddy-cvicebni-plan-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const saved = persisted as Partial<CvicebniPlanState> | undefined
        const validace = validateCvicebniPlanData(saved?.plan)
        return { ...current, plan: validace.success ? validace.data : current.plan }
      },
    }
  )
)
