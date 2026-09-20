import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateJidelnicekData, type JidloZaznam } from '@/core/utils/jidelnicekValidation'

export type { JidloZaznam }

// ==========================================
// Jídelníček — deník snězených jídel s kaloriemi. Appka nemá žádnou
// skutečnou nutriční databázi ani skener čárových kódů; POTRAVINY
// (data/potraviny.ts) je jen rychlá volba pro pár běžných položek,
// vlastní název + kalorie jde zapsat úplně stejně ručně — appka obojí
// ukládá do stejného tvaru záznamu, žádný rozdíl mezi "vybráno ze
// seznamu" a "napsáno vlastní".
//
// Appka za tohle záměrně neuděluje XP (na rozdíl od Form Checkova
// ulozitSezeni) — stejná zásada jako u tělesných měr vedle
// (useTelesneMiry.ts's pridatZaznam): osobní záznam dat, ne cvičební
// výkon, a navíc snadno opakovatelné klepnutí, které by jinak šlo
// zneužít k nekonečnému sbírání bodů.
// ==========================================

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface JidelnicekState {
  zaznamy: JidloZaznam[]
  pridatJidlo: (datum: string, nazev: string, kcal: number) => void
  smazatJidlo: (id: string) => void
}

export const useJidelnicek = create<JidelnicekState>()(
  persist(
    (set) => ({
      zaznamy: [],

      pridatJidlo: (datum, nazev, kcal) => {
        if (!nazev.trim() || kcal <= 0) return
        set((state) => ({
          zaznamy: [...state.zaznamy, { id: noveId(), datum, nazev: nazev.trim(), kcal }],
        }))
      },

      smazatJidlo: (id) => {
        set((state) => ({ zaznamy: state.zaznamy.filter((z) => z.id !== id) }))
      },
    }),
    {
      name: 'schoolbuddy-jidelnicek-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const saved = persisted as Partial<JidelnicekState> | undefined
        const validace = validateJidelnicekData(saved?.zaznamy)
        return { ...current, zaznamy: validace.success ? validace.data : current.zaznamy }
      },
    }
  )
)
