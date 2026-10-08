import { describe, it, expect, beforeEach } from 'vitest'
import { useStreakWarningStore } from '@/core/store/useStreakWarningStore'
import { validateDailyGoalDatum } from '@/core/utils/dailyGoalValidation'

// ==========================================
// Krok 14e — pure jádro (melaByUpozornitNaKonecSerie) se testuje v
// xp.test.ts, protože žije v gamificationUtils.ts. Samotný
// core/streakWarningReminder.ts (glue soubor, co importuje notify.ts)
// zůstává neotestovaný, přesně stejná diskplína jako u
// fitnessReminders.ts/rozvrhReminders.ts — tady testuje jen ten malý
// store, co appka používá k odstínění opakovaného upozornění.
//
// validateDailyGoalDatum appka testuje tady, ne ve zvláštním souboru —
// od Hubova "Dnešního cíle" (jeho vlastního daily-goal.test.ts, appka
// ho smazala spolu s celou tou kartou) tenhle validátor zdědila, ale
// jediný, kdo ho dnes doopravdy používá, je useStreakWarningStore.ts
// výš (viz appčin vlastní komentář tam).
// ==========================================

describe('useStreakWarningStore', () => {
  beforeEach(() => {
    useStreakWarningStore.setState({ posledniUpozorneneDatum: null })
  })

  it('výchozí stav je bez upozornění', () => {
    expect(useStreakWarningStore.getState().posledniUpozorneneDatum).toBeNull()
  })

  it('oznacUpozorneno zapíše datum', () => {
    useStreakWarningStore.getState().oznacUpozorneno('2026-08-21')
    expect(useStreakWarningStore.getState().posledniUpozorneneDatum).toBe('2026-08-21')
  })

  it('opakované zavolání přepíše na nové datum', () => {
    useStreakWarningStore.getState().oznacUpozorneno('2026-08-21')
    useStreakWarningStore.getState().oznacUpozorneno('2026-08-22')
    expect(useStreakWarningStore.getState().posledniUpozorneneDatum).toBe('2026-08-22')
  })
})

describe('validateDailyGoalDatum', () => {
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
})
