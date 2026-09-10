import { describe, it, expect } from 'vitest'
import { PomodoroSession, spocitejSouhrnPodlePredmetu } from '@/miniapps/pomodoro/types'
import { spocitejMinutyDnes, spocitejMinutyTyden } from '@/flagships/school-room/skolaCilStats'
import { validateSkolaCilData } from '@/core/utils/skolaCilValidation'

// ==========================================
// Pokrývá věci, co School Room dostal pro "profesionální (vysokoškolské)
// použití": Pomodoro podle předmětu a School Roomův studijní cíl —
// stejná tenká vrstva testů jako Writer Roomovy vlastní kola vylepšení.
// ==========================================

const DNES = new Date('2026-06-15T12:00:00.000Z')
const VCERA: PomodoroSession = { at: new Date('2026-06-14T09:00:00.000Z').getTime(), minuty: 25, predmet: 'Fyzika' }
const dnesniZaznam = (minuty: number, predmet: string | null = null): PomodoroSession => ({
  at: new Date('2026-06-15T08:00:00.000Z').getTime(),
  minuty,
  predmet,
})

describe('spocitejSouhrnPodlePredmetu', () => {
  it('sečte minuty za předmět a seřadí od nejvíc odstudovaného', () => {
    const log: PomodoroSession[] = [
      { at: 1, minuty: 25, predmet: 'Matematika' },
      { at: 2, minuty: 75, predmet: 'Fyzika' },
      { at: 3, minuty: 25, predmet: 'Matematika' },
    ]
    expect(spocitejSouhrnPodlePredmetu(log)).toEqual([
      { predmet: 'Fyzika', minuty: 75 },
      { predmet: 'Matematika', minuty: 50 },
    ])
  })

  it('bloky bez předmětu se sečtou pod null, ne že by zmizely', () => {
    const log: PomodoroSession[] = [
      { at: 1, minuty: 25, predmet: null },
      { at: 2, minuty: 25, predmet: null },
    ]
    expect(spocitejSouhrnPodlePredmetu(log)).toEqual([{ predmet: null, minuty: 50 }])
  })

  it('prázdná historie vrátí prázdné pole', () => {
    expect(spocitejSouhrnPodlePredmetu([])).toEqual([])
  })
})

describe('spocitejMinutyDnes', () => {
  it('sečte jen dnešní bloky, ne včerejší', () => {
    expect(spocitejMinutyDnes([dnesniZaznam(25), dnesniZaznam(30), VCERA], DNES)).toBe(55)
  })

  it('bez žádného dnešního bloku vrátí 0', () => {
    expect(spocitejMinutyDnes([VCERA], DNES)).toBe(0)
  })
})

describe('spocitejMinutyTyden', () => {
  it('sečte posledních 7 dní včetně dneška', () => {
    expect(spocitejMinutyTyden([dnesniZaznam(25), VCERA], DNES)).toBe(50)
  })

  it('blok starší než 7 dní se do týdne nepočítá', () => {
    const starsi: PomodoroSession = { at: new Date('2026-06-01T09:00:00.000Z').getTime(), minuty: 25, predmet: null }
    expect(spocitejMinutyTyden([starsi], DNES)).toBe(0)
  })
})

describe('validateSkolaCilData', () => {
  it('projde platná kladná čísla beze změny', () => {
    const vysledek = validateSkolaCilData({ cilDenniMinut: 60, cilTydenniMinut: 300 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data).toEqual({ cilDenniMinut: 60, cilTydenniMinut: 300 })
  })

  it('null zůstává null (žádný cíl nastaven)', () => {
    const vysledek = validateSkolaCilData({ cilDenniMinut: null, cilTydenniMinut: null })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data).toEqual({ cilDenniMinut: null, cilTydenniMinut: null })
  })

  it('záporné nebo neplatné číslo spadne na null, ne na shozený celý stav', () => {
    const vysledek = validateSkolaCilData({ cilDenniMinut: -10, cilTydenniMinut: 'sto' })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data).toEqual({ cilDenniMinut: null, cilTydenniMinut: null })
  })

  it('chybějící pole spadnou na null', () => {
    const vysledek = validateSkolaCilData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data).toEqual({ cilDenniMinut: null, cilTydenniMinut: null })
  })
})
