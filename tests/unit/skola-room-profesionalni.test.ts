import { describe, it, expect } from 'vitest'
import { PomodoroSession, spocitejSouhrnPodlePredmetu } from '@/miniapps/pomodoro/types'
import { spocitejMinutyDnes, spocitejMinutyTyden } from '@/flagships/school-room/skolaCilStats'
// spocitejProcentaCileProumeru se přesunula do znamky/types.ts — je to
// obecná funkce o klasifikační známce, ne o School Roomu samotném, a
// miniaplikace nesmí importovat z vlajkové appky (viz jeho vlastní
// komentář v znamky/types.ts).
import { spocitejProcentaCileProumeru } from '@/miniapps/znamky/types'
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

describe('spocitejProcentaCileProumeru', () => {
  it('bez nastaveného cíle nebo bez žádné známky vrátí null', () => {
    expect(spocitejProcentaCileProumeru(2, null)).toBeNull()
    expect(spocitejProcentaCileProumeru(null, 1.5)).toBeNull()
  })

  it('cíl už dosažený nebo překonaný ukáže 100 %', () => {
    expect(spocitejProcentaCileProumeru(1.5, 1.5)).toBe(100)
    expect(spocitejProcentaCileProumeru(1.2, 1.5)).toBe(100)
  })

  it('spočítá progres jako podíl ušlé vzdálenosti od nejhorší známky (5) k cíli', () => {
    // Aktuální 2, cíl 1.5: (5-2)/(5-1.5) = 3/3.5 ≈ 85.7 % → 86.
    expect(spocitejProcentaCileProumeru(2, 1.5)).toBe(86)
  })

  it('daleko od cíle ukáže nízké, ale kladné procento', () => {
    // Aktuální 4.5, cíl 1.5: (5-4.5)/3.5 = 0.5/3.5 ≈ 14 %.
    expect(spocitejProcentaCileProumeru(4.5, 1.5)).toBe(14)
  })
})

describe('validateSkolaCilData', () => {
  it('projde platná kladná čísla beze změny', () => {
    const vysledek = validateSkolaCilData({ cilDenniMinut: 60, cilTydenniMinut: 300, cilPrumeru: 1.5 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success)
      expect(vysledek.data).toEqual({ cilDenniMinut: 60, cilTydenniMinut: 300, cilPrumeru: 1.5 })
  })

  it('null zůstává null (žádný cíl nastaven)', () => {
    const vysledek = validateSkolaCilData({ cilDenniMinut: null, cilTydenniMinut: null, cilPrumeru: null })
    expect(vysledek.success).toBe(true)
    if (vysledek.success)
      expect(vysledek.data).toEqual({ cilDenniMinut: null, cilTydenniMinut: null, cilPrumeru: null })
  })

  it('záporné nebo neplatné číslo spadne na null, ne na shozený celý stav', () => {
    const vysledek = validateSkolaCilData({ cilDenniMinut: -10, cilTydenniMinut: 'sto', cilPrumeru: 'nedostatečně' })
    expect(vysledek.success).toBe(true)
    if (vysledek.success)
      expect(vysledek.data).toEqual({ cilDenniMinut: null, cilTydenniMinut: null, cilPrumeru: null })
  })

  it('chybějící pole spadnou na null', () => {
    const vysledek = validateSkolaCilData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success)
      expect(vysledek.data).toEqual({ cilDenniMinut: null, cilTydenniMinut: null, cilPrumeru: null })
  })

  it('cíl průměru mimo klasifikační stupnici 1–5 spadne na null', () => {
    const prilisNizky = validateSkolaCilData({ cilPrumeru: 0.5 })
    const prilisVysoky = validateSkolaCilData({ cilPrumeru: 5.5 })
    expect(prilisNizky.success && prilisNizky.data.cilPrumeru).toBeNull()
    expect(prilisVysoky.success && prilisVysoky.data.cilPrumeru).toBeNull()
  })
})
