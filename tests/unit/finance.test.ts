import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  dnesniMesic,
  minulyMesic,
  patriDoObdobi,
  rozdelPodleKategorie,
  spocitejMesicniTrend,
  spocitejStavRozpoctu,
  melaByBytPridanaDnes,
  spocitejStavCile,
  sestavCsvTransakci,
} from '@/miniapps/finance/types'
import type { Budget, FinanceGoal, RecurringTransaction, Transaction } from '@/miniapps/finance/types'

// ==========================================
// miniapps/finance/useFinance.ts — filtr podle období a rozpad podle
// kategorie. Vyexportováno z hooku výhradně pro testy (viz komentář
// v useFinance.ts) — zbytek hooku (useFinanceStore, useMemo řetězce)
// zůstává netestovaný na téhle úrovni, protože potřebuje Zustand
// store + React, ne jen vstup/výstup.
// ==========================================

const transakce = (over: Partial<Transaction>): Transaction => ({
  id: '1',
  type: 'vydaj',
  amount: 100,
  category: 'Jídlo',
  note: '',
  date: '2026-08-15',
  createdAt: '2026-08-15T10:00:00.000Z',
  walletId: null,
  receiptId: null,
  receiptMime: null,
  updatedAt: 0,
  deletedAt: null,
  ...over,
})

describe('dnesniMesic / minulyMesic', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T12:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('vrací aktuální a předchozí měsíc ve tvaru YYYY-MM', () => {
    expect(dnesniMesic()).toBe('2026-08')
    expect(minulyMesic()).toBe('2026-07')
  })

  it('na přelomu roku správně přejde z ledna do prosince minulého roku', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00'))
    expect(minulyMesic()).toBe('2025-12')
  })

  it('u 31. dne v měsíci nepřeskočí měsíc navíc (kvůli setDate(1) před odečtem)', () => {
    vi.setSystemTime(new Date('2026-05-31T12:00:00'))
    expect(minulyMesic()).toBe('2026-04')
  })
})

describe('patriDoObdobi', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T12:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('"vse" pustí libovolné datum', () => {
    expect(patriDoObdobi(transakce({ date: '2020-01-01' }), 'vse')).toBe(true)
  })

  it('"tento-mesic" pustí jen aktuální měsíc', () => {
    expect(patriDoObdobi(transakce({ date: '2026-08-05' }), 'tento-mesic')).toBe(true)
    expect(patriDoObdobi(transakce({ date: '2026-07-31' }), 'tento-mesic')).toBe(false)
  })

  it('"minuly-mesic" pustí jen předchozí měsíc', () => {
    expect(patriDoObdobi(transakce({ date: '2026-07-10' }), 'minuly-mesic')).toBe(true)
    expect(patriDoObdobi(transakce({ date: '2026-08-10' }), 'minuly-mesic')).toBe(false)
  })
})

describe('rozdelPodleKategorie', () => {
  it('prázdný seznam vrátí prázdné pole, ne dělení nulou', () => {
    expect(rozdelPodleKategorie([])).toEqual([])
  })

  it('sečte částky podle kategorie a seřadí od největší', () => {
    const vysledek = rozdelPodleKategorie([
      transakce({ category: 'Jídlo', amount: 100 }),
      transakce({ category: 'Doprava', amount: 300 }),
      transakce({ category: 'Jídlo', amount: 50 }),
    ])

    expect(vysledek.map((v) => v.category)).toEqual(['Doprava', 'Jídlo'])
    expect(vysledek[1].amount).toBe(150)
  })

  it('procenta se sečtou přesně na 100', () => {
    const vysledek = rozdelPodleKategorie([
      transakce({ category: 'Jídlo', amount: 25 }),
      transakce({ category: 'Doprava', amount: 75 }),
    ])

    const soucetProcent = vysledek.reduce((s, v) => s + v.percent, 0)
    expect(soucetProcent).toBeCloseTo(100)
    expect(vysledek.find((v) => v.category === 'Doprava')!.percent).toBeCloseTo(75)
  })
})

describe('spocitejMesicniTrend', () => {
  it('vrátí přesně požadovaný počet měsíců, i pro prázdný vstup', () => {
    const body = spocitejMesicniTrend([], 12, new Date('2026-08-15'))
    expect(body).toHaveLength(12)
    expect(body[11].mesic).toBe('2026-08')
    expect(body[0].mesic).toBe('2025-09')
    expect(body.every((b) => b.prijmy === 0 && b.vydaje === 0)).toBe(true)
  })

  it('sečte příjmy a výdaje do správného měsíce', () => {
    const body = spocitejMesicniTrend(
      [
        transakce({ type: 'prijem', amount: 500, date: '2026-08-05' }),
        transakce({ type: 'vydaj', amount: 200, date: '2026-08-10' }),
        transakce({ type: 'vydaj', amount: 999, date: '2026-06-01' }),
      ],
      3,
      new Date('2026-08-20')
    )

    expect(body.map((b) => b.mesic)).toEqual(['2026-06', '2026-07', '2026-08'])
    expect(body[0].vydaje).toBe(999)
    expect(body[2].prijmy).toBe(500)
    expect(body[2].vydaje).toBe(200)
  })

  it('respektuje vlastní délku okna (roční přehled = 12 měsíců)', () => {
    expect(spocitejMesicniTrend([], 6, new Date('2026-01-15'))).toHaveLength(6)
  })
})

describe('spocitejStavRozpoctu', () => {
  const rozpocet = (over: Partial<Budget>): Budget => ({
    id: 'b1',
    category: 'Jídlo',
    limitKc: 1000,
    createdAt: '',
    updatedAt: 0,
    deletedAt: null,
    ...over,
  })

  it('sečte jen výdaje dané kategorie z předaných transakcí', () => {
    const stavy = spocitejStavRozpoctu(
      [rozpocet({})],
      [
        transakce({ type: 'vydaj', category: 'Jídlo', amount: 300 }),
        transakce({ type: 'vydaj', category: 'Jídlo', amount: 200 }),
        transakce({ type: 'vydaj', category: 'Doprava', amount: 999 }),
        transakce({ type: 'prijem', category: 'Kapesné', amount: 999 }),
      ]
    )

    expect(stavy).toHaveLength(1)
    expect(stavy[0].utraceno).toBe(500)
    expect(stavy[0].procenta).toBe(50)
    expect(stavy[0].jePrekrocen).toBe(false)
  })

  it('označí rozpočet jako překročený, když útrata přesáhne limit', () => {
    const [stav] = spocitejStavRozpoctu(
      [rozpocet({ limitKc: 100 })],
      [transakce({ type: 'vydaj', category: 'Jídlo', amount: 150 })]
    )
    expect(stav.jePrekrocen).toBe(true)
    expect(stav.procenta).toBe(150)
  })

  it('nulový limit se nedělí nulou — vrátí 0 %', () => {
    const [stav] = spocitejStavRozpoctu([rozpocet({ limitKc: 0 })], [])
    expect(stav.procenta).toBe(0)
  })
})

describe('melaByBytPridanaDnes', () => {
  const opakujici = (over: Partial<RecurringTransaction>): RecurringTransaction => ({
    id: 'r1',
    type: 'vydaj',
    amount: 500,
    category: 'Škola',
    note: '',
    dayOfMonth: 15,
    active: true,
    lastAddedMonth: null,
    createdAt: '',
    updatedAt: 0,
    deletedAt: null,
    ...over,
  })

  it('neaktivní platba se nikdy nepřidá', () => {
    expect(melaByBytPridanaDnes(opakujici({ active: false }), new Date('2026-08-20'))).toBe(false)
  })

  it('před nastaveným dnem v měsíci se nepřidá', () => {
    expect(melaByBytPridanaDnes(opakujici({ dayOfMonth: 20 }), new Date('2026-08-10'))).toBe(false)
  })

  it('v nastavený den nebo později (a ještě nepřidáno tento měsíc) se přidá', () => {
    expect(melaByBytPridanaDnes(opakujici({ dayOfMonth: 15 }), new Date('2026-08-15'))).toBe(true)
    expect(melaByBytPridanaDnes(opakujici({ dayOfMonth: 15 }), new Date('2026-08-25'))).toBe(true)
  })

  it('už přidáno tento měsíc — nepřidá se podruhé', () => {
    expect(
      melaByBytPridanaDnes(opakujici({ dayOfMonth: 1, lastAddedMonth: '2026-08' }), new Date('2026-08-25'))
    ).toBe(false)
  })

  it('nový měsíc po předchozím přidání znovu umožní přidání', () => {
    expect(
      melaByBytPridanaDnes(opakujici({ dayOfMonth: 1, lastAddedMonth: '2026-07' }), new Date('2026-08-05'))
    ).toBe(true)
  })
})

describe('spocitejStavCile', () => {
  const cil = (over: Partial<FinanceGoal>): FinanceGoal => ({
    id: 'g1',
    name: 'Notebook',
    targetAmount: 10000,
    deadline: null,
    createdAt: '',
    updatedAt: 0,
    deletedAt: null,
    ...over,
  })

  it('spočítá procenta vůči skutečnému zůstatku', () => {
    const stav = spocitejStavCile(cil({ targetAmount: 1000 }), 250)
    expect(stav.procenta).toBe(25)
    expect(stav.jeSplneny).toBe(false)
  })

  it('záporný zůstatek se počítá jako 0 %, ne záporné procento', () => {
    const stav = spocitejStavCile(cil({ targetAmount: 1000 }), -500)
    expect(stav.procenta).toBe(0)
  })

  it('procenta se ořežou na 100, i když zůstatek cíl výrazně přesáhne', () => {
    const stav = spocitejStavCile(cil({ targetAmount: 1000 }), 5000)
    expect(stav.procenta).toBe(100)
    expect(stav.jeSplneny).toBe(true)
  })

  it('cíl s nulovou cílovou částkou vrátí 0 % místo dělení nulou', () => {
    expect(spocitejStavCile(cil({ targetAmount: 0 }), 100).procenta).toBe(0)
  })
})

describe('sestavCsvTransakci', () => {
  it('začíná BOM a obsahuje hlavičku se středníkem jako oddělovačem', () => {
    const csv = sestavCsvTransakci([])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('Datum;Typ;Kategorie;Částka (Kč);Poznámka')
  })

  it('řádek obsahuje typ přeložený do češtiny a částku beze znaménka', () => {
    const csv = sestavCsvTransakci([transakce({ type: 'vydaj', category: 'Jídlo', amount: 150, date: '2026-08-01' })])
    expect(csv).toContain('2026-08-01;Výdaj;Jídlo;150;')
  })

  it('poznámka se středníkem nebo uvozovkou se obalí do uvozovek a escapuje', () => {
    const csv = sestavCsvTransakci([transakce({ note: 'Oběd; "u Karla"' })])
    expect(csv).toContain('"Oběd; ""u Karla"""')
  })
})
