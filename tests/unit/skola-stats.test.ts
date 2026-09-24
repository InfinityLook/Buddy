import { describe, it, expect } from 'vitest'
import { Predmet } from '@/miniapps/znamky/types'
import { spocitejTrendZnamek } from '@/flagships/school-room/skolaStats'

// ==========================================
// Trend známek — pure funkce, žádný store. TED je pevně 15. června
// 2026, ať test nezávisí na tom, kdy skutečně běží.
// ==========================================

const TED = new Date('2026-06-15T12:00:00')

const predmet = (over: Partial<Predmet> = {}): Predmet => ({
  id: 'p1',
  nazev: 'Matematika',
  kredity: 0,
  znamky: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: 0,
  deletedAt: null,
  ...over,
})

describe('spocitejTrendZnamek', () => {
  it('vrátí přesně pocetMesicu položek, od nejstaršího k nejnovějšímu', () => {
    const vysledek = spocitejTrendZnamek([], TED, 6)
    expect(vysledek).toHaveLength(6)
    expect(vysledek[5].klic).toBe('2026-06')
    expect(vysledek[0].klic).toBe('2026-01')
  })

  it('poslední měsíc dostane popisek zkrácený na 3 znaky', () => {
    const vysledek = spocitejTrendZnamek([], TED, 6)
    expect(vysledek[5].popisek).toBe('Čer')
  })

  it('spočítá vážený průměr napříč VŠEMI předměty za daný měsíc', () => {
    const predmety = [
      predmet({
        id: 'a',
        znamky: [
          { id: 'z1', hodnota: 1, vaha: 1, popis: '', datum: '2026-06-01' },
          { id: 'z2', hodnota: 3, vaha: 1, popis: '', datum: '2026-06-10' },
        ],
      }),
    ]
    const vysledek = spocitejTrendZnamek(predmety, TED, 6)
    expect(vysledek[5].prumer).toBe(2) // (1+3)/2
  })

  it('váží podle vlastní váhy známky, ne podle kreditů předmětu', () => {
    const predmety = [
      predmet({
        znamky: [
          { id: 'z1', hodnota: 1, vaha: 2, popis: '', datum: '2026-06-01' },
          { id: 'z2', hodnota: 4, vaha: 1, popis: '', datum: '2026-06-05' },
        ],
      }),
    ]
    // (1*2 + 4*1) / (2+1) = 6/3 = 2
    expect(spocitejTrendZnamek(predmety, TED, 6)[5].prumer).toBe(2)
  })

  it('měsíc bez jediné známky vrátí null, ne 0', () => {
    const vysledek = spocitejTrendZnamek([], TED, 6)
    expect(vysledek.every((m) => m.prumer === null)).toBe(true)
  })

  it('známka bez datumu (např. hypotéza z "co kdyby") se do trendu nepočítá', () => {
    const predmety = [
      predmet({
        znamky: [{ id: '__hypoteza__', hodnota: 5, vaha: 1, popis: '', datum: '' }],
      }),
    ]
    expect(spocitejTrendZnamek(predmety, TED, 6)[5].prumer).toBeNull()
  })

  it('sčítá napříč více předměty ve stejném měsíci', () => {
    const predmety = [
      predmet({ id: 'a', znamky: [{ id: 'z1', hodnota: 1, vaha: 1, popis: '', datum: '2026-06-01' }] }),
      predmet({ id: 'b', znamky: [{ id: 'z2', hodnota: 3, vaha: 1, popis: '', datum: '2026-06-02' }] }),
    ]
    expect(spocitejTrendZnamek(predmety, TED, 6)[5].prumer).toBe(2)
  })
})
