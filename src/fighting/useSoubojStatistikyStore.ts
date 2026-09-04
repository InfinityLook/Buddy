import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateSoubojStatistikyData } from '@/core/utils/soubojStatistikyValidation'
import type { PostavaId } from './combat/postavy'

// ==========================================
// Vylepšení — statistiky odehraných zápasů Souboje, čistě per-
// -zařízení (stejný důvod jako XP/kredity za zápas, viz Ovladac.tsx's
// konecZapasu handler — gamifikace je secureStorage stav v prohlížeči,
// TV k ní nemá přístup). Zaznamenává se výhra/prohra/remíza podle
// POSTAVY, kterou hráč hrál — ne podle zařízení samotného, appka
// nemá jinou identitu hráče než tu volenou postavu.
// ==========================================

interface SoubojZaznam {
  vyhry: number
  prohry: number
  remizy: number
}

interface SoubojStatistikyState {
  vysledky: Partial<Record<PostavaId, SoubojZaznam>>
  zaznamenejVysledek: (postavaId: PostavaId, vysledek: 'vyhra' | 'prohra' | 'remiza') => void
}

const PRAZDNY_ZAZNAM: SoubojZaznam = { vyhry: 0, prohry: 0, remizy: 0 }

export const useSoubojStatistikyStore = create<SoubojStatistikyState>()(
  persist(
    (set) => ({
      vysledky: {},

      zaznamenejVysledek: (postavaId, vysledek) => {
        set((state) => {
          const soucasny = state.vysledky[postavaId] ?? PRAZDNY_ZAZNAM
          const klic = vysledek === 'vyhra' ? 'vyhry' : vysledek === 'prohra' ? 'prohry' : 'remizy'
          return {
            vysledky: {
              ...state.vysledky,
              [postavaId]: { ...soucasny, [klic]: soucasny[klic] + 1 },
            },
          }
        })
      },
    }),
    {
      name: 'schoolbuddy-souboj-statistiky-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateSoubojStatistikyData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)
