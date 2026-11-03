import { describe, it, expect, beforeEach } from 'vitest'
import { useZnamkyStore } from '@/miniapps/znamky/useZnamky'
import { useGamificationStore } from '@/core/store/useGamificationStore'

// ==========================================
// useZnamkyStore je exportovaný přímo (viz jeho vlastní komentář v
// useZnamky.ts), takže se dá testovat rovnou přes .getState()/
// .setState() — stejný vzor jako rozvrh-store.test.ts/gamification.test.ts.
// Store je sdílený singleton, proto se predmety před každým testem
// vrací na prázdný stav.
// ==========================================

const vychoziGamifikace = useGamificationStore.getState()

const resetStores = () => {
  useZnamkyStore.setState({ predmety: [] })
  useGamificationStore.setState({
    xp: 0,
    level: 1,
    streakDays: 0,
    lastActiveDate: null,
    badges: vychoziGamifikace.badges.map((b) => ({ ...b, unlockedAt: null })),
    counters: {},
  })
}

beforeEach(resetStores)

describe('upravitPredmet', () => {
  it('ořízne název a ořízne kredity na minimum 0 stejně jako pridatPredmet — ne slepé sloučení patchu', () => {
    useZnamkyStore.getState().pridatPredmet('Matematika', 5)
    const predmet = useZnamkyStore.getState().predmety[0]

    useZnamkyStore.getState().upravitPredmet(predmet.id, '  Fyzika  ', -3)

    const upraveny = useZnamkyStore.getState().predmety[0]
    expect(upraveny.nazev).toBe('Fyzika')
    expect(upraveny.kredity).toBe(0)
  })

  it('prázdný název (jen mezery) odmítne celou úpravu — předmět zůstane beze změny', () => {
    useZnamkyStore.getState().pridatPredmet('Matematika', 5)
    const predmet = useZnamkyStore.getState().predmety[0]

    useZnamkyStore.getState().upravitPredmet(predmet.id, '   ', 7)

    const nezmeneny = useZnamkyStore.getState().predmety[0]
    expect(nezmeneny.nazev).toBe('Matematika')
    expect(nezmeneny.kredity).toBe(5)
  })

  it('neposune updatedAt u jiných předmětů', () => {
    useZnamkyStore.getState().pridatPredmet('Matematika', 5)
    useZnamkyStore.getState().pridatPredmet('Fyzika', 3)
    const [a, b] = useZnamkyStore.getState().predmety
    const puvodniUpdatedAtB = b.updatedAt

    useZnamkyStore.getState().upravitPredmet(a.id, 'Matematika II', 5)

    expect(useZnamkyStore.getState().predmety.find((p) => p.id === b.id)!.updatedAt).toBe(puvodniUpdatedAtB)
  })

  it('neexistující id je no-op, nic nespadne', () => {
    useZnamkyStore.getState().pridatPredmet('Matematika', 5)
    expect(() => useZnamkyStore.getState().upravitPredmet('neexistuje', 'Cokoli', 1)).not.toThrow()
    expect(useZnamkyStore.getState().predmety[0].nazev).toBe('Matematika')
  })
})

describe('upravitZnamku', () => {
  const pridatPredmetAZnamku = () => {
    useZnamkyStore.getState().pridatPredmet('Matematika', 5)
    const predmetId = useZnamkyStore.getState().predmety[0].id
    useZnamkyStore.getState().pridatZnamku(predmetId, 2, 1, '  test  ', '2024-01-01')
    const znamkaId = useZnamkyStore.getState().predmety[0].znamky[0].id
    return { predmetId, znamkaId }
  }

  it('upraví hodnotu/popis existující známky a ořízne váhu na minimum 0.1 stejně jako pridatZnamku', () => {
    const { predmetId, znamkaId } = pridatPredmetAZnamku()

    useZnamkyStore.getState().upravitZnamku(predmetId, znamkaId, 1, -2, '  opraveno  ', '2024-02-02')

    const znamka = useZnamkyStore.getState().predmety[0].znamky[0]
    expect(znamka.hodnota).toBe(1)
    expect(znamka.vaha).toBe(0.1)
    expect(znamka.popis).toBe('opraveno')
    expect(znamka.datum).toBe('2024-02-02')
  })

  it('nezasáhne ostatní známky stejného předmětu', () => {
    const { predmetId, znamkaId } = pridatPredmetAZnamku()
    useZnamkyStore.getState().pridatZnamku(predmetId, 5, 1, 'druhá', '2024-01-05')
    const druhaZnamkaId = useZnamkyStore
      .getState()
      .predmety[0].znamky.find((z) => z.id !== znamkaId)!.id

    useZnamkyStore.getState().upravitZnamku(predmetId, znamkaId, 1, 1, 'upraveno', '2024-01-01')

    const druha = useZnamkyStore.getState().predmety[0].znamky.find((z) => z.id === druhaZnamkaId)!
    expect(druha.hodnota).toBe(5)
    expect(druha.popis).toBe('druhá')
  })

  it('neuděluje XP, na rozdíl od pridatZnamku — editace není nový studijní čin', () => {
    const { predmetId, znamkaId } = pridatPredmetAZnamku()
    const xpPoPridani = useGamificationStore.getState().xp
    const pocitadloPoPridani = useGamificationStore.getState().counters.znamka ?? 0

    useZnamkyStore.getState().upravitZnamku(predmetId, znamkaId, 4, 1, 'upraveno', '2024-01-01')

    expect(useGamificationStore.getState().xp).toBe(xpPoPridani)
    expect(useGamificationStore.getState().counters.znamka ?? 0).toBe(pocitadloPoPridani)
  })

  it('neexistující znamkaId je no-op, nic nespadne', () => {
    const { predmetId } = pridatPredmetAZnamku()
    expect(() => useZnamkyStore.getState().upravitZnamku(predmetId, 'neexistuje', 3, 1, 'x', '2024-01-01')).not.toThrow()
    expect(useZnamkyStore.getState().predmety[0].znamky[0].hodnota).toBe(2)
  })
})
