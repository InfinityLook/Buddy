import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { isBuddyThemeId, isSurfaceId, type BuddyThemeId, type SurfaceId } from './themeCatalog'
import { createDefaultPreferences, sanitizePreferences, withSurfaceOverride, type ThemePreferences } from './themePreferences'

interface AppearanceState extends ThemePreferences {
  setGlobalTheme: (theme: BuddyThemeId) => void
  setSurfaceTheme: (surface: SurfaceId, theme: BuddyThemeId | null) => void
  setSurfaceScenery: (surface: SurfaceId, enabled: boolean | null) => void
  resetAppearance: () => void
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      ...createDefaultPreferences(),
      setGlobalTheme: (theme) => { if (isBuddyThemeId(theme)) set({ globalThemeId: theme }) },
      setSurfaceTheme: (surface, theme) => {
        if (isSurfaceId(surface) && (theme === null || isBuddyThemeId(theme))) {
          set((state) => withSurfaceOverride(state, surface, theme))
        }
      },
      setSurfaceScenery: (surface, enabled) => {
        if (!isSurfaceId(surface) || (enabled !== null && typeof enabled !== 'boolean')) return
        set((state) => {
          const overrides = { ...state.sceneryOverrides }
          if (enabled === null) delete overrides[surface]
          else overrides[surface] = enabled
          return { sceneryOverrides: overrides }
        })
      },
      resetAppearance: () => set(createDefaultPreferences()),
    }),
    {
      name: 'buddy-appearance-storage', version: 2,
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ globalThemeId: state.globalThemeId,
        surfaceOverrides: state.surfaceOverrides, sceneryOverrides: state.sceneryOverrides }),
      migrate: (persisted: unknown) => sanitizePreferences(persisted),
      merge: (persisted: unknown, current) => ({ ...current, ...sanitizePreferences(persisted) }),
    },
  ),
)
