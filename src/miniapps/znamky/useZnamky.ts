import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateZnamkyData } from '@/core/utils/znamkyValidation'
import { Predmet, Znamka } from './types'

const XP_ZA_ZNAMKU = 4

interface ZnamkyState {
  predmety: Predmet[]
  pridatPredmet: (nazev: string, kredity: number) => void
  smazatPredmet: (id: string) => void
  pridatZnamku: (predmetId: string, hodnota: number, vaha: number, popis: string, datum: string) => void
  smazatZnamku: (predmetId: string, znamkaId: string) => void
}

const useZnamkyStore = create<ZnamkyState>()(
  persist(
    (set) => ({
      predmety: [],

      pridatPredmet: (nazev, kredity) => {
        if (!nazev.trim()) return
        const novy: Predmet = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          nazev: nazev.trim(),
          kredity: Math.max(0, kredity || 0),
          znamky: [],
        }
        set((state) => ({ predmety: [...state.predmety, novy] }))
      },

      smazatPredmet: (id) =>
        set((state) => ({ predmety: state.predmety.filter((p) => p.id !== id) })),

      pridatZnamku: (predmetId, hodnota, vaha, popis, datum) => {
        const znamka: Znamka = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          hodnota,
          vaha: Math.max(0.1, vaha || 1),
          popis: popis.trim(),
          datum,
        }
        set((state) => ({
          predmety: state.predmety.map((p) =>
            p.id === predmetId ? { ...p, znamky: [znamka, ...p.znamky] } : p
          ),
        }))
        useGamificationStore.getState().recordAction('znamka', XP_ZA_ZNAMKU)
      },

      smazatZnamku: (predmetId, znamkaId) =>
        set((state) => ({
          predmety: state.predmety.map((p) =>
            p.id === predmetId ? { ...p, znamky: p.znamky.filter((z) => z.id !== znamkaId) } : p
          ),
        })),
    }),
    {
      name: 'schoolbuddy-znamky-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateZnamkyData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)

export const useZnamky = () => {
  const { predmety, pridatPredmet, smazatPredmet, pridatZnamku, smazatZnamku } = useZnamkyStore()
  return { predmety, pridatPredmet, smazatPredmet, pridatZnamku, smazatZnamku }
}
