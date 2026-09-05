import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateFlagshipWidgetsData } from '@/core/utils/flagshipWidgetsValidation'

export const POCET_WIDGET_SLOTU = 3

interface FlagshipWidgetsState {
  // flagshipId -> pole id widgetů (nebo null pro prázdný slot), délka
  // POCET_WIDGET_SLOTU. Jeden sdílený store pro všechny vlajkové appky
  // (klíčovaný podle flagshipId), ne jeden store na appku — School Room
  // dnes, další "Room" appky zítra bez dalšího úložného klíče navíc.
  sloty: Record<string, (string | null)[]>
  nastavSlot: (flagshipId: string, index: number, widgetId: string | null) => void
}

export const useFlagshipWidgetsStore = create<FlagshipWidgetsState>()(
  persist(
    (set) => ({
      sloty: {},

      nastavSlot: (flagshipId, index, widgetId) =>
        set((state) => {
          const aktualni = state.sloty[flagshipId] ?? Array(POCET_WIDGET_SLOTU).fill(null)
          const nove = [...aktualni]
          nove[index] = widgetId
          return { sloty: { ...state.sloty, [flagshipId]: nove } }
        }),
    }),
    {
      name: 'schoolbuddy-flagship-widgets-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateFlagshipWidgetsData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)

/** Čte sloty jedné konkrétní vlajkové appky, vždy s pevnou délkou
 *  POCET_WIDGET_SLOTU (i když appka tuhle appku vidí poprvé a store pro
 *  ni ještě nic nemá) — komponenta tak nikdy neřeší chybějící klíč. */
export const useFlagshipSloty = (flagshipId: string): (string | null)[] => {
  const ulozene = useFlagshipWidgetsStore((s) => s.sloty[flagshipId])
  return ulozene ?? Array(POCET_WIDGET_SLOTU).fill(null)
}
