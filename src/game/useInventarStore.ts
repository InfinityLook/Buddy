import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateInventarData } from '@/core/utils/inventarValidation'

// ==========================================
// Batoh — spotřební loot z bojů (viz combat/types.ts Nepritel.lupId,
// game/data/items.ts), účtový stav jako questy/badges, ne vázaný na
// jednu postavu. Odlišné od useWalletStore.ownedItems (obchod, trvalé
// jednou-koupené vylepšení jako boolean) — tady jde o počítaná
// množství věcí, co se použitím spotřebují.
// ==========================================

interface InventarState {
  /** Počet vlastněných kusů podle id z game/data/items.ts. */
  predmety: Record<string, number>

  pridatPredmet: (id: string, pocet?: number) => void
  /** Spotřebuje jeden kus — vrací true, pokud ho hráč doopravdy měl
   *  (a tím pádem použil), false když ho neměl (no-op). */
  spotrebovatPredmet: (id: string) => boolean
}

export const useInventarStore = create<InventarState>()(
  persist(
    (set, get) => ({
      predmety: {},

      pridatPredmet: (id, pocet = 1) => {
        set((state) => ({ predmety: { ...state.predmety, [id]: (state.predmety[id] ?? 0) + pocet } }))
      },

      spotrebovatPredmet: (id) => {
        const aktualni = get().predmety[id] ?? 0
        if (aktualni <= 0) return false
        set((state) => ({ predmety: { ...state.predmety, [id]: aktualni - 1 } }))
        return true
      },
    }),
    {
      name: 'schoolbuddy-inventar-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateInventarData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)
