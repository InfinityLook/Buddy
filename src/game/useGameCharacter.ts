import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateGameCharacterData } from '@/core/utils/gameCharacterValidation'
import { PostavaId } from './types'

// ==========================================
// Zvolená postava. Vlastní úložiště, mimo core/store — je to herní
// stav, ne něco, co potřebuje zbytek appky (stejná konvence jako
// usePomodoro.ts ve svém miniapp).
//
// Zatím drží jen id — jakmile budou existovat karty, souboje a obchod,
// přibude sem výdrž, získané karty apod. Výběr se ptá jen jednou:
// jakmile postavaId není null, GameModule přeskočí tvorbu postavy
// a jde rovnou na mapu.
// ==========================================

interface GameCharacterState {
  postavaId: PostavaId | null
  zvolit: (id: PostavaId) => void
}

export const useGameCharacter = create<GameCharacterState>()(
  persist(
    (set) => ({
      postavaId: null,
      zvolit: (id) => set({ postavaId: id }),
    }),
    {
      name: 'schoolbuddy-game-character-storage',
      version: 1,
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validation = validateGameCharacterData(persisted)
        if (!validation.success) return current
        return { ...current, postavaId: validation.data.postavaId }
      },

      migrate: (persistedState) => {
        const validation = validateGameCharacterData(persistedState)
        return validation.success ? persistedState : { postavaId: null }
      },
    }
  )
)
