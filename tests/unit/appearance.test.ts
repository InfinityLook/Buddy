import { describe, expect, it } from 'vitest'
import { isBuddyThemeId, isSurfaceId, ROOM_BY_ROUTE, SURFACE_IDS, SURFACES, THEME_IDS } from '@/features/appearance/themeCatalog'
import { createDefaultPreferences, resolveSurfaceScenery, resolveSurfaceTheme, sanitizePreferences, withSurfaceOverride } from '@/features/appearance/themePreferences'

describe('appearance preferences and inheritance', () => {
  it('falls back for null, arrays and unknown values', () => {
    for (const input of [null, [], 'x', undefined, { globalThemeId: 'unknown' }]) {
      expect(sanitizePreferences(input)).toEqual(createDefaultPreferences())
    }
  })
  it('keeps valid persisted overrides and discards poisoned or obsolete keys', () => {
    expect(sanitizePreferences({ globalThemeId: 'cisty-den', surfaceOverrides: JSON.parse('{"study-planner":"lesni-klid","unknown":"cisty-den","constructor":"neonova-noc","__proto__":"zlaty-soumrak","finance":"bogus"}'), sceneryOverrides: { finance: true, 'quick-notes': 'yes', obsolete: false } })).toEqual({ globalThemeId: 'cisty-den', surfaceOverrides: { 'study-planner': 'lesni-klid' }, sceneryOverrides: { finance: true } })
  })
  it('lets global changes reach inherited surfaces and preserves an explicit override', () => {
    const p = withSurfaceOverride(createDefaultPreferences(), 'finance', 'lesni-klid')
    p.globalThemeId = 'cisty-den'
    expect(resolveSurfaceTheme(p, 'finance')).toBe('lesni-klid')
    expect(resolveSurfaceTheme(p, 'quick-notes')).toBe('cisty-den')
  })
  it('resetting an override restores inheritance without mutating the input', () => {
    const original = withSurfaceOverride(createDefaultPreferences(), 'finance', 'lesni-klid')
    const updated = withSurfaceOverride(original, 'finance', null)
    expect(resolveSurfaceTheme(updated, 'finance')).toBe('zlaty-soumrak')
    expect(original.surfaceOverrides.finance).toBe('lesni-klid')
  })
  it('never derives a shared miniapp choice from the Room used to open it', () => {
    const p = withSurfaceOverride(createDefaultPreferences(), 'growth-room', 'neonova-noc')
    expect(resolveSurfaceTheme(p, 'quick-notes')).toBe('zlaty-soumrak')
  })
  it('defaults to atmospheric Rooms and quiet apps, with independent scenery overrides', () => {
    const p = createDefaultPreferences()
    expect(resolveSurfaceScenery(p, 'school-room')).toBe(true)
    expect(resolveSurfaceScenery(p, 'document-editor')).toBe(false)
    p.sceneryOverrides['school-room'] = false
    p.sceneryOverrides['document-editor'] = true
    expect(resolveSurfaceScenery(p, 'school-room')).toBe(false)
    expect(resolveSurfaceScenery(p, 'document-editor')).toBe(true)
  })
  it('has 73 unique surfaces and exactly 365 complete combinations', () => {
    expect(new Set(SURFACE_IDS).size).toBe(73)
    expect(SURFACE_IDS.filter((id) => SURFACES[id].kind === 'room')).toHaveLength(6)
    expect(SURFACE_IDS.filter((id) => SURFACES[id].kind === 'app')).toHaveLength(24)
    const keys = SURFACE_IDS.flatMap((id) => THEME_IDS.map((theme) => SURFACES[id].variants[theme].id))
    expect(new Set(keys).size).toBe(365)
  })
  it('rejects prototype properties as IDs', () => {
    for (const key of ['constructor', '__proto__', 'toString', 'unknown']) {
      expect(isBuddyThemeId(key)).toBe(false)
      expect(isSurfaceId(key)).toBe(false)
    }
  })
  it('covers the six actual Room routes', () => {
    expect(Object.keys(ROOM_BY_ROUTE)).toEqual(['/skola', '/fitness', '/economy', '/growth', '/music', '/spisovatel'])
    expect(Object.values(ROOM_BY_ROUTE).every(isSurfaceId)).toBe(true)
  })
})
