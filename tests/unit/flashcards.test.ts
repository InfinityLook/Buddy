import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  LEITNER_INTERVALY_DNY,
  MAX_KRABICE,
  MIN_KRABICE,
  dalsiKrabice,
  jeKOpakovaniDnes,
  vypocitejDalsiTermin,
} from '@/miniapps/flashcards/types'
import { useFlashcardsStore } from '@/miniapps/flashcards/useFlashcards'
import { useGamificationStore } from '@/core/store/useGamificationStore'

// ==========================================
// Opakování s rozestupy (Leitnerovy krabice) — čisté funkce testované
// samostatně, pak i skrz store přímo (stejný vzor jako
// form-check-store.test.ts), protože setKnown krabici/termín posouvá
// jako vedlejší efekt volání akce, ne přes čistou funkci volanou z UI.
// ==========================================

describe('dalsiKrabice', () => {
  it('správná odpověď posune krabici o jednu výš', () => {
    expect(dalsiKrabice(1, true)).toBe(2)
    expect(dalsiKrabice(3, true)).toBe(4)
  })

  it('krabice nejde přes MAX_KRABICE', () => {
    expect(dalsiKrabice(MAX_KRABICE, true)).toBe(MAX_KRABICE)
  })

  it('špatná odpověď vždy spadne zpátky na MIN_KRABICE, i z nejvyšší krabice', () => {
    expect(dalsiKrabice(1, false)).toBe(MIN_KRABICE)
    expect(dalsiKrabice(MAX_KRABICE, false)).toBe(MIN_KRABICE)
  })
})

describe('vypocitejDalsiTermin', () => {
  it('krabice 1 dá termín dnes (interval 0 dní)', () => {
    const ted = new Date('2024-01-01T12:00:00.000Z')
    expect(vypocitejDalsiTermin(1, ted)).toBe(ted.toISOString())
  })

  it('krabice 2 posune termín o den dopředu', () => {
    const ted = new Date('2024-01-01T12:00:00.000Z')
    const vysledek = new Date(vypocitejDalsiTermin(2, ted))
    expect(vysledek.getTime() - ted.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('nejvyšší krabice dá nejdelší interval z tabulky', () => {
    const ted = new Date('2024-01-01T12:00:00.000Z')
    const vysledek = new Date(vypocitejDalsiTermin(MAX_KRABICE, ted))
    const posledniInterval = LEITNER_INTERVALY_DNY[LEITNER_INTERVALY_DNY.length - 1]
    expect(vysledek.getTime() - ted.getTime()).toBe(posledniInterval * 24 * 60 * 60 * 1000)
  })

  it('krabice mimo platný rozsah se ořízne, ne že by appka spadla', () => {
    const ted = new Date('2024-01-01T12:00:00.000Z')
    expect(vypocitejDalsiTermin(0, ted)).toBe(vypocitejDalsiTermin(MIN_KRABICE, ted))
    expect(vypocitejDalsiTermin(99, ted)).toBe(vypocitejDalsiTermin(MAX_KRABICE, ted))
  })
})

describe('jeKOpakovaniDnes', () => {
  const ted = new Date('2024-06-15T10:00:00.000Z')

  it('chybějící termín (null) znamená "hned" — nová nebo starší uložená kartička bez pole', () => {
    expect(jeKOpakovaniDnes(null, ted)).toBe(true)
    expect(jeKOpakovaniDnes(undefined, ted)).toBe(true)
  })

  it('termín v minulosti je due', () => {
    expect(jeKOpakovaniDnes('2024-06-14T10:00:00.000Z', ted)).toBe(true)
  })

  it('termín přesně teď je due (<=, ne <)', () => {
    expect(jeKOpakovaniDnes(ted.toISOString(), ted)).toBe(true)
  })

  it('termín v budoucnu ještě due není', () => {
    expect(jeKOpakovaniDnes('2024-06-20T10:00:00.000Z', ted)).toBe(false)
  })

  it('poškozený řetězec data se bere jako "hned", ne jako pád', () => {
    expect(jeKOpakovaniDnes('tohle není datum', ted)).toBe(true)
  })
})

describe('useFlashcardsStore.setKnown — spaced repetition v akci', () => {
  const vychoziGamifikace = useGamificationStore.getState()

  beforeEach(() => {
    useFlashcardsStore.setState({ cards: [] })
    useGamificationStore.setState({
      xp: 0,
      level: 1,
      streakDays: 0,
      lastActiveDate: null,
      badges: vychoziGamifikace.badges.map((b) => ({ ...b, unlockedAt: null })),
      counters: {},
    })
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('nová kartička po přidání je v krabici 1 a due hned (dueAt null)', () => {
    useFlashcardsStore.getState().addCard('Otázka', 'Odpověď', 'Test')
    const [karta] = useFlashcardsStore.getState().cards
    expect(karta.box).toBe(MIN_KRABICE)
    expect(karta.dueAt).toBeNull()
  })

  it('správná odpověď posune krabici a nastaví budoucí termín', () => {
    useFlashcardsStore.getState().addCard('Q', 'A', 'Test')
    const id = useFlashcardsStore.getState().cards[0].id

    useFlashcardsStore.getState().setKnown(id, true)

    const karta = useFlashcardsStore.getState().cards[0]
    expect(karta.box).toBe(2)
    expect(karta.known).toBe(true)
    expect(new Date(karta.dueAt!).getTime()).toBeGreaterThan(Date.now())
  })

  it('špatná odpověď z vyšší krabice spadne zpátky na krabici 1 s termínem "dnes"', () => {
    useFlashcardsStore.getState().addCard('Q', 'A', 'Test')
    const id = useFlashcardsStore.getState().cards[0].id

    useFlashcardsStore.getState().setKnown(id, true) // box 1 -> 2
    useFlashcardsStore.getState().setKnown(id, true) // box 2 -> 3
    useFlashcardsStore.getState().setKnown(id, false) // špatně -> zpátky na 1

    const karta = useFlashcardsStore.getState().cards[0]
    expect(karta.box).toBe(MIN_KRABICE)
    expect(karta.known).toBe(false)
    expect(jeKOpakovaniDnes(karta.dueAt)).toBe(true)
  })

  it('opakovaně správné odpovědi krabici nepošlou přes strop', () => {
    useFlashcardsStore.getState().addCard('Q', 'A', 'Test')
    const id = useFlashcardsStore.getState().cards[0].id

    for (let i = 0; i < MAX_KRABICE + 3; i++) {
      useFlashcardsStore.getState().setKnown(id, true)
    }

    expect(useFlashcardsStore.getState().cards[0].box).toBe(MAX_KRABICE)
  })

  it('resetDeckProgress vrátí krabici i termín na začátek spolu s known', () => {
    useFlashcardsStore.getState().addCard('Q', 'A', 'Test')
    const id = useFlashcardsStore.getState().cards[0].id
    useFlashcardsStore.getState().setKnown(id, true)
    useFlashcardsStore.getState().setKnown(id, true)

    useFlashcardsStore.getState().resetDeckProgress('Test')

    const karta = useFlashcardsStore.getState().cards[0]
    expect(karta.known).toBe(false)
    expect(karta.box).toBe(MIN_KRABICE)
    expect(karta.dueAt).toBeNull()
  })

  it('XP za naučení se dá jen jednou, i když appka krabici dál posouvá', () => {
    useFlashcardsStore.getState().addCard('Q', 'A', 'Test')
    const id = useFlashcardsStore.getState().cards[0].id

    useFlashcardsStore.getState().setKnown(id, true)
    const xpPoPrvni = useGamificationStore.getState().xp
    useFlashcardsStore.getState().setKnown(id, true)

    expect(useGamificationStore.getState().xp).toBe(xpPoPrvni)
  })
})
