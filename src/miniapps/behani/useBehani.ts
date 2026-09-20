import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateBehaniData } from '@/core/utils/behaniValidation'
import { soucetVzdalenostiM, type BehSezeni, type TypAktivity, type GpsBod } from './types'

const XP_ZA_SEZENI = 20

// Hand-checked odznak za CELKOVOU nauběhanou/najetou vzdálenost napříč
// historií — nevejde se do COUNT_BADGES's jednoduchého "kolikáté
// volání" tvaru (stejný důvod jako stovkar/exam_master jinde v appce),
// proto kontrola přímo tady v pridatSezeni, ne v gamifikačním storu.
const MARATONEC_PRAH_M = 42_195 // maratonská trať, symbolická hranice

interface BehaniState {
  sezeni: BehSezeni[]
  /** Vrátí id nově uloženého sezení. */
  pridatSezeni: (typ: TypAktivity, vzdalenostM: number, trvaniSekund: number, odhadKcal: number, trasa: GpsBod[]) => string
  smazatSezeni: (id: string) => void
}

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const useBehani = create<BehaniState>()(
  persist(
    (set, get) => ({
      sezeni: [],

      pridatSezeni: (typ, vzdalenostM, trvaniSekund, odhadKcal, trasa) => {
        const nove: BehSezeni = {
          id: noveId(),
          typ,
          vzdalenostM,
          trvaniSekund,
          odhadKcal,
          trasa,
          createdAt: new Date().toISOString(),
        }

        set((state) => ({ sezeni: [nove, ...state.sezeni] }))

        useGamificationStore.getState().recordAction('behani', XP_ZA_SEZENI)

        const celkemPredtim = soucetVzdalenostiM(get().sezeni.filter((s) => s.id !== nove.id))
        if (celkemPredtim < MARATONEC_PRAH_M && celkemPredtim + vzdalenostM >= MARATONEC_PRAH_M) {
          useGamificationStore.getState().unlockBadge('maratonec')
        }

        return nove.id
      },

      smazatSezeni: (id) => set((state) => ({ sezeni: state.sezeni.filter((s) => s.id !== id) })),
    }),
    {
      name: 'schoolbuddy-behani-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateBehaniData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)
