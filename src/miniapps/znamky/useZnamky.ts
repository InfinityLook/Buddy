import { useMemo } from 'react'
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
  // Nastavení cíle je jen zápis čísla, ne skutečná studijní akce — na
  // rozdíl od pridatZnamku se tu proto XP neuděluje, stejná zdrženlivost
  // jako u School Roomova useSkolaCil.
  nastavCilPredmetu: (predmetId: string, cil: number | null) => void
}

const useZnamkyStore = create<ZnamkyState>()(
  persist(
    (set) => ({
      predmety: [],

      pridatPredmet: (nazev, kredity) => {
        if (!nazev.trim()) return
        const ted = Date.now()
        const novy: Predmet = {
          id: `${ted}-${Math.random().toString(36).slice(2, 7)}`,
          nazev: nazev.trim(),
          kredity: Math.max(0, kredity || 0),
          znamky: [],
          createdAt: new Date(ted).toISOString(),
          updatedAt: ted,
          deletedAt: null,
        }
        set((state) => ({ predmety: [...state.predmety, novy] }))
      },

      smazatPredmet: (id) =>
        set((state) => {
          const ted = Date.now()
          return {
            predmety: state.predmety.map((p) => (p.id === id ? { ...p, deletedAt: ted, updatedAt: ted } : p)),
          }
        }),

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
            p.id === predmetId ? { ...p, znamky: [znamka, ...p.znamky], updatedAt: Date.now() } : p
          ),
        }))
        useGamificationStore.getState().recordAction('znamka', XP_ZA_ZNAMKU)
      },

      smazatZnamku: (predmetId, znamkaId) =>
        set((state) => ({
          predmety: state.predmety.map((p) =>
            p.id === predmetId
              ? { ...p, znamky: p.znamky.filter((z) => z.id !== znamkaId), updatedAt: Date.now() }
              : p
          ),
        })),

      nastavCilPredmetu: (predmetId, cil) =>
        set((state) => ({
          predmety: state.predmety.map((p) => (p.id === predmetId ? { ...p, cil, updatedAt: Date.now() } : p)),
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

// Syrový přístup ke storu pro cloudovou synchronizaci (skolaSync.ts) —
// vidí i smazané (deletedAt) předměty, protože ty musí synchronizace
// umět poslat jako tombstone řádek. Stejná trojice jako u Writer's
// Roomových/Goal Trackerových getRaw*State funkcí.
export const getRawZnamkyState = () => useZnamkyStore.getState()
export const setRawZnamkyState = (patch: Partial<{ predmety: Predmet[] }>) => useZnamkyStore.setState(patch)
export const subscribeZnamkyStore = (fn: () => void) => useZnamkyStore.subscribe(fn)

export const useZnamky = () => {
  const { predmety: vsechnyPredmety, pridatPredmet, smazatPredmet, pridatZnamku, smazatZnamku, nastavCilPredmetu } =
    useZnamkyStore()

  // Smazané předměty appka drží v úložišti dál (viz Predmet.deletedAt)
  // jen kvůli synchronizaci mezi zařízeními — kdokoli appku volá jako
  // dřív je nikdy nesmí vidět.
  const predmety = useMemo(() => vsechnyPredmety.filter((p) => !p.deletedAt), [vsechnyPredmety])

  return { predmety, pridatPredmet, smazatPredmet, pridatZnamku, smazatZnamku, nastavCilPredmetu }
}
