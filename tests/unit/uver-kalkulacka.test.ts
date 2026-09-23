import { describe, it, expect, beforeEach } from 'vitest'
import {
  vypocitejAnuitniSplatku,
  sestavAmortizacniPlan,
  celkovyPreplatek,
  simulujSplaceniDluhu,
} from '@/miniapps/uver-kalkulacka/types'
import type { Dluh } from '@/miniapps/uver-kalkulacka/types'
import { useUverKalkulackaStore } from '@/miniapps/uver-kalkulacka/useUverKalkulacka'
import { validateUverKalkulackaData } from '@/core/utils/uverKalkulackaValidation'

describe('vypocitejAnuitniSplatku', () => {
  it('bez úroku vrátí jistinu rozdělenou rovnoměrně na měsíce', () => {
    expect(vypocitejAnuitniSplatku(12000, 0, 12)).toBe(1000)
  })

  it('s úrokem vrátí splátku vyšší než prostá jistina/měsíce', () => {
    const bezUroku = 12000 / 12
    const sUrokem = vypocitejAnuitniSplatku(12000, 10, 12)
    expect(sUrokem).toBeGreaterThan(bezUroku)
  })

  it('nulová jistina nebo nulová doba vrátí 0, ne NaN', () => {
    expect(vypocitejAnuitniSplatku(0, 5, 12)).toBe(0)
    expect(vypocitejAnuitniSplatku(10000, 5, 0)).toBe(0)
  })
})

describe('sestavAmortizacniPlan', () => {
  it('poslední měsíc doplácí přesně zbývající jistinu, zůstatek skončí na nule', () => {
    const plan = sestavAmortizacniPlan(50000, 8, 24)
    expect(plan).toHaveLength(24)
    expect(plan[plan.length - 1].zbyvajiciJistina).toBe(0)
  })

  it('zbývající jistina klesá měsíc od měsíce (nikdy neroste)', () => {
    const plan = sestavAmortizacniPlan(100000, 6, 36)
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].zbyvajiciJistina).toBeLessThanOrEqual(plan[i - 1].zbyvajiciJistina)
    }
  })

  it('bez úroku je úroková složka každého měsíce nulová', () => {
    const plan = sestavAmortizacniPlan(10000, 0, 10)
    expect(plan.every((m) => m.urok === 0)).toBe(true)
  })

  it('neplatná jistina/doba vrátí prázdný plán', () => {
    expect(sestavAmortizacniPlan(0, 5, 12)).toEqual([])
    expect(sestavAmortizacniPlan(10000, 5, 0)).toEqual([])
  })
})

describe('celkovyPreplatek', () => {
  it('bez úroku je přeplatek nulový', () => {
    const plan = sestavAmortizacniPlan(50000, 0, 12)
    expect(celkovyPreplatek(plan)).toBe(0)
  })

  it('s úrokem je přeplatek kladný', () => {
    const plan = sestavAmortizacniPlan(50000, 12, 24)
    expect(celkovyPreplatek(plan)).toBeGreaterThan(0)
  })
})

describe('simulujSplaceniDluhu', () => {
  const dluhy: Dluh[] = [
    { id: 'a', nazev: 'Malý, vysoký úrok', zustatek: 5000, urokRocniProcenta: 20, minimalniSplatka: 500 },
    { id: 'b', nazev: 'Velký, nízký úrok', zustatek: 50000, urokRocniProcenta: 5, minimalniSplatka: 1000 },
  ]

  it('sněhová koule splatí první dluh s nejmenším zůstatkem, bez ohledu na úrok', () => {
    const vysledek = simulujSplaceniDluhu(dluhy, 2000, 'snehova-koule')
    expect(vysledek.poradiSplaceni[0].id).toBe('a')
  })

  it('lavina splatí první dluh s nejvyšším úrokem, bez ohledu na zůstatek', () => {
    const vysledek = simulujSplaceniDluhu(dluhy, 2000, 'lavina')
    expect(vysledek.poradiSplaceni[0].id).toBe('a') // tady je to i s nejvyšším úrokem shodou okolností stejný dluh
  })

  it('lavina dá menší nebo stejný celkový úrok než sněhová koule pro stejné dluhy', () => {
    const snehovaKoule = simulujSplaceniDluhu(dluhy, 2000, 'snehova-koule')
    const lavina = simulujSplaceniDluhu(dluhy, 2000, 'lavina')
    expect(lavina.celkovyUrok).toBeLessThanOrEqual(snehovaKoule.celkovyUrok)
  })

  it('nakonec splatí oba dluhy (zbývající celkem klesne na 0)', () => {
    const vysledek = simulujSplaceniDluhu(dluhy, 3000, 'lavina')
    expect(vysledek.poradiSplaceni).toHaveLength(2)
    expect(vysledek.prubeh[vysledek.prubeh.length - 1].zbyvajiciCelkem).toBe(0)
    expect(vysledek.nedokonceno).toBe(false)
  })

  it('s nedostatečným rozpočtem navíc a nízkými minimálními splátkami se dluh nesplatí ani za 50 let', () => {
    const nesplatitelne: Dluh[] = [{ id: 'x', nazev: 'Past', zustatek: 1000000, urokRocniProcenta: 30, minimalniSplatka: 100 }]
    const vysledek = simulujSplaceniDluhu(nesplatitelne, 0, 'lavina')
    expect(vysledek.nedokonceno).toBe(true)
  })

  it('prázdný seznam dluhů vrátí okamžitě prázdný výsledek', () => {
    const vysledek = simulujSplaceniDluhu([], 1000, 'lavina')
    expect(vysledek.celkovyPocetMesicu).toBe(0)
    expect(vysledek.poradiSplaceni).toEqual([])
    expect(vysledek.nedokonceno).toBe(false)
  })
})

describe('validateUverKalkulackaData', () => {
  it('poškozenou položku (bez názvu, nulový zůstatek) tiše vyřadí', () => {
    const vysledek = validateUverKalkulackaData({
      dluhy: [
        { id: '1', nazev: 'Kreditka', zustatek: 5000, urokRocniProcenta: 20, minimalniSplatka: 500 },
        { id: '2', nazev: '', zustatek: 1000, urokRocniProcenta: 5, minimalniSplatka: 100 },
        { id: '3', nazev: 'Nulový', zustatek: 0, urokRocniProcenta: 5, minimalniSplatka: 100 },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.dluhy).toHaveLength(1)
      expect(vysledek.data.dluhy[0].nazev).toBe('Kreditka')
    }
  })
})

describe('useUverKalkulackaStore', () => {
  beforeEach(() => {
    useUverKalkulackaStore.setState({ dluhy: [] })
  })

  it('pridatDluh přidá nový dluh se zaokrouhlenými hodnotami', () => {
    useUverKalkulackaStore.getState().pridatDluh('Kreditka', 5000.6, 19.9, 500.4)
    const dluhy = useUverKalkulackaStore.getState().dluhy
    expect(dluhy).toHaveLength(1)
    expect(dluhy[0].zustatek).toBe(5001)
    expect(dluhy[0].minimalniSplatka).toBe(500)
  })

  it('nulový nebo záporný zůstatek dluh nepřidá', () => {
    useUverKalkulackaStore.getState().pridatDluh('Nic', 0, 10, 100)
    expect(useUverKalkulackaStore.getState().dluhy).toHaveLength(0)
  })

  it('smazatDluh odstraní jen zadaný dluh', () => {
    useUverKalkulackaStore.getState().pridatDluh('A', 1000, 5, 100)
    useUverKalkulackaStore.getState().pridatDluh('B', 2000, 5, 100)
    const id = useUverKalkulackaStore.getState().dluhy.find((d) => d.nazev === 'A')!.id

    useUverKalkulackaStore.getState().smazatDluh(id)

    const zbyle = useUverKalkulackaStore.getState().dluhy
    expect(zbyle).toHaveLength(1)
    expect(zbyle[0].nazev).toBe('B')
  })
})
