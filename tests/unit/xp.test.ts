import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getLevelFromXp, getXpForNextLevel, getLevelProgress, checkStreak } from '@/core/utils/gamificationUtils'

// ==========================================
// Čistá logika XP/levelů/streaku — core/utils/gamificationUtils.ts.
// Žádné mockování Supabase/store, jen vstup → výstup, přesně proto je
// první test v pořadí Unit → E2E → Security.
// ==========================================

describe('getLevelFromXp', () => {
  it('začíná na levelu 1 s nulou XP', () => {
    expect(getLevelFromXp(0)).toBe(1)
  })

  it('roste s odmocninou XP, ne lineárně', () => {
    expect(getLevelFromXp(50)).toBe(2)
    expect(getLevelFromXp(200)).toBe(3)
    expect(getLevelFromXp(450)).toBe(4)
  })

  it('velmi malé kladné XP pořád patří do levelu 1', () => {
    expect(getLevelFromXp(1)).toBe(1)
  })
})

describe('getXpForNextLevel', () => {
  it('odpovídá inverzní křivce k getLevelFromXp', () => {
    // Přesně na hranici má být hráč už na daném levelu, ne pod ním.
    const level = 3
    const potrebne = getXpForNextLevel(level - 1)
    expect(getLevelFromXp(potrebne)).toBeGreaterThanOrEqual(level)
  })
})

describe('getLevelProgress', () => {
  it('na začátku levelu je pokrok blízko 0 %', () => {
    const zacatekLevelu2 = getXpForNextLevel(1)
    expect(getLevelProgress(zacatekLevelu2)).toBeLessThanOrEqual(5)
  })

  it('nikdy nepřekročí 100 %', () => {
    expect(getLevelProgress(1_000_000)).toBeLessThanOrEqual(100)
  })

  it('vrací hodnotu mezi 0 a 100 pro běžné XP', () => {
    const pokrok = getLevelProgress(120)
    expect(pokrok).toBeGreaterThanOrEqual(0)
    expect(pokrok).toBeLessThanOrEqual(100)
  })
})

describe('checkStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('první aktivita nastaví streak na 1', () => {
    const v = checkStreak(null, 0)
    expect(v.newStreak).toBe(1)
    expect(v.todayFormatted).toBe('2026-08-21')
  })

  it('aktivita znovu ve stejný den streak nezmění', () => {
    const v = checkStreak('2026-08-21', 5)
    expect(v.newStreak).toBe(5)
  })

  it('aktivita den po dni streak prodlouží', () => {
    const v = checkStreak('2026-08-20', 5)
    expect(v.newStreak).toBe(6)
  })

  it('vynechaný den streak resetuje na 1', () => {
    const v = checkStreak('2026-08-18', 7)
    expect(v.newStreak).toBe(1)
  })
})
