import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateGameCharacterData } from '@/core/utils/gameCharacterValidation'
import { PostavaId } from './types'

// ==========================================
// Vytvořené postavy. Vlastní úložiště, mimo core/store — je to herní
// stav, ne něco, co potřebuje zbytek appky (stejná konvence jako
// usePomodoro.ts ve svém miniapp).
//
// Dřív šlo jen o jedno natrvalo zvolené id; teď appka drží celou
// rozehranou "partu" — kterékoli z pěti postav si hráč může vytvořit
// (a zase smazat), a při každém vstupu do hry si vybírá, za koho
// tentokrát hraje (viz GameModule.tsx — ta volba samotná se nikam
// neukládá, žije jen jako React state po dobu jedné návštěvy /hra).
// ==========================================

interface GameCharacterState {
  postavy: PostavaId[]
  /** Přidá postavu do party. Když už tam je, nic se nestane. */
  vytvoritPostavu: (id: PostavaId) => void
  /** Odebere postavu z party. Nemaže žádný jiný postup — XP, kredity
   *  i odznaky jsou sdílené napříč postavami, ne vázané na jednu. */
  smazatPostavu: (id: PostavaId) => void
}

export const useGameCharacter = create<GameCharacterState>()(
  persist(
    (set, get) => ({
      postavy: [],

      vytvoritPostavu: (id) => {
        if (get().postavy.includes(id)) return
        set((state) => ({ postavy: [...state.postavy, id] }))
      },

      smazatPostavu: (id) => {
        set((state) => ({ postavy: state.postavy.filter((p) => p !== id) }))
      },
    }),
    {
      name: 'schoolbuddy-game-character-storage',
      version: 2,
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateGameCharacterData(persisted)
        if (!validace.success) return current
        return { ...current, postavy: validace.data.postavy }
      },

      // Starší appka (verze 1) ukládala jediné { postavaId }. Kdo si
      // postavu už vybral, o ni tímhle přechodem nepřijde — stane se
      // prvním členem jeho nové party místo toho, aby appka mlčky
      // začínala od nuly.
      migrate: (persistedState, verze) => {
        if (verze < 2 && persistedState && typeof persistedState === 'object' && 'postavaId' in persistedState) {
          const stary = (persistedState as { postavaId: unknown }).postavaId
          return { postavy: typeof stary === 'string' ? [stary] : [] }
        }
        const validace = validateGameCharacterData(persistedState)
        return validace.success ? validace.data : { postavy: [] }
      },
    }
  )
)
