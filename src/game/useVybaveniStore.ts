import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateVybaveniData } from '@/core/utils/vybaveniValidation'
import { PostavaId } from './types'

// ==========================================
// Vybavení (Fáze 9) — účtově VLASTNĚNÉ (jako obchod, boolean), ale
// nasazené je vlastnost KONKRÉTNÍ postavy (jako její úroveň v
// useGameCharacter.ts) — proto dvě oddělená pole, ne jedno. Vlastní
// store mimo useGameCharacter, protože "co vlastním" je účtové (jako
// batoh/obchod), zatímco "co mám zrovna nasazené" je za postavu — ani
// jedno pole samo o sobě nepatří čistě do žádného z existujících
// storů, mít oboje pohromadě v novém je jasnější než roztahovat obojí
// přes dva stávající.
// ==========================================

interface VybaveniState {
  /** Id vlastněných relikvií (viz data/equipment.ts) — jednou získané,
   *  jako obchodní ownedItems, ne že by šly ztratit sundáním. */
  vlastnene: string[]
  /** Co má KTERÁ postava zrovna nasazené — postavaId → vybaveniId.
   *  Chybějící klíč = nic nenasazeno. */
  nasazene: Record<string, string>

  /** Přidá relikvii do vlastnictví. Idempotentní — opakované vítězství
   *  nad stejným bossem (viz Souboj.tsx) nic nezdvojí. */
  ziskatVybaveni: (id: string) => void
  /** Nasadí/sundá relikvii dané postavě. `null` = sundat. Nekontroluje
   *  vlastnictví — to řeší UI (Hrdina.tsx nabízí jen vlastněné kusy). */
  nasaditVybaveni: (postavaId: PostavaId, vybaveniId: string | null) => void
}

export const useVybaveniStore = create<VybaveniState>()(
  persist(
    (set) => ({
      vlastnene: [],
      nasazene: {},

      ziskatVybaveni: (id) => {
        set((state) => (state.vlastnene.includes(id) ? state : { vlastnene: [...state.vlastnene, id] }))
      },

      nasaditVybaveni: (postavaId, vybaveniId) => {
        set((state) => {
          if (vybaveniId === null) {
            const { [postavaId]: _odstranene, ...zbyle } = state.nasazene
            return { nasazene: zbyle }
          }
          return { nasazene: { ...state.nasazene, [postavaId]: vybaveniId } }
        })
      },
    }),
    {
      name: 'schoolbuddy-vybaveni-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateVybaveniData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)
