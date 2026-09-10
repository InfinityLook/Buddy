import { describe, it, expect } from 'vitest'
import {
  Predmet,
  celkovyVazenyPrumer,
  soucetKreditu,
  vazenyPrumerPredmetu,
  znamkaSlovy,
} from '@/miniapps/znamky/types'
import { validateZnamkyData } from '@/core/utils/znamkyValidation'

// ==========================================
// Pure funkce Známek — vážený průměr (per-předmět i celkový přes
// kredity) a ověření uložených dat, žádný store, testovatelné bez
// komponenty.
// ==========================================

const predmet = (over: Partial<Predmet> = {}): Predmet => ({
  id: 'p1',
  nazev: 'Matematika',
  kredity: 5,
  znamky: [],
  ...over,
})

describe('znamkaSlovy', () => {
  it('přeloží číslo na český slovní ekvivalent', () => {
    expect(znamkaSlovy(1)).toBe('výborně')
    expect(znamkaSlovy(5)).toBe('nedostatečně')
  })
})

describe('vazenyPrumerPredmetu', () => {
  it('spočítá vážený průměr podle váhy jednotlivých známek', () => {
    const p = predmet({
      znamky: [
        { id: 'z1', hodnota: 1, vaha: 2, popis: '', datum: '' },
        { id: 'z2', hodnota: 3, vaha: 1, popis: '', datum: '' },
      ],
    })
    // (1*2 + 3*1) / (2+1) = 5/3
    expect(vazenyPrumerPredmetu(p)).toBeCloseTo(5 / 3, 5)
  })

  it('předmět bez žádné známky vrátí null, ne 0', () => {
    expect(vazenyPrumerPredmetu(predmet())).toBeNull()
  })
})

describe('celkovyVazenyPrumer', () => {
  it('váží průměry předmětů jejich kredity', () => {
    const predmety = [
      predmet({ id: 'a', kredity: 4, znamky: [{ id: 'z1', hodnota: 1, vaha: 1, popis: '', datum: '' }] }),
      predmet({ id: 'b', kredity: 1, znamky: [{ id: 'z2', hodnota: 5, vaha: 1, popis: '', datum: '' }] }),
    ]
    // (1*4 + 5*1) / (4+1) = 9/5 = 1.8
    expect(celkovyVazenyPrumer(predmety)).toBeCloseTo(1.8, 5)
  })

  it('předmět s nulovými kredity počítá s vahou 1, ne že by z průměru vypadl', () => {
    const predmety = [
      predmet({ id: 'a', kredity: 0, znamky: [{ id: 'z1', hodnota: 2, vaha: 1, popis: '', datum: '' }] }),
    ]
    expect(celkovyVazenyPrumer(predmety)).toBe(2)
  })

  it('předmět bez známky se do celkového průměru vůbec nepočítá', () => {
    const predmety = [predmet({ id: 'a', znamky: [] })]
    expect(celkovyVazenyPrumer(predmety)).toBeNull()
  })

  it('žádné předměty vrátí null', () => {
    expect(celkovyVazenyPrumer([])).toBeNull()
  })
})

describe('soucetKreditu', () => {
  it('sečte kredity napříč předměty', () => {
    expect(soucetKreditu([predmet({ kredity: 3 }), predmet({ id: 'b', kredity: 5 })])).toBe(8)
  })
})

describe('validateZnamkyData', () => {
  it('projde platná data beze změny', () => {
    const vysledek = validateZnamkyData({
      predmety: [predmet({ znamky: [{ id: 'z1', hodnota: 1, vaha: 1, popis: '', datum: '2024-01-01' }] })],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.predmety).toHaveLength(1)
  })

  it('známka mimo stupnici 1–5 se tiše vyřadí, předmět zůstane', () => {
    const vysledek = validateZnamkyData({
      predmety: [
        predmet({
          znamky: [
            { id: 'spatna', hodnota: 9, vaha: 1, popis: '', datum: '' },
            { id: 'dobra', hodnota: 2, vaha: 1, popis: '', datum: '' },
          ],
        }),
      ],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.predmety[0].znamky).toHaveLength(1)
      expect(vysledek.data.predmety[0].znamky[0].id).toBe('dobra')
    }
  })

  it('předmět bez názvu se tiše vyřadí', () => {
    const vysledek = validateZnamkyData({ predmety: [predmet({ nazev: '  ' })] })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.predmety).toHaveLength(0)
  })

  it('data, co vůbec neodpovídají tvaru, se odmítnou', () => {
    expect(validateZnamkyData(42).success).toBe(false)
  })
})
