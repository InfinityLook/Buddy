import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useDailyGoalStore, jeDnesniCilSplnen, DENNI_CIL_ODMENA_XP } from '@/core/store/useDailyGoalStore'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateDailyGoalDatum, validateDailyGoalSplneno } from '@/core/utils/dailyGoalValidation'

// ==========================================
// useDailyGoalStore.ts's jediná skutečná logika je "nejvýš jednou
// denně, ne za každou detekovanou aktivitu" — stejný reset-store vzor
// jako rozcvicka.test.ts (useDailyGoalStore/useGamificationStore
// obojí resetováno v beforeEach, ne mockováno).
// ==========================================

const vychoziGamifikace = useGamificationStore.getState()

const resetStores = () => {
  useDailyGoalStore.setState({ datum: null, splneno: false })
  useGamificationStore.setState({
    xp: 0,
    level: 1,
    streakDays: 0,
    lastActiveDate: null,
    badges: vychoziGamifikace.badges.map((b) => ({ ...b, unlockedAt: null })),
    counters: {},
  })
}

beforeEach(() => {
  resetStores()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-21T18:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDailyGoalStore.oznacitSplneno', () => {
  it('první splnění daného dne připíše bonusové XP', () => {
    useDailyGoalStore.getState().oznacitSplneno()
    expect(useGamificationStore.getState().xp).toBe(DENNI_CIL_ODMENA_XP)
    expect(useDailyGoalStore.getState().datum).toBe('2026-08-21')
    expect(useDailyGoalStore.getState().splneno).toBe(true)
  })

  it('druhé splnění stejného dne je no-op, XP se nepřipočte podruhé', () => {
    useDailyGoalStore.getState().oznacitSplneno()
    useDailyGoalStore.getState().oznacitSplneno()
    expect(useGamificationStore.getState().xp).toBe(DENNI_CIL_ODMENA_XP)
  })

  it('splnění dalšího dne připíše bonus znovu', () => {
    useDailyGoalStore.getState().oznacitSplneno()
    vi.setSystemTime(new Date('2026-08-22T09:00:00'))
    useDailyGoalStore.getState().oznacitSplneno()
    expect(useGamificationStore.getState().xp).toBe(DENNI_CIL_ODMENA_XP * 2)
    expect(useDailyGoalStore.getState().datum).toBe('2026-08-22')
    expect(useDailyGoalStore.getState().splneno).toBe(true)
  })
})

describe('jeDnesniCilSplnen', () => {
  it('true jen když se datum shoduje s dneškem A splneno je true', () => {
    expect(jeDnesniCilSplnen('2026-08-21', true, '2026-08-21')).toBe(true)
  })

  it('false, pokud se uložené datum liší od dneška (nový den)', () => {
    expect(jeDnesniCilSplnen('2026-08-20', true, '2026-08-21')).toBe(false)
  })

  it('false, pokud splneno je false, i když se datum shoduje', () => {
    expect(jeDnesniCilSplnen('2026-08-21', false, '2026-08-21')).toBe(false)
  })

  it('false pro nikdy nenastavené datum (null)', () => {
    expect(jeDnesniCilSplnen(null, false, '2026-08-21')).toBe(false)
  })
})

describe('validateDailyGoalDatum / validateDailyGoalSplneno', () => {
  it('platné datum projde beze změny', () => {
    expect(validateDailyGoalDatum('2026-08-21')).toBe('2026-08-21')
  })

  it('chybějící/null datum spadne na null', () => {
    expect(validateDailyGoalDatum(undefined)).toBeNull()
    expect(validateDailyGoalDatum(null)).toBeNull()
  })

  it('poškozený formát dne (ne YYYY-MM-DD) spadne na null', () => {
    expect(validateDailyGoalDatum('21.8.2026')).toBeNull()
    expect(validateDailyGoalDatum(12345)).toBeNull()
  })

  it('platné splneno projde beze změny', () => {
    expect(validateDailyGoalSplneno(true)).toBe(true)
    expect(validateDailyGoalSplneno(false)).toBe(false)
  })

  it('chybějící nebo špatně typované splneno spadne na false', () => {
    expect(validateDailyGoalSplneno(undefined)).toBe(false)
    expect(validateDailyGoalSplneno('ano')).toBe(false)
  })
})
