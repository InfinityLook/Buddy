import { describe, it, expect } from 'vitest'
import {
  vzdalenostMetry,
  celkovaVzdalenostTrasy,
  melByPripocitatBod,
  odhadniKcal,
  formatujVzdalenost,
  formatujCas,
  tempoSekundNaKm,
  formatujTempo,
  soucetVzdalenostiM,
  type GpsBod,
  type BehSezeni,
} from '@/miniapps/behani/types'
import { validateBehaniData } from '@/core/utils/behaniValidation'

const bod = (lat: number, lng: number, cas = 0): GpsBod => ({ lat, lng, cas })

describe('vzdalenostMetry (Haversine)', () => {
  it('vrátí 0 pro identický bod', () => {
    expect(vzdalenostMetry(bod(50.0755, 14.4378), bod(50.0755, 14.4378))).toBeCloseTo(0, 5)
  })

  it('spočítá reálnou vzdálenost mezi dvěma známými body (~1 stupeň zeměpisné šířky ≈ 111 km)', () => {
    const vzdalenost = vzdalenostMetry(bod(50.0, 14.0), bod(51.0, 14.0))
    expect(vzdalenost).toBeGreaterThan(110_000)
    expect(vzdalenost).toBeLessThan(112_000)
  })
})

describe('celkovaVzdalenostTrasy', () => {
  it('prázdná nebo jednobodá trasa dá 0', () => {
    expect(celkovaVzdalenostTrasy([])).toBe(0)
    expect(celkovaVzdalenostTrasy([bod(50, 14)])).toBe(0)
  })

  it('sečte vzdálenosti mezi po sobě jdoucími body, ne mezi všemi páry', () => {
    const trasa = [bod(50.0, 14.0), bod(50.001, 14.0), bod(50.002, 14.0)]
    const soucet = celkovaVzdalenostTrasy(trasa)
    const jedenSegment = vzdalenostMetry(trasa[0], trasa[1])
    expect(soucet).toBeCloseTo(jedenSegment * 2, 0)
  })
})

describe('melByPripocitatBod', () => {
  it('první bod (bez předchozího) se vždy připočte, i s horší přesností splňující práh', () => {
    expect(melByPripocitatBod(null, bod(50, 14), 10)).toBe(true)
  })

  it('bod s horší přesností než práh se zahodí', () => {
    expect(melByPripocitatBod(bod(50, 14), bod(50.0001, 14), 30)).toBe(false)
  })

  it('posun menší než minimální práh se zahodí i při dobré přesnosti (GPS šum na místě)', () => {
    // Dva body pár centimetrů od sebe — pod MIN_POSUN_M.
    expect(melByPripocitatBod(bod(50, 14), bod(50.00000005, 14), 5)).toBe(false)
  })

  it('dostatečně velký posun s dobrou přesností se připočte', () => {
    expect(melByPripocitatBod(bod(50.0, 14.0), bod(50.001, 14.0), 5)).toBe(true)
  })
})

describe('odhadniKcal', () => {
  it('vyšší intenzita aktivity (běh) dá víc kcal než nižší (chůze) za stejný čas a váhu', () => {
    const chuze = odhadniKcal('chuze', 1800, 70)
    const beh = odhadniKcal('beh', 1800, 70)
    expect(beh).toBeGreaterThan(chuze)
  })

  it('bez zadané váhy (null) použije poctivě přiznaný výchozí odhad, ne 0', () => {
    const sVahou = odhadniKcal('beh', 1800, 70)
    const bezVahy = odhadniKcal('beh', 1800, null)
    expect(bezVahy).toBeGreaterThan(0)
    expect(sVahou).toBe(bezVahy) // 70 kg je zrovna výchozí odhad
  })

  it('nulová nebo záporná váha se bere jako neplatná, appka nedělí nulou', () => {
    expect(odhadniKcal('kolo', 600, 0)).toBeGreaterThan(0)
    expect(odhadniKcal('kolo', 600, -5)).toBeGreaterThan(0)
  })

  it('nulové trvání dá 0 kcal', () => {
    expect(odhadniKcal('beh', 0, 70)).toBe(0)
  })
})

describe('formatujVzdalenost', () => {
  it('pod 1000 m ukáže metry, zaokrouhlené', () => {
    expect(formatujVzdalenost(542.6)).toBe('543 m')
  })

  it('od 1000 m ukáže kilometry na 2 desetinná místa', () => {
    expect(formatujVzdalenost(1500)).toBe('1.50 km')
    expect(formatujVzdalenost(10_234)).toBe('10.23 km')
  })
})

describe('formatujCas', () => {
  it('nulový čas dá 0:00', () => {
    expect(formatujCas(0)).toBe('0:00')
  })

  it('pod hodinu ukáže jen m:ss', () => {
    expect(formatujCas(125)).toBe('2:05')
  })

  it('hodinu a víc ukáže h:mm:ss', () => {
    expect(formatujCas(3725)).toBe('1:02:05')
  })
})

describe('tempoSekundNaKm', () => {
  it('pod 10 m vrátí null, appka si tempo z GPS šumu nevymýšlí', () => {
    expect(tempoSekundNaKm(5, 60)).toBeNull()
  })

  it('spočítá sekundy na kilometr správně', () => {
    // 1 km za 300 s = tempo 300 s/km
    expect(tempoSekundNaKm(1000, 300)).toBe(300)
  })
})

describe('formatujTempo', () => {
  it('null vrátí pomlčku, ne vymyšlené číslo', () => {
    expect(formatujTempo(null)).toBe('—')
  })

  it('naformátuje sekundy na km jako min:ss /km', () => {
    expect(formatujTempo(330)).toBe('5:30 /km')
  })
})

describe('soucetVzdalenostiM', () => {
  const sezeni = (id: string, vzdalenostM: number): BehSezeni => ({
    id,
    typ: 'beh',
    vzdalenostM,
    trvaniSekund: 600,
    odhadKcal: 100,
    trasa: [],
    createdAt: new Date().toISOString(),
  })

  it('sečte vzdálenost napříč celou historií', () => {
    expect(soucetVzdalenostiM([sezeni('a', 1000), sezeni('b', 2500)])).toBe(3500)
  })

  it('prázdná historie dá 0', () => {
    expect(soucetVzdalenostiM([])).toBe(0)
  })
})

describe('validateBehaniData', () => {
  it('platná data projdou beze změny', () => {
    const vysledek = validateBehaniData({
      sezeni: [
        {
          id: 'a',
          typ: 'beh',
          vzdalenostM: 5000,
          trvaniSekund: 1800,
          odhadKcal: 400,
          trasa: [{ lat: 50, lng: 14, cas: 1 }],
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.sezeni).toHaveLength(1)
  })

  it('poškozená položka (neplatný typ aktivity) se tiše vyřadí, zbytek zůstane', () => {
    const vysledek = validateBehaniData({
      sezeni: [
        { id: 'a', typ: 'beh', vzdalenostM: 1000, trvaniSekund: 300, odhadKcal: 50, trasa: [], createdAt: 'x' },
        { id: 'b', typ: 'nesmysl', vzdalenostM: 1000, trvaniSekund: 300, odhadKcal: 50, trasa: [], createdAt: 'x' },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.sezeni).toHaveLength(1)
      expect(vysledek.data.sezeni[0].id).toBe('a')
    }
  })

  it('chybějící pole sezeni spadne na prázdné pole, ne na chybu', () => {
    const vysledek = validateBehaniData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.sezeni).toEqual([])
  })
})
