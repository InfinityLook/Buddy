import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useFormCheckStore, nejlepsiOpakovaniProCvik, navrhniCilNaPriste } from '@/miniapps/form-check/useFormCheck'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import type { Sezeni } from '@/miniapps/form-check/types'

// ==========================================
// useFormCheck.ts's store — testováno přímo přes Zustand API (stejný
// vzor jako gamification.test.ts), protože ulozitSezeni odemyká odznaky
// jako vedlejší efekt volání akce, ne jako čistá funkce.
// ==========================================

const vychoziGamifikace = useGamificationStore.getState()

const resetStores = () => {
  useFormCheckStore.setState({ sezeni: [], hlasoveHlaseni: true, lastReminderDate: null })
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

const jeOdemcen = (badgeId: string): boolean =>
  !!useGamificationStore.getState().badges.find((b) => b.id === badgeId)?.unlockedAt

describe('nejlepsiOpakovaniProCvik', () => {
  const sezeni: Sezeni[] = [
    { id: '1', cvik: 'dřep', pocetOpakovani: 10, trvaniSekund: 30, createdAt: '2024-01-01' },
    { id: '2', cvik: 'klik', pocetOpakovani: 25, trvaniSekund: 40, createdAt: '2024-01-02' },
    { id: '3', cvik: 'dřep', pocetOpakovani: 18, trvaniSekund: 30, createdAt: '2024-01-03' },
  ]

  it('vrátí nejvyšší počet opakování PRO DANÝ cvik, ne napříč všemi', () => {
    expect(nejlepsiOpakovaniProCvik(sezeni, 'dřep')).toBe(18)
    expect(nejlepsiOpakovaniProCvik(sezeni, 'klik')).toBe(25)
  })

  it('cvik bez žádného sezení vrátí 0', () => {
    expect(nejlepsiOpakovaniProCvik(sezeni, 'výpad')).toBe(0)
  })
})

describe('navrhniCilNaPriste', () => {
  const sezeni: Sezeni[] = [
    { id: '1', cvik: 'dřep', pocetOpakovani: 10, trvaniSekund: 30, createdAt: '2024-01-01T10:00:00Z' },
    { id: '2', cvik: 'dřep', pocetOpakovani: 14, trvaniSekund: 30, createdAt: '2024-01-05T10:00:00Z' },
    { id: '3', cvik: 'dřep', pocetOpakovani: 12, trvaniSekund: 30, createdAt: '2024-01-03T10:00:00Z' },
  ]

  it('navrhne o jedno víc, než bylo v POSLEDNÍM (nejnovějším) sezení daného cviku, ne v nejlepším', () => {
    // Nejlepší je 14 (5.1.), ale poslední podle data je taky 5.1. — zkusí
    // se jiné pořadí, ať test doopravdy ověří "poslední", ne "max".
    expect(navrhniCilNaPriste(sezeni, 'dřep')).toBe(15)
  })

  it('cvik bez žádné historie vrátí null, ne vymyšlené číslo', () => {
    expect(navrhniCilNaPriste(sezeni, 'klik')).toBeNull()
  })

  it('opravdu bere nejnovější sezení, ne nejlepší — nejnovější je horší než starší', () => {
    const historieSHorsimPoslednim: Sezeni[] = [
      { id: 'a', cvik: 'klik', pocetOpakovani: 20, trvaniSekund: 30, createdAt: '2024-01-01T10:00:00Z' },
      { id: 'b', cvik: 'klik', pocetOpakovani: 8, trvaniSekund: 30, createdAt: '2024-02-01T10:00:00Z' },
    ]
    expect(navrhniCilNaPriste(historieSHorsimPoslednim, 'klik')).toBe(9)
  })
})

describe('useFormCheckStore.ulozitSezeni — odznaky', () => {
  it('"Stovkař" se odemkne, jakmile součet opakování napříč historií dosáhne 100', () => {
    useFormCheckStore.getState().ulozitSezeni(60, 60, 'dřep')
    expect(jeOdemcen('stovkar')).toBe(false)

    useFormCheckStore.getState().ulozitSezeni(40, 60, 'dřep')
    expect(jeOdemcen('stovkar')).toBe(true)
  })

  it('"Všestranný" se odemkne, až historie obsahuje všechny čtyři cviky', () => {
    useFormCheckStore.getState().ulozitSezeni(5, 30, 'dřep')
    useFormCheckStore.getState().ulozitSezeni(5, 30, 'klik')
    useFormCheckStore.getState().ulozitSezeni(5, 30, 'výpad')
    expect(jeOdemcen('vsestranny')).toBe(false)

    useFormCheckStore.getState().ulozitSezeni(5, 30, 'prkno')
    expect(jeOdemcen('vsestranny')).toBe(true)
  })

  it('"Tréninkový bojovník" se odemkne při 7denní sérii, ne dřív', () => {
    // Šest po sobě jdoucích dní zpětně, KONČÍCÍCH VČEREJŠKEM (15.–20.8.),
    // přímo do storu — ulozitSezeni by na každý den samostatně volalo
    // recordAction/gamifikaci navíc, což tenhle test nepotřebuje
    // testovat znovu. Dnešek (21.8. podle fake timeru) záměrně chybí,
    // ať ho doplní až samotné volání ulozitSezeni níž.
    const drivejsi: Sezeni[] = Array.from({ length: 6 }, (_, i) => ({
      id: `d${i}`,
      cvik: 'dřep' as const,
      pocetOpakovani: 5,
      trvaniSekund: 30,
      createdAt: new Date(2026, 7, 15 + i).toISOString(),
    }))
    useFormCheckStore.setState({ sezeni: drivejsi })
    expect(jeOdemcen('treninkovy_bojovnik')).toBe(false)

    // Sedmý den (dnešek, 21.8. podle fake timeru) dokončí sérii.
    useFormCheckStore.getState().ulozitSezeni(5, 30, 'dřep')
    expect(jeOdemcen('treninkovy_bojovnik')).toBe(true)
  })

  it('sezení s nula opakováními se vůbec neuloží a nic neodemkne', () => {
    const id = useFormCheckStore.getState().ulozitSezeni(0, 30, 'dřep')
    expect(id).toBe('')
    expect(useFormCheckStore.getState().sezeni).toHaveLength(0)
  })
})
