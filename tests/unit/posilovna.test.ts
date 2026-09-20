import { describe, it, expect } from 'vitest'
import {
  objemSerie,
  objemCviku,
  objemSezeni,
  celkovyObjem,
  pocetSerii,
  spocitejOsobniRekordy,
  formatujVahu,
  formatujObjem,
  type PosilovaciSezeni,
  type CvikVSezeni,
} from '@/miniapps/posilovna/types'
import { validatePosilovnaData } from '@/core/utils/posilovnaValidation'

const cvik = (nazev: string, serie: { vahaKg: number; opakovani: number }[]): CvikVSezeni => ({ nazev, serie })

const sezeni = (id: string, cviky: CvikVSezeni[], createdAt = '2024-01-01T10:00:00.000Z'): PosilovaciSezeni => ({
  id,
  cviky,
  poznamka: '',
  createdAt,
})

describe('objemSerie', () => {
  it('vynásobí váhu a počet opakování', () => {
    expect(objemSerie({ vahaKg: 50, opakovani: 10 })).toBe(500)
  })

  it('nulová váha (cvik s vlastní vahou) dá objem 0', () => {
    expect(objemSerie({ vahaKg: 0, opakovani: 15 })).toBe(0)
  })
})

describe('objemCviku a objemSezeni', () => {
  it('sečte objem přes všechny série jednoho cviku', () => {
    const c = cvik('Bench press', [
      { vahaKg: 60, opakovani: 8 },
      { vahaKg: 60, opakovani: 6 },
    ])
    expect(objemCviku(c)).toBe(60 * 8 + 60 * 6)
  })

  it('sečte objem přes všechny cviky jednoho sezení', () => {
    const s = sezeni('a', [
      cvik('Bench press', [{ vahaKg: 60, opakovani: 8 }]),
      cvik('Dřep s činkou', [{ vahaKg: 80, opakovani: 5 }]),
    ])
    expect(objemSezeni(s)).toBe(60 * 8 + 80 * 5)
  })

  it('sezení bez cviků má objem 0', () => {
    expect(objemSezeni(sezeni('a', []))).toBe(0)
  })
})

describe('celkovyObjem', () => {
  it('sečte objem napříč celou historií', () => {
    const historie = [
      sezeni('a', [cvik('Bench press', [{ vahaKg: 60, opakovani: 8 }])]),
      sezeni('b', [cvik('Dřep s činkou', [{ vahaKg: 80, opakovani: 5 }])]),
    ]
    expect(celkovyObjem(historie)).toBe(60 * 8 + 80 * 5)
  })

  it('prázdná historie dá 0', () => {
    expect(celkovyObjem([])).toBe(0)
  })
})

describe('pocetSerii', () => {
  it('sečte počet sérií napříč všemi cviky jednoho sezení', () => {
    const s = sezeni('a', [
      cvik('Bench press', [{ vahaKg: 60, opakovani: 8 }, { vahaKg: 60, opakovani: 6 }]),
      cvik('Dřep s činkou', [{ vahaKg: 80, opakovani: 5 }]),
    ])
    expect(pocetSerii(s)).toBe(3)
  })
})

describe('spocitejOsobniRekordy', () => {
  it('najde nejtěžší jednu sérii pro daný cvik napříč historií', () => {
    const historie = [
      sezeni('a', [cvik('Bench press', [{ vahaKg: 60, opakovani: 8 }])], '2024-01-01T10:00:00.000Z'),
      sezeni('b', [cvik('Bench press', [{ vahaKg: 70, opakovani: 5 }])], '2024-02-01T10:00:00.000Z'),
    ]
    const rekordy = spocitejOsobniRekordy(historie)
    expect(rekordy['Bench press']).toEqual({ vahaKg: 70, opakovani: 5, datum: '2024-02-01T10:00:00.000Z' })
  })

  it('při shodné váze vyhrává víc opakování', () => {
    const historie = [
      sezeni('a', [cvik('Bench press', [{ vahaKg: 60, opakovani: 5 }])]),
      sezeni('b', [cvik('Bench press', [{ vahaKg: 60, opakovani: 8 }])]),
    ]
    const rekordy = spocitejOsobniRekordy(historie)
    expect(rekordy['Bench press'].opakovani).toBe(8)
  })

  it('sleduje každý cvik zvlášť, ne jeden společný rekord', () => {
    const historie = [
      sezeni('a', [cvik('Bench press', [{ vahaKg: 60, opakovani: 8 }]), cvik('Dřep s činkou', [{ vahaKg: 100, opakovani: 3 }])]),
    ]
    const rekordy = spocitejOsobniRekordy(historie)
    expect(rekordy['Bench press'].vahaKg).toBe(60)
    expect(rekordy['Dřep s činkou'].vahaKg).toBe(100)
  })

  it('prázdná historie dá prázdný objekt', () => {
    expect(spocitejOsobniRekordy([])).toEqual({})
  })

  it('nepřepíše rekord horší sérií zadanou později', () => {
    const historie = [
      sezeni('a', [cvik('Mrtvý tah', [{ vahaKg: 120, opakovani: 3 }])], '2024-01-01T10:00:00.000Z'),
      sezeni('b', [cvik('Mrtvý tah', [{ vahaKg: 100, opakovani: 5 }])], '2024-02-01T10:00:00.000Z'),
    ]
    const rekordy = spocitejOsobniRekordy(historie)
    expect(rekordy['Mrtvý tah']).toEqual({ vahaKg: 120, opakovani: 3, datum: '2024-01-01T10:00:00.000Z' })
  })
})

describe('formatujVahu', () => {
  it('celé číslo bez desetinné čárky', () => {
    expect(formatujVahu(80)).toBe('80 kg')
  })

  it('desetinné číslo s čárkou (české formátování)', () => {
    expect(formatujVahu(82.5)).toBe('82,5 kg')
  })
})

describe('formatujObjem', () => {
  it('zaokrouhlí a oddělí tisíce podle českého formátu', () => {
    // Node's Intl vkládá mezi tisíce nezalomitelnou mezeru (U+00A0),
    // ne obyčejnou — porovnává se proti skutečnému výstupu toLocaleString,
    // ne proti ručně napsanému literálu s "normální" mezerou.
    expect(formatujObjem(1250)).toBe(`${(1250).toLocaleString('cs-CZ')} kg`)
  })

  it('malé číslo bez oddělovače', () => {
    expect(formatujObjem(480)).toBe('480 kg')
  })
})

describe('validatePosilovnaData', () => {
  it('platná data projdou beze změny', () => {
    const vysledek = validatePosilovnaData({
      sezeni: [
        {
          id: 'a',
          cviky: [{ nazev: 'Bench press', serie: [{ vahaKg: 60, opakovani: 8 }] }],
          poznamka: 'Dobrý pocit',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.sezeni).toHaveLength(1)
  })

  it('chybějící poznámka spadne na prázdný řetězec, položka se nevyřadí', () => {
    const vysledek = validatePosilovnaData({
      sezeni: [{ id: 'a', cviky: [], createdAt: '2024-01-01T10:00:00.000Z' }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.sezeni).toHaveLength(1)
      expect(vysledek.data.sezeni[0].poznamka).toBe('')
    }
  })

  it('poškozená položka (série bez čísla) se tiše vyřadí, zbytek zůstane', () => {
    const vysledek = validatePosilovnaData({
      sezeni: [
        { id: 'a', cviky: [{ nazev: 'Bench press', serie: [{ vahaKg: 60, opakovani: 8 }] }], createdAt: 'x' },
        { id: 'b', cviky: [{ nazev: 'Bench press', serie: [{ vahaKg: 'hodně', opakovani: 8 }] }], createdAt: 'x' },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.sezeni).toHaveLength(1)
      expect(vysledek.data.sezeni[0].id).toBe('a')
    }
  })

  it('chybějící pole sezeni spadne na prázdné pole, ne na chybu', () => {
    const vysledek = validatePosilovnaData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.sezeni).toEqual([])
  })
})
