import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validatePosilovnaData } from '@/core/utils/posilovnaValidation'
import type { PosilovaciSezeni, CvikVSezeni, SablonaTreninku } from './types'

const XP_ZA_SEZENI = 20

// Hand-checked odznak za nejtěžší JEDNU sérii kdy zaznamenanou napříč
// celou historií — nevejde se do COUNT_BADGES's jednoduchého "kolikáté
// volání" tvaru (appka nesleduje, kolikrát byla váha překročena, jen
// jestli byla), stejný důvod jako maratonec/stovkar jinde v appce.
const SILAK_PRAH_KG = 100

interface PosilovnaState {
  sezeni: PosilovaciSezeni[]
  sablony: SablonaTreninku[]
  /** Vrátí id nově uloženého sezení. */
  pridatSezeni: (cviky: CvikVSezeni[], poznamka: string) => string
  smazatSezeni: (id: string) => void
  ulozitSablonu: (nazev: string, cviky: string[]) => void
  smazatSablonu: (id: string) => void
}

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const usePosilovna = create<PosilovnaState>()(
  persist(
    (set) => ({
      sezeni: [],
      sablony: [],

      pridatSezeni: (cviky, poznamka) => {
        const nove: PosilovaciSezeni = {
          id: noveId(),
          cviky,
          poznamka,
          createdAt: new Date().toISOString(),
        }

        set((state) => ({ sezeni: [nove, ...state.sezeni] }))

        useGamificationStore.getState().recordAction('posilovna', XP_ZA_SEZENI)

        const zvedlSilak = cviky.some((c) => c.serie.some((s) => s.vahaKg >= SILAK_PRAH_KG))
        if (zvedlSilak) {
          useGamificationStore.getState().unlockBadge('silak')
        }

        return nove.id
      },

      smazatSezeni: (id) => set((state) => ({ sezeni: state.sezeni.filter((s) => s.id !== id) })),

      // Šablona nese jen jména cviků, žádná čísla — appka je znovu
      // naplní do sestavovače (Posilovna.tsx's pridatCvik), uživatel
      // pak zadá dnešní váhy/opakování sám, stejně jako u kteréhokoli
      // ručně přidaného cviku.
      ulozitSablonu: (nazev, cviky) => {
        const nova: SablonaTreninku = { id: noveId(), nazev, cviky }
        set((state) => ({ sablony: [nova, ...state.sablony] }))
      },

      smazatSablonu: (id) => set((state) => ({ sablony: state.sablony.filter((s) => s.id !== id) })),
    }),
    {
      name: 'schoolbuddy-posilovna-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validatePosilovnaData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)
