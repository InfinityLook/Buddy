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
 *  zápasů v pořadí od nejnovějšího.
 *
 *  Jedenácté kolo vylepšení přidalo `souperId?` — dřív appka soupeřovu
 *  postavu vůbec neznala (network/KonecZapasuPayload ji neposílaly),
 *  teď TV (jediná strana, co OBĚ postavy doopravdy zná — obě prošly
 *  její vlastní "VS" obrazovkou) rozešle obě jména spolu s výsledkem —
 *  žádné nové soukromí to neotvírá, oba hráči už se navzájem viděli
 *  na "VS" obrazovce, než zápas vůbec začal. Nepovinné (`?`), protože
 *  sólo režim proti počítači souperId posílá taky (AI má svou vlastní
 *  postavu), ale appka nechtěla dělat migraci pro starší uložené
 *  záznamy bez něj. */
export interface SoubojHistorieZaznam {
  postavaId: PostavaId
  souperId?: PostavaId
  vysledek: 'vyhra' | 'prohra' | 'remiza'
  kdy: number
}

interface SoubojStatistikyState {
  vysledky: Partial<Record<PostavaId, SoubojZaznam>>
  historie: SoubojHistorieZaznam[]
  /** Jedenácté kolo vylepšení — "rival" statistiky. Vnořený záznam
   *  [vlastní postava][soupeřova postava] → výhry/prohry/remízy proti
   *  právě TÉ dvojici — appka to drží jako druhou, oddělenou strukturu
   *  od `vysledky` (celkové součty bez ohledu na soupeře), ne že by
   *  `vysledky` přepočítávala z týhle — obě mají jinou otázku, na
   *  kterou odpovídají ("jak mi to jde celkově" vs. "jak mi to jde
   *  PROTI TÉHLE konkrétní postavě"). */
  zapasyProtiPostavam: Partial<Record<PostavaId, Partial<Record<PostavaId, SoubojZaznam>>>>
  zaznamenejVysledek: (postavaId: PostavaId, vysledek: 'vyhra' | 'prohra' | 'remiza', souperId?: PostavaId) => void
  /** Dvanácté kolo vylepšení — Žebříček (Zebricek.tsx). Nejvyšší vlna,
   *  jakou appka kdy na tomhle zařízení přežila — appka ji jen
   *  ZVYŠUJE, nikdy nesnižuje (viz zaznamenejVlnuZebricku samo),
   *  stejná "rekord se dá jen překonat" logika, jakou appka jinde
   *  nemá potřebu opakovat, protože žádný jiný odznak/statistika
   *  takhle nefunguje. */
  nejlepsiVlnaZebricku: number
  zaznamenejVlnuZebricku: (vlna: number) => void
}

const PRAZDNY_ZAZNAM: SoubojZaznam = { vyhry: 0, prohry: 0, remizy: 0 }

export const useSoubojStatistikyStore = create<SoubojStatistikyState>()(
  persist(
    (set) => ({
      vysledky: {},
      historie: [],
      zapasyProtiPostavam: {},
      nejlepsiVlnaZebricku: 0,

      zaznamenejVlnuZebricku: (vlna) => {
        set((state) => ({ nejlepsiVlnaZebricku: Math.max(state.nejlepsiVlnaZebricku, vlna) }))
      },

      zaznamenejVysledek: (postavaId, vysledek, souperId) => {
        set((state) => {
          const soucasny = state.vysledky[postavaId] ?? PRAZDNY_ZAZNAM
          const klic = vysledek === 'vyhra' ? 'vyhry' : vysledek === 'prohra' ? 'prohry' : 'remizy'
          const zaznam: SoubojHistorieZaznam = { postavaId, souperId, vysledek, kdy: Date.now() }

          let zapasyProtiPostavam = state.zapasyProtiPostavam
          if (souperId) {
            const protiTemuto = state.zapasyProtiPostavam[postavaId]?.[souperId] ?? PRAZDNY_ZAZNAM
            zapasyProtiPostavam = {
              ...state.zapasyProtiPostavam,
              [postavaId]: {
                ...state.zapasyProtiPostavam[postavaId],
                [souperId]: { ...protiTemuto, [klic]: protiTemuto[klic] + 1 },
              },
            }
          }

          return {
            vysledky: {
              ...state.vysledky,
              [postavaId]: { ...soucasny, [klic]: soucasny[klic] + 1 },
            },
            zapasyProtiPostavam,
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
