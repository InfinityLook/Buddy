import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateQuestData } from '@/core/utils/questValidation'
import { QUESTS } from './data/quests'

export type StavQuestu = 'nedostupny' | 'aktivni' | 'splneny'

// ==========================================
// Postup v questech — účtový stav, ne postava (na rozdíl od
// useGameCharacter.progres). Quest jednou splněný zůstává splněný bez
// ohledu na to, kterou postavou zrovna hraješ, stejně jako badges v
// core/store nejsou vázané na jednu postavu.
//
// Fáze 2 (quest engine): quest má teď výslovný životní cyklus —
// nedostupný (hráč ho ještě nepřijal) -> aktivní (přijatý, cíle se
// plní) -> splněný (všechny cíle hotové). splneneCile je klíčovaný
// podle questId, ne plochý přes všechny questy — dva různé questy by
// jinak mohly mít cíl se stejným id a splnění jednoho by tiše
// odškrtlo i ten druhý.
//
// stavQuestu/jeCilSplneny jsou schválně VNĚ storu, jako čisté funkce
// nad jeho syrovým stavem — ne store metody volající get() uvnitř.
// Metoda, co si stav čte sama přes get(), je stabilní reference přes
// celou dobu života storu, takže by useQuestStore((s) => s.stavQuestu)
// nikdy nevyvolal re-render, i když se aktivni/dokoncene doopravdy
// změnily (Zustand re-renderuje jen když se změní VYBRANÁ hodnota, a
// funkce samotná se nemění). Komponenty proto musí selectovat syrová
// pole (aktivni/dokoncene/splneneCile) a spočítat stav samy přes
// tyhle helpery — to je taky proč jsou to čisté funkce, testovatelné
// bez storu, stejný vzor jako combat/leveling.ts.
// ==========================================

export const stavQuestu = (questId: string, aktivni: string[], dokoncene: string[]): StavQuestu => {
  if (dokoncene.includes(questId)) return 'splneny'
  if (aktivni.includes(questId)) return 'aktivni'
  return 'nedostupny'
}

export const jeCilSplneny = (questId: string, cilId: string, splneneCile: Record<string, string[]>): boolean =>
  (splneneCile[questId] ?? []).includes(cilId)

interface QuestState {
  /** Přijaté, ale ještě nesplněné questy. */
  aktivni: string[]
  dokoncene: string[]
  /** Splněné cíle podle questu — klíč je questId. */
  splneneCile: Record<string, string[]>

  /** Přijme quest — no-op, pokud je už přijatý nebo splněný. */
  prijmoutQuest: (questId: string) => void
  /** Označí cíl za splněný; pokud tím byl splněný poslední cíl
   *  questu, přesune celý quest z aktivni do dokoncene. Klidně voláno
   *  vícekrát pro stejný cíl — druhé a další volání jsou no-op. */
  splnitCil: (questId: string, cilId: string) => void
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      aktivni: [],
      dokoncene: [],
      splneneCile: {},

      prijmoutQuest: (questId) => {
        const s = get()
        if (s.aktivni.includes(questId) || s.dokoncene.includes(questId)) return
        set((state) => ({ aktivni: [...state.aktivni, questId] }))
      },

      splnitCil: (questId, cilId) => {
        const quest = QUESTS.find((q) => q.id === questId)
        if (!quest) return

        set((state) => {
          if (state.dokoncene.includes(questId)) return state

          const jizSplnene = state.splneneCile[questId] ?? []
          if (jizSplnene.includes(cilId)) return state

          const noveSplnene = [...jizSplnene, cilId]
          const vsechnySplneny = quest.cile.every((c) => noveSplnene.includes(c.id))

          return {
            splneneCile: { ...state.splneneCile, [questId]: noveSplnene },
            aktivni: vsechnySplneny ? state.aktivni.filter((id) => id !== questId) : state.aktivni,
            dokoncene: vsechnySplneny ? [...state.dokoncene, questId] : state.dokoncene,
          }
        })
      },
    }),
    {
      name: 'schoolbuddy-quest-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateQuestData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)
