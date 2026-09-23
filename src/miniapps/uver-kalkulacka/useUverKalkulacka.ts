import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateUverKalkulackaData } from '@/core/utils/uverKalkulackaValidation'
import { Dluh } from './types'

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface UverKalkulackaState {
  dluhy: Dluh[]
  pridatDluh: (nazev: string, zustatek: number, urokRocniProcenta: number, minimalniSplatka: number) => void
  upravitDluh: (id: string, patch: Partial<Omit<Dluh, 'id'>>) => void
  smazatDluh: (id: string) => void
}

export const useUverKalkulackaStore = create<UverKalkulackaState>()(
  persist(
    (set) => ({
      dluhy: [],

      // Přidání dluhu do seznamu je čistě datový vstup bez přirozeného
      // stropu (kolik dluhů má kdo reálně) — appka mu proto, stejně
      // jako Jídelníčku/Pitnému režimu, nedává žádné XP.
      pridatDluh: (nazev, zustatek, urokRocniProcenta, minimalniSplatka) => {
        if (!nazev.trim() || !Number.isFinite(zustatek) || zustatek <= 0) return
        const novy: Dluh = {
          id: noveId(),
          nazev: nazev.trim(),
          zustatek: Math.round(zustatek),
          urokRocniProcenta: Math.max(0, urokRocniProcenta) || 0,
          minimalniSplatka: Math.max(1, Math.round(minimalniSplatka) || 1),
        }
        set((state) => ({ dluhy: [...state.dluhy, novy] }))
      },

      upravitDluh: (id, patch) =>
        set((state) => ({ dluhy: state.dluhy.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),

      smazatDluh: (id) => set((state) => ({ dluhy: state.dluhy.filter((d) => d.id !== id) })),
    }),
    {
      name: 'schoolbuddy-uver-kalkulacka-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateUverKalkulackaData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)

export const useUverKalkulacka = () => {
  const { dluhy, pridatDluh, upravitDluh, smazatDluh } = useUverKalkulackaStore()
  return { dluhy, pridatDluh, upravitDluh, smazatDluh }
}
