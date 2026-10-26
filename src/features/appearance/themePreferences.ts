import { DEFAULT_BUDDY_THEME, isBuddyThemeId, isSurfaceId, SURFACES, type BuddyThemeId, type SurfaceId } from './themeCatalog'

export interface ThemePreferences {
  globalThemeId: BuddyThemeId
  surfaceOverrides: Partial<Record<SurfaceId, BuddyThemeId>>
  sceneryOverrides: Partial<Record<SurfaceId, boolean>>
}

export const createDefaultPreferences = (): ThemePreferences => ({
  globalThemeId: DEFAULT_BUDDY_THEME, surfaceOverrides: {}, sceneryOverrides: {},
})

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {}

/** Only known IDs and booleans survive persisted-state hydration. */
export const sanitizePreferences = (value: unknown): ThemePreferences => {
  const source = record(value)
  const result = createDefaultPreferences()
  if (isBuddyThemeId(source.globalThemeId)) result.globalThemeId = source.globalThemeId
  for (const [id, theme] of Object.entries(record(source.surfaceOverrides))) {
    if (isSurfaceId(id) && isBuddyThemeId(theme)) result.surfaceOverrides[id] = theme
  }
  for (const [id, enabled] of Object.entries(record(source.sceneryOverrides))) {
    if (isSurfaceId(id) && typeof enabled === 'boolean') result.sceneryOverrides[id] = enabled
  }
  return result
}

/** Shared miniapps keep global inheritance; module subviews inherit their owning module. */
export const resolveSurfaceTheme = (preferences: ThemePreferences, id: SurfaceId, caller?: SurfaceId): BuddyThemeId => {
  const visited = new Set<SurfaceId>()
  let current: SurfaceId | null = id
  while (current !== null && !visited.has(current)) {
    visited.add(current)
    const explicit = preferences.surfaceOverrides[current]
    if (explicit) return explicit
    const surface: { inheritFromCaller: boolean; themeParent: string | null } = SURFACES[current]
    const parent: string | null = surface.inheritFromCaller && caller && !visited.has(caller)
      ? caller : surface.themeParent
    current = isSurfaceId(parent) ? parent : null
  }
  return preferences.globalThemeId
}

export const resolveSurfaceScenery = (preferences: ThemePreferences, id: SurfaceId): boolean =>
  preferences.sceneryOverrides[id] ?? SURFACES[id].defaultScenery

export const withSurfaceOverride = (preferences: ThemePreferences, id: SurfaceId, theme: BuddyThemeId | null): ThemePreferences => {
  const overrides = { ...preferences.surfaceOverrides }
  if (theme === null) delete overrides[id]
  else overrides[id] = theme
  return { ...preferences, surfaceOverrides: overrides }
}
