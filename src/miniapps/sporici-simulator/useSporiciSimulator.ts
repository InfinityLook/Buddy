import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateSporiciSimulatorData } from '@/core/utils/sporiciSimulatorValidation'
import { SporiciScenar } from './types'

// Uložení scénáře je "vytvořil jsem něco" akce (viz useGamificationStore's
// vlastní komentář u ActivityKind 'sporeni') — malé XP, stejný řád jako
// Citace, protože uložit scénář je taky spíš zaznamenaná myšlenka než
// dlouhotrvající činnost.
const XP_ZA_SCENAR = 4

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface SporiciSimulatorState {
  scenare: SporiciScenar[]
  ulozitScenar: (
    nazev: string,
    pocatecniVklad: number,
    mesicniVklad: number,
    rocniUrokProcenta: number,
    pocetLet: number
  ) => void
  smazatScenar: (id: string) => void
}

export const useSporiciSimulatorStore = create<SporiciSimulatorState>()(
  persist(
    (set) => ({
      scenare: [],

      ulozitScenar: (nazev, pocatecniVklad, mesicniVklad, rocniUrokProcenta, pocetLet) => {
        if (!nazev.trim()) return
        if (!Number.isFinite(pocetLet) || pocetLet <= 0) return

        const novy: SporiciScenar = {
          id: noveId(),
          nazev: nazev.trim(),
          pocatecniVklad: Math.max(0, Math.round(pocatecniVklad) || 0),
          mesicniVklad: Math.max(0, Math.round(mesicniVklad) || 0),
          rocniUrokProcenta: Math.max(0, rocniUrokProcenta) || 0,
          pocetLet: Math.round(pocetLet),
          createdAt: new Date().toISOString(),
        }

        set((state) => ({ scenare: [novy, ...state.scenare] }))
        useGamificationStore.getState().recordAction('sporeni', XP_ZA_SCENAR)
      },

      smazatScenar: (id) => set((state) => ({ scenare: state.scenare.filter((s) => s.id !== id) })),
    }),
    {
      name: 'schoolbuddy-sporici-simulator-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateSporiciSimulatorData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)

export const useSporiciSimulator = () => {
  const { scenare, ulozitScenar, smazatScenar } = useSporiciSimulatorStore()
  return { scenare, ulozitScenar, smazatScenar }
}
