import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useGamificationStore } from '@/core/store/useGamificationStore'

// ==========================================
// core/store/useGamificationStore.ts — testováno přímo přes Zustand
// store API (getState()/setState()), bez React. Zustand stores fungují
// samostatně i mimo komponenty, takže tohle pořád patří do unit vrstvy,
// ne do component testů — nic se nevykresluje.
//
// Store je jeden sdílený singleton (stejná instance pro celý testovací
// běh), proto se před KAŽDÝM testem resetuje na výchozí stav — jinak
// by odznaky odemčené v jednom testu prosakovaly do dalšího.
// ==========================================

const vychoziStav = useGamificationStore.getState()

const resetStore = () => {
  // Bez `replace: true` — akce (addXp, recordActivity, …) žijí na
  // stejném objektu jako data, takže by je replace smazal spolu s nimi.
  // Obyčejný merge stačí, protože se přepisují všechna datová pole.
  useGamificationStore.setState({
    xp: 0,
    level: 1,
    streakDays: 0,
    lastActiveDate: null,
    badges: vychoziStav.badges.map((b) => ({ ...b, unlockedAt: null })),
    counters: {},
  })
}

beforeEach(() => {
  resetStore()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-21T12:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

const odznak = (id: string) => useGamificationStore.getState().badges.find((b) => b.id === id)

describe('addXp', () => {
  it('přičte XP a přepočítá level', () => {
    useGamificationStore.getState().addXp(300)
    const s = useGamificationStore.getState()
    expect(s.xp).toBe(300)
    expect(s.level).toBeGreaterThan(1)
  })

  it('odemkne first_step při první získané XP', () => {
    expect(odznak('first_step')?.unlockedAt).toBeNull()
    useGamificationStore.getState().addXp(10)
    expect(odznak('first_step')?.unlockedAt).not.toBeNull()
  })

  it('odemkne xp_1000 přesně při dosažení 1000 XP', () => {
    useGamificationStore.getState().addXp(999)
    expect(odznak('xp_1000')?.unlockedAt).toBeNull()
    useGamificationStore.getState().addXp(1)
    expect(odznak('xp_1000')?.unlockedAt).not.toBeNull()
  })

  it('addXp volá i recordActivity — streak se zvedne, i když nikdo nezavolal streak zvlášť', () => {
    useGamificationStore.getState().addXp(5)
    expect(useGamificationStore.getState().streakDays).toBe(1)
  })
})

describe('recordActivity (streak)', () => {
  it('první aktivita nastaví streak na 1', () => {
    useGamificationStore.getState().recordActivity()
    expect(useGamificationStore.getState().streakDays).toBe(1)
  })

  it('aktivita tři dny v řadě odemkne streak_3', () => {
    useGamificationStore.getState().recordActivity() // den 1
    vi.setSystemTime(new Date('2026-08-22T12:00:00'))
    useGamificationStore.getState().recordActivity() // den 2
    vi.setSystemTime(new Date('2026-08-23T12:00:00'))
    useGamificationStore.getState().recordActivity() // den 3

    expect(useGamificationStore.getState().streakDays).toBe(3)
    expect(odznak('streak_3')?.unlockedAt).not.toBeNull()
  })

  it('vynechaný den streak resetuje a odznak zůstává neodemčený', () => {
    useGamificationStore.getState().recordActivity()
    vi.setSystemTime(new Date('2026-08-25T12:00:00')) // o 4 dny dál, ne o 1
    useGamificationStore.getState().recordActivity()

    expect(useGamificationStore.getState().streakDays).toBe(1)
    expect(odznak('streak_3')?.unlockedAt).toBeNull()
  })

  it('aktivita po 22:00 odemkne night_owl, před tím ne', () => {
    vi.setSystemTime(new Date('2026-08-21T21:59:00'))
    useGamificationStore.getState().recordActivity()
    expect(odznak('night_owl')?.unlockedAt).toBeNull()

    vi.setSystemTime(new Date('2026-08-22T22:05:00'))
    useGamificationStore.getState().recordActivity()
    expect(odznak('night_owl')?.unlockedAt).not.toBeNull()
  })
})

describe('recordAction (počítadla + XP + count-badge v jednom kroku)', () => {
  it('zvýší počítadlo dané činnosti o jedna', () => {
    useGamificationStore.getState().recordAction('flashcard', 5)
    expect(useGamificationStore.getState().counters.flashcard).toBe(1)
  })

  it('přičte i XP — počítadlo a XP se nemůžou rozejít', () => {
    useGamificationStore.getState().recordAction('flashcard', 5)
    expect(useGamificationStore.getState().xp).toBe(5)
  })

  it('odemkne count-badge přesně při dosažení potřebného počtu (card_creator = 10)', () => {
    for (let i = 0; i < 9; i++) useGamificationStore.getState().recordAction('flashcard', 5)
    expect(odznak('card_creator')?.unlockedAt).toBeNull()

    useGamificationStore.getState().recordAction('flashcard', 5)
    expect(odznak('card_creator')?.unlockedAt).not.toBeNull()
    expect(useGamificationStore.getState().counters.flashcard).toBe(10)
  })

  it('různé druhy činností mají oddělená počítadla', () => {
    useGamificationStore.getState().recordAction('flashcard', 5)
    useGamificationStore.getState().recordAction('note', 5)
    const c = useGamificationStore.getState().counters
    expect(c.flashcard).toBe(1)
    expect(c.note).toBe(1)
  })
})

describe('unlockBadge', () => {
  it('je idempotentní — druhé zavolání nepřepíše datum prvního odemčení', () => {
    useGamificationStore.getState().unlockBadge('first_step')
    const prvniDatum = odznak('first_step')?.unlockedAt

    vi.setSystemTime(new Date('2026-09-01T12:00:00'))
    useGamificationStore.getState().unlockBadge('first_step')

    expect(odznak('first_step')?.unlockedAt).toBe(prvniDatum)
  })
})
