import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateThemeData } from './themeValidation'
import { DEFAULT_THEME_ID } from './themes'
import type { ThemeId } from './themes'

// ==========================================
// Zvolený vzhled aplikace. Store drží jen VOLBU, ne jestli platí —
// to se vyhodnocuje až při použití (resolveActiveThemeId), stejná
// dělba jako u role/useRoleStore.ts a jejího assignment/validUntil.
// ==========================================

interface ThemeState {
  themeId: ThemeId
  setThemeId: (id: ThemeId) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: DEFAULT_THEME_ID,
      setThemeId: (id) => set({ themeId: id }),
    }),
    {
      name: 'schoolbuddy-theme-storage',
      version: 1,
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validation = validateThemeData(persisted)
        if (!validation.success) return current
        return { ...current, themeId: validation.data.themeId }
      },

      migrate: (persistedState) => {
        const validation = validateThemeData(persistedState)
        return validation.success ? persistedState : { themeId: DEFAULT_THEME_ID }
      },
    }
  )
)
