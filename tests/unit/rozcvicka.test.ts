import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useRozcvickaStore } from '@/flagships/fitness-room/useRozcvickaStore'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateRozcvickaData } from '@/core/utils/rozcvickaValidation'
import { PROGRAMY_ROZCVICKY, NAZEV_KATEGORIE } from '@/flagships/fitness-room/data/programyRozcvicky'

// ==========================================
// useRozcvickaStore.ts's jediná skutečná logika je "nejvýš jednou denně,
// ne za každé dokončení" — stejný reset-store vzor jako
// form-check-store.test.ts (useFormCheckStore/useGamificationStore obojí
// resetováno v beforeEach, ne mockováno).
// ==========================================

const vychoziGamifikace = useGamificationStore.getState()

const resetStores = () => {
  useRozcvickaStore.setState({ posledniOdmenenyDen: null, pocetDokoncenychCelkem: 0 })
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

describe('useRozcvickaStore.oznacDokonceni', () => {
  it('první dokončení daného dne připíše XP a vrátí true', () => {
    const vysledek = useRozcvickaStore.getState().oznacDokonceni()
    expect(vysledek).toBe(true)
    expect(useGamificationStore.getState().counters.mobilita).toBe(1)
    expect(useGamificationStore.getState().xp).toBe(15)
    expect(useRozcvickaStore.getState().posledniOdmenenyDen).toBe('2026-08-21')
    expect(useRozcvickaStore.getState().pocetDokoncenychCelkem).toBe(1)
  })

  it('druhé dokončení stejného dne XP nepřipíše, ale celkový počet se pořád zvýší', () => {
    useRozcvickaStore.getState().oznacDokonceni()
    const vysledek = useRozcvickaStore.getState().oznacDokonceni()
    expect(vysledek).toBe(false)
    expect(useGamificationStore.getState().counters.mobilita).toBe(1)
    expect(useGamificationStore.getState().xp).toBe(15)
    expect(useRozcvickaStore.getState().pocetDokoncenychCelkem).toBe(2)
  })

  it('dokončení dalšího dne XP připíše znovu', () => {
    useRozcvickaStore.getState().oznacDokonceni()
    vi.setSystemTime(new Date('2026-08-22T09:00:00'))
    const vysledek = useRozcvickaStore.getState().oznacDokonceni()
    expect(vysledek).toBe(true)
    expect(useGamificationStore.getState().counters.mobilita).toBe(2)
    expect(useGamificationStore.getState().xp).toBe(30)
    expect(useRozcvickaStore.getState().posledniOdmenenyDen).toBe('2026-08-22')
  })

  it('po 10 různých dnech se odemkne odznak harmonie', () => {
    for (let den = 1; den <= 10; den++) {
      vi.setSystemTime(new Date(`2026-08-${String(den).padStart(2, '0')}T09:00:00`))
      useRozcvickaStore.getState().oznacDokonceni()
    }
    const harmonie = useGamificationStore.getState().badges.find((b) => b.id === 'harmonie')
    expect(harmonie?.unlockedAt).not.toBeNull()
  })
})

describe('validateRozcvickaData', () => {
  it('platná data projdou beze změny', () => {
    const vysledek = validateRozcvickaData({ posledniOdmenenyDen: '2026-08-21', pocetDokoncenychCelkem: 4 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.posledniOdmenenyDen).toBe('2026-08-21')
      expect(vysledek.data.pocetDokoncenychCelkem).toBe(4)
    }
  })

  it('chybějící pole spadnou na bezpečné výchozí', () => {
    const vysledek = validateRozcvickaData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.posledniOdmenenyDen).toBeNull()
      expect(vysledek.data.pocetDokoncenychCelkem).toBe(0)
    }
  })

  it('poškozený formát dne (ne YYYY-MM-DD) spadne na null, ne na chybu celého objektu', () => {
    const vysledek = validateRozcvickaData({ posledniOdmenenyDen: '21.8.2026', pocetDokoncenychCelkem: 2 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.posledniOdmenenyDen).toBeNull()
      expect(vysledek.data.pocetDokoncenychCelkem).toBe(2)
    }
  })

  it('záporný nebo špatně typovaný počet spadne na 0', () => {
    const vysledek = validateRozcvickaData({ pocetDokoncenychCelkem: -3 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.pocetDokoncenychCelkem).toBe(0)

    const vysledek2 = validateRozcvickaData({ pocetDokoncenychCelkem: 'hodně' })
    expect(vysledek2.success).toBe(true)
    if (vysledek2.success) expect(vysledek2.data.pocetDokoncenychCelkem).toBe(0)
  })
})

describe('PROGRAMY_ROZCVICKY', () => {
  it('obsahuje přesně dva rychlé programy a čtyři jógové/mobilitní', () => {
    const rychle = PROGRAMY_ROZCVICKY.filter((p) => p.kategorie !== 'joga')
    const joga = PROGRAMY_ROZCVICKY.filter((p) => p.kategorie === 'joga')
    expect(rychle).toHaveLength(2)
    expect(joga).toHaveLength(4)
  })

  it('každý program má aspoň jeden krok s kladnou délkou', () => {
    for (const program of PROGRAMY_ROZCVICKY) {
      expect(program.kroky.length).toBeGreaterThan(0)
      for (const krok of program.kroky) {
        expect(krok.sekund).toBeGreaterThan(0)
        expect(krok.nazev.length).toBeGreaterThan(0)
      }
    }
  })

  it('jógové/mobilitní programy mají u každého kroku hlasový pokyn (popis)', () => {
    const joga = PROGRAMY_ROZCVICKY.filter((p) => p.kategorie === 'joga')
    for (const program of joga) {
      for (const krok of program.kroky) {
        expect(krok.popis).toBeTruthy()
      }
    }
  })

  it('má unikátní id napříč celým katalogem', () => {
    const ids = PROGRAMY_ROZCVICKY.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('NAZEV_KATEGORIE pokrývá všechny tři kategorie', () => {
    expect(Object.keys(NAZEV_KATEGORIE).sort()).toEqual(['joga', 'rozcvicka', 'strecink'])
  })
})
