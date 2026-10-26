// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AppearancePicker } from '@/features/appearance/AppearancePicker'
import { getBadgeArtwork } from '@/features/appearance/BadgeThemeIcon'
import { BADGE_ARTWORK } from '@/features/appearance/badgeCatalog'
import { resolveModuleSurface } from '@/features/appearance/moduleThemeRouting'
import { createDefaultPreferences, resolveSurfaceTheme, withSurfaceOverride } from '@/features/appearance/themePreferences'
import { SurfaceBackdrop } from '@/features/appearance/SurfaceAppearance'
import { useAppearanceStore } from '@/features/appearance/useAppearanceStore'

afterEach(() => { cleanup(); useAppearanceStore.getState().resetAppearance() })

describe('module hierarchy, views and art', () => {
  it('inherits the settings theme across its subviews while preserving an individual subview override', () => {
    const prefs = withSurfaceOverride(createDefaultPreferences(), 'settings', 'cisty-den')
    expect(resolveSurfaceTheme(prefs, 'settings-security')).toBe('cisty-den')
    const own = withSurfaceOverride(prefs, 'settings-security', 'neonova-noc')
    expect(resolveSurfaceTheme(own, 'settings-security')).toBe('neonova-noc')
    expect(resolveSurfaceTheme(own, 'settings-sound')).toBe('cisty-den')
  })
  it('follows a two-level chat hierarchy and the existing School Room choice', () => {
    const prefs = withSurfaceOverride(withSurfaceOverride(createDefaultPreferences(), 'social-home', 'lesni-klid'), 'school-room', 'polarni-zare')
    expect(resolveSurfaceTheme(prefs, 'secret-chat')).toBe('lesni-klid')
    expect(resolveSurfaceTheme(prefs, 'school-stats')).toBe('polarni-zare')
  })
  it('lets common dialogs inherit the actual invoker rather than the unrelated Profile', () => {
    const prefs = withSurfaceOverride(withSurfaceOverride(createDefaultPreferences(), 'profile', 'cisty-den'), 'school-room', 'neonova-noc')
    expect(resolveSurfaceTheme(prefs, 'notifications', 'school-room')).toBe('neonova-noc')
    expect(resolveSurfaceTheme(prefs, 'notifications')).toBe('cisty-den')
    expect(resolveSurfaceTheme(prefs, 'public-profile', 'feed')).toBe('zlaty-soumrak')
  })
  it('does not loop when a dialog mistakenly names itself as caller', () => {
    expect(resolveSurfaceTheme(createDefaultPreferences(), 'notifications', 'notifications')).toBe('zlaty-soumrak')
  })
  it('maps actual module states without inventing new URLs', () => {
    expect(resolveModuleSurface('/social', { socialTab: 'chaty' })).toBe('chat-list')
    expect(resolveModuleSurface('/social', { chatOpen: true })).toBe('chat-conversation')
    expect(resolveModuleSurface('/social', { secretChatOpen: true })).toBe('secret-chat')
    expect(resolveModuleSurface('/nastaveni', { settingsSection: 'zvuk' })).toBe('settings-sound')
    expect(resolveModuleSurface('/admin', { adminSection: 'konzole' })).toBe('admin-console')
    expect(resolveModuleSurface('/podpora', { supportDetail: true })).toBe('support-conversation')
    expect(resolveModuleSurface('/buddy-world', { worldView: 'hud' })).toBe('buddyworld-hud')
  })
  it('keeps approved Hub handling, hidden games and unknown routes outside this adapter', () => {
    for (const path of ['/hub', '/hra', '/hra/buddyheim', '/hra/souboj', '/missing', 'constructor', '__proto__']) expect(resolveModuleSurface(path)).toBeNull()
    expect(resolveModuleSurface('/apps', { activeAppId: 'profile' })).toBe('apps-launcher')
    expect(resolveModuleSurface('/apps', { activeAppId: 'finance' })).toBe('finance')
    expect(resolveModuleSurface('/nastaveni', { settingsSection: 'constructor' })).toBe('settings')
  })
  it('supplies 47 existing badge IDs and never substitutes unlocked art for locked or unknown IDs', () => {
    expect(Object.keys(BADGE_ARTWORK)).toHaveLength(47)
    expect(getBadgeArtwork('first_step', 'cisty-den', true)).toContain('/first_step.svg')
    for (const id of ['first_step', 'constructor', '__proto__', 'unknown']) expect(getBadgeArtwork(id, 'cisty-den', false)).toContain('/locked.svg')
    expect(getBadgeArtwork('constructor', 'cisty-den', true)).toContain('/locked.svg')
  })
  it('never adds a background over the game canvas even when scenery is requested', () => {
    useAppearanceStore.getState().setSurfaceScenery('buddyworld-hud', true)
    expect(render(<SurfaceBackdrop surfaceId="buddyworld-hud" />).container.childElementCount).toBe(0)
  })
  it('hides admin customization from the ordinary picker and respects caller-provided permissions', () => {
    const view = render(<AppearancePicker />)
    expect(screen.queryByRole('option', { name: 'Administrace' })).toBeNull()
    view.rerender(<AppearancePicker availablePermissions={['moderation.content']} />)
    expect(screen.getByRole('option', { name: 'Administrace' })).toBeDefined()
  })
  it('migrates the version 1 appearance preferences while retaining content-independent choices', async () => {
    const old = { globalThemeId: 'cisty-den', surfaceOverrides: { finance: 'lesni-klid' }, sceneryOverrides: { 'school-room': false } }
    const migrated = await useAppearanceStore.persist.getOptions().migrate?.(old, 1)
    expect(migrated).toEqual(old)
  })
})
