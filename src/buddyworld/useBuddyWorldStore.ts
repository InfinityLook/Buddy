import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateBuddyWorldData } from '@/core/utils/buddyWorldValidation'
import { VYCHOZI_MASKOT_ID } from './data/maskoti'

// ==========================================
// Trvalý uložený postup v Buddy Worldu — level/XP (appka počítá
// maxHp/hp znovu z levelu při každém vstupu do appčiny scény, appka
// je nepersistuje, appka ukládá jen to, co doopravdy mezi relacemi
// potřebuje — zadání samo žádá "appka nejdřív implementuje a
// odzkouší ukládání dat, která prototyp doopravdy používá"), appčin
// aktivní maskot a appčina sada odemčených maskotů.
//
// Appka tenhle stav drží mimo core/store (herní stav, ne něco, co
// potřebuje zbytek appky — stejná konvence jako Buddyheimovo
// useGameCharacter.ts).
// ==========================================

interface BuddyWorldState {
  level: number
  xp: number
  aktivniMaskotId: string
  odemceneMaskoty: string[]

  /** appka uloží autoritativní úroveň/XP spočtenou leveling.ts's
   *  pripocistXp — store samotný žádnou herní matematiku nedělá,
   *  appka ji drží jen v leveling.ts. */
  ulozPostup: (level: number, xp: number) => void
  /** appka vybere aktivního maskota — appka tiše nic neudělá, když
   *  maskot ještě není odemčený. */
  vybratMaskota: (id: string) => void
}

export const useBuddyWorldStore = create<BuddyWorldState>()(
  persist(
    (set, get) => ({
      level: 1,
      xp: 0,
      aktivniMaskotId: VYCHOZI_MASKOT_ID,
      odemceneMaskoty: [VYCHOZI_MASKOT_ID],

      ulozPostup: (level, xp) => set((stav) => {
        const odemknout = [
          ...(level >= 5 ? ['moss'] : []),
          ...(level >= 10 ? ['nyx'] : []),
          ...(level >= 20 ? ['frost'] : []),
        ]
        return { level, xp, odemceneMaskoty: [...new Set([...stav.odemceneMaskoty, ...odemknout])] }
      }),

      vybratMaskota: (id) => {
        if (!get().odemceneMaskoty.includes(id)) return
        set({ aktivniMaskotId: id })
      },
    }),
    {
      name: 'schoolbuddy-buddyworld-storage',
      storage: createJSONStorage(() => secureStorage),
      merge: (persisted, current) => {
        const validace = validateBuddyWorldData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)
