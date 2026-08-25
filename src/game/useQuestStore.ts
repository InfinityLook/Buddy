import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateQuestData } from '@/core/utils/questValidation'

// ==========================================
// Postup v questech — účtový stav, ne postava (na rozdíl od
// useGameCharacter.progres). Quest jednou splněný zůstává splněný bez
// ohledu na to, kterou postavou zrovna hraješ, stejně jako badges v
// core/store nejsou vázané na jednu postavu.
//
// Zatím jen dokoncene: string[] — žádný stav "rozpracováno", protože
// vertikální řez má jeden lineární quest bez rozvětvení. Rozšíření na
// aktivní/rozpracované questy přijde, až bude víc než jeden quest na
// hráče najednou.
// ==========================================

interface QuestState {
  dokoncene: string[]
  /** Označí quest za splněný. Klidně voláno vícekrát pro stejné id —
   *  druhé a další volání jsou no-op. */
  dokoncitQuest: (id: string) => void
  jeSplneny: (id: string) => boolean
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      dokoncene: [],

      dokoncitQuest: (id) => {
        if (get().dokoncene.includes(id)) return
        set((state) => ({ dokoncene: [...state.dokoncene, id] }))
      },

      jeSplneny: (id) => get().dokoncene.includes(id),
    }),
    {
      name: 'schoolbuddy-quest-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateQuestData(persisted)
        if (!validace.success) return current
        return { ...current, dokoncene: validace.data.dokoncene }
      },
    }
  )
)
