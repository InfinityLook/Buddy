import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getLevelFromXp,
  getXpForNextLevel,
  getLevelProgress,
  checkStreak,
  melaByUpozornitNaKonecSerie,
  nejblizsiOdznak,
  popisekPokrokuOdznaku,
  spocitejXpZaPoslednichNDni,
} from '@/core/utils/gamificationUtils'
import { Badge } from '@/core/types/gamification.types'

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

// Krok 14e (Hubovo "Upozornění na blížící se konec série")
describe('melaByUpozornitNaKonecSerie', () => {
  it('bez skutečné série (streakDays 0) nikdy neupozorní', () => {
    expect(melaByUpozornitNaKonecSerie(0, null, new Date('2026-08-21T21:00:00'))).toBe(false)
  })

  it('dřív než 20:00 neupozorní, i když je série ohrožená', () => {
    expect(melaByUpozornitNaKonecSerie(5, '2026-08-20', new Date('2026-08-21T19:59:00'))).toBe(false)
  })

  it('po 20:00, se sérií, bez dnešní aktivity upozorní', () => {
    expect(melaByUpozornitNaKonecSerie(5, '2026-08-20', new Date('2026-08-21T20:00:00'))).toBe(true)
  })

  it('po 20:00, s už zaznamenanou dnešní aktivitou, neupozorní', () => {
    expect(melaByUpozornitNaKonecSerie(5, '2026-08-21', new Date('2026-08-21T21:00:00'))).toBe(false)
  })
})

// Krok 14f (Hubův "Náhled na příští odznak")
describe('nejblizsiOdznak', () => {
  const badge = (id: string, unlockedAt: string | null = null): Badge => ({
    id,
    title: id,
    description: '',
    icon: '🏅',
    unlockedAt,
  })

  const vsechnyZamcene = [badge('streak_3'), badge('streak_7'), badge('level_5'), badge('xp_1000')]

  it('vybere kandidáta s nejvyšším pokrokem z neodemčených', () => {
    // streak_3 na 1/3 (0.33), xp_1000 na 500/1000 (0.5) — xp_1000 je blíž.
    const vysledek = nejblizsiOdznak(500, 1, 1, vsechnyZamcene)
    expect(vysledek?.badge.id).toBe('xp_1000')
  })

  it('vynechá odznaky, co už jsou odemčené', () => {
    const badges = [badge('streak_3', '2026-01-01'), badge('streak_7'), badge('level_5'), badge('xp_1000')]
    // streak_7 na 2/7 (0.28) je jediný zbylý kandidát blíž než xp_1000 na 10/1000
    const vysledek = nejblizsiOdznak(10, 1, 2, badges)
    expect(vysledek?.badge.id).toBe('streak_7')
  })

  it('vrátí null, když jsou odemčené všechny čtyři kandidátské odznaky', () => {
    const vsechnyOdemcene = [
      badge('streak_3', '2026-01-01'),
      badge('streak_7', '2026-01-01'),
      badge('level_5', '2026-01-01'),
      badge('xp_1000', '2026-01-01'),
    ]
    expect(nejblizsiOdznak(9999, 99, 99, vsechnyOdemcene)).toBeNull()
  })

  it('pokrok nikdy nepřekročí 1, i při výrazném přestřelení prahu', () => {
    const vysledek = nejblizsiOdznak(50_000, 1, 1, vsechnyZamcene)
    expect(vysledek?.pokrok).toBeLessThanOrEqual(1)
  })

  it('chybějící odznak v poli appku nezhroutí, jen ho vynechá', () => {
    const vysledek = nejblizsiOdznak(100, 1, 1, [badge('xp_1000')])
    expect(vysledek?.badge.id).toBe('xp_1000')
  })
})

describe('popisekPokrokuOdznaku', () => {
  it('streak_3/streak_7 se stropuje na vlastním prahu', () => {
    expect(popisekPokrokuOdznaku('streak_3', 0, 1, 5)).toBe('3/3 dní')
    expect(popisekPokrokuOdznaku('streak_7', 0, 1, 2)).toBe('2/7 dní')
  })

  it('level_5 se stropuje na 5', () => {
    expect(popisekPokrokuOdznaku('level_5', 0, 8, 0)).toBe('úroveň 5/5')
  })

  it('xp_1000 se stropuje na 1000', () => {
    expect(popisekPokrokuOdznaku('xp_1000', 5000, 1, 0)).toBe('1000/1000 XP')
  })

  it('neznámé id vrátí prázdný řetězec', () => {
    expect(popisekPokrokuOdznaku('neexistuje', 0, 0, 0)).toBe('')
  })
})

// Krok 14g (Hubův "Týdenní souhrn")
describe('spocitejXpZaPoslednichNDni', () => {
  it('sečte jen záznamy v posledních 7 dnech včetně dneška', () => {
    const log = [
      { datum: '2026-08-10', castka: 100 }, // mimo okno
      { datum: '2026-08-15', castka: 10 }, // přesně na hranici (dnes-6)
      { datum: '2026-08-18', castka: 20 },
      { datum: '2026-08-21', castka: 30 }, // dnešek
    ]
    expect(spocitejXpZaPoslednichNDni(log, 7, '2026-08-21')).toBe(60)
  })

  it('prázdný log vrátí 0', () => {
    expect(spocitejXpZaPoslednichNDni([], 7, '2026-08-21')).toBe(0)
  })

  it('okno respektuje přechod přes začátek měsíce', () => {
    const log = [
      { datum: '2026-07-30', castka: 5 },
      { datum: '2026-08-01', castka: 15 },
      { datum: '2026-08-02', castka: 25 },
    ]
    // dnes = 2026-08-02, 7 dní zpátky = 2026-07-27 → všechny tři spadají do okna
    expect(spocitejXpZaPoslednichNDni(log, 7, '2026-08-02')).toBe(45)
  })

  it('vlastní počet dní (ne jen výchozích 7)', () => {
    const log = [
      { datum: '2026-08-19', castka: 5 },
      { datum: '2026-08-20', castka: 10 },
      { datum: '2026-08-21', castka: 20 },
    ]
    expect(spocitejXpZaPoslednichNDni(log, 2, '2026-08-21')).toBe(30)
  })
})
