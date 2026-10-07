import { describe, it, expect, beforeEach } from 'vitest'
import { useStreakWarningStore } from '@/core/store/useStreakWarningStore'

// ==========================================
// Krok 14e — pure jádro (melaByUpozornitNaKonecSerie) se testuje v
// xp.test.ts, protože žije v gamificationUtils.ts. Samotný
// core/streakWarningReminder.ts (glue soubor, co importuje notify.ts)
// zůstává neotestovaný, přesně stejná diskplína jako u
// fitnessReminders.ts/rozvrhReminders.ts — tady testuje jen ten malý
// store, co appka používá k odstínění opakovaného upozornění.
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
