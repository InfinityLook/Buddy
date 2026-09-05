import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { MAX_HISTORIE, validateSoubojStatistikyData } from '@/core/utils/soubojStatistikyValidation'
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

/** Deváté kolo vylepšení — historie posledních zápasů, čistě na
 *  tomhle zařízení (stejný důvod jako `vysledky` výš — appka tu nemá
 *  jinou identitu hráče než volenou postavu, a TV k tomuhle úložišti
 *  vůbec nemá přístup). Na rozdíl od `vysledky` (sečtená čísla za
 *  celou historii) tohle je poslední MAX_HISTORIE jednotlivých
 *  zápasů v pořadí od nejnovějšího — appka záměrně neukládá soupeřovu
 *  postavu (Ovladac.tsx's konecZapasu handler ji vůbec nezná, network
 *  ani KonecZapasuPayload ji nikdy neposílaly), jen svou vlastní
 *  postavu, výsledek a čas. */
export interface SoubojHistorieZaznam {
  postavaId: PostavaId
  vysledek: 'vyhra' | 'prohra' | 'remiza'
  kdy: number
}

interface SoubojStatistikyState {
  vysledky: Partial<Record<PostavaId, SoubojZaznam>>
  historie: SoubojHistorieZaznam[]
  zaznamenejVysledek: (postavaId: PostavaId, vysledek: 'vyhra' | 'prohra' | 'remiza') => void
}

const PRAZDNY_ZAZNAM: SoubojZaznam = { vyhry: 0, prohry: 0, remizy: 0 }

export const useSoubojStatistikyStore = create<SoubojStatistikyState>()(
  persist(
    (set) => ({
      vysledky: {},
      historie: [],

      zaznamenejVysledek: (postavaId, vysledek) => {
        set((state) => {
          const soucasny = state.vysledky[postavaId] ?? PRAZDNY_ZAZNAM
          const klic = vysledek === 'vyhra' ? 'vyhry' : vysledek === 'prohra' ? 'prohry' : 'remizy'
          const zaznam: SoubojHistorieZaznam = { postavaId, vysledek, kdy: Date.now() }
          return {
            vysledky: {
              ...state.vysledky,
              [postavaId]: { ...soucasny, [klic]: soucasny[klic] + 1 },
            },
            // Nejnovější první, oříznuto na MAX_HISTORIE — appka
            // nechce neomezeně rostoucí pole v secureStorage, a "co
            // se hrálo před pěti sty zápasy" stejně nikoho nezajímá.
            historie: [zaznam, ...state.historie].slice(0, MAX_HISTORIE),
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
