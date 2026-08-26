import { describe, it, expect } from 'vitest'
import { resolveActiveThemeId, isKnownThemeId, THEMES, DEFAULT_THEME_ID } from '@/core/theme/themes'

// ==========================================
// Čistá logika výběru vzhledu — core/theme/themes.ts. Ta samá "vyhodnoť
// až při čtení" logika jako core/role/roleUtils.ts's resolveActiveRoleId,
// jen pro VIP kosmetiku místo role.
// ==========================================

describe('resolveActiveThemeId', () => {
  it('volný vzhled se použije bez ohledu na VIP', () => {
    expect(resolveActiveThemeId('nebula', false)).toBe('nebula')
    expect(resolveActiveThemeId('les', false)).toBe('les')
    expect(resolveActiveThemeId('zapad', true)).toBe('zapad')
  })

  it('VIP vzhled se použije jen s oprávněním', () => {
    expect(resolveActiveThemeId('zlata', true)).toBe('zlata')
    expect(resolveActiveThemeId('polarni', true)).toBe('polarni')
  })

  it('VIP vzhled bez oprávnění tiše spadne na výchozí, ne na chybu', () => {
    expect(resolveActiveThemeId('zlata', false)).toBe(DEFAULT_THEME_ID)
    expect(resolveActiveThemeId('polarni', false)).toBe(DEFAULT_THEME_ID)
  })

  it('neplatné id (poškozená záloha) spadne na výchozí', () => {
    // @ts-expect-error — schválně neplatná hodnota, ověřuje běhový fallback
    expect(resolveActiveThemeId('neexistuje', true)).toBe(DEFAULT_THEME_ID)
  })
})

describe('isKnownThemeId', () => {
  it('rozezná platná id', () => {
    for (const id of Object.keys(THEMES)) expect(isKnownThemeId(id)).toBe(true)
  })

  it('odmítne cizí hodnoty', () => {
    expect(isKnownThemeId('neexistuje')).toBe(false)
    expect(isKnownThemeId(null)).toBe(false)
    expect(isKnownThemeId(42)).toBe(false)
  })
})

describe('THEMES katalog', () => {
  it('má přesně 5 vzhledů: 3 volné a 2 pro VIP', () => {
    const vsechny = Object.values(THEMES)
    expect(vsechny).toHaveLength(5)
    expect(vsechny.filter((t) => !t.vip)).toHaveLength(3)
    expect(vsechny.filter((t) => t.vip)).toHaveLength(2)
  })

  it('výchozí vzhled není VIP — nikdo se nesmí zaseknout na uzamčeném', () => {
    expect(THEMES[DEFAULT_THEME_ID].vip).toBe(false)
  })
})
