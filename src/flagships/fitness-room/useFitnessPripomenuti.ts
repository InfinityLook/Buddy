import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import {
  validateFitnessPripomenutiCasy,
  validateFitnessPripomenutiOdeslane,
} from '@/core/utils/fitnessPripomenutiValidation'

// ==========================================
// Víc časů připomenutí tréninku za den — casy je sotovaný seznam
// "HH:MM" řetězců, výchozí přesně ['17:00'], stejný jediný čas, co
// appka posílala, než šlo časy vůbec nastavovat (nikdo, kdo tenhle
// panel nikdy neotevře, nepozná rozdíl). odeslaneCasy/odeslaneDatum
// spolu drží, KTERÉ z casy dnešek už doopravdy odeslaly — appka je
// resetuje, jakmile se datum liší od odeslaneDatum, ať appka nikdy
// neposílá stejné připomenutí dvakrát za den, ale klidně víckrát za
// den z různých nastavených časů (viz fitnessReminders.ts).
// ==========================================

interface FitnessPripomenutiState {
  casy: string[]
  odeslaneDatum: string | null
  odeslaneCasy: string[]
  pridatCas: (cas: string) => void
  odebratCas: (cas: string) => void
  oznacOdeslano: (datum: string, cas: string) => void
}

export const useFitnessPripomenuti = create<FitnessPripomenutiState>()(
  persist(
    (set) => ({
      casy: ['17:00'],
      odeslaneDatum: null,
      odeslaneCasy: [],

      pridatCas: (cas) =>
        set((state) => (state.casy.includes(cas) ? state : { casy: [...state.casy, cas].sort() })),

      odebratCas: (cas) =>
        set((state) => {
          const zbyle = state.casy.filter((c) => c !== cas)
          // Aspoň jeden čas musí zůstat vždycky — appka bez toho nemá
          // co kontrolovat a připomenutí by tiše přestalo fungovat.
          return zbyle.length > 0 ? { casy: zbyle } : state
        }),

      oznacOdeslano: (datum, cas) =>
        set((state) => {
          const odeslaneDnes = state.odeslaneDatum === datum ? state.odeslaneCasy : []
          return { odeslaneDatum: datum, odeslaneCasy: [...odeslaneDnes, cas] }
        }),
    }),
    {
      name: 'schoolbuddy-fitness-pripomenuti-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const saved = persisted as Partial<FitnessPripomenutiState> | undefined
        return {
          ...current,
          casy: validateFitnessPripomenutiCasy(saved?.casy),
          odeslaneDatum: typeof saved?.odeslaneDatum === 'string' ? saved.odeslaneDatum : null,
          odeslaneCasy: validateFitnessPripomenutiOdeslane(saved?.odeslaneCasy),
        }
      },
    }
  )
)
