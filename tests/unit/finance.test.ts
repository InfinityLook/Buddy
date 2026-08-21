import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { dnesniMesic, minulyMesic, patriDoObdobi, rozdelPodleKategorie } from '@/miniapps/finance/useFinance'
import type { Transaction } from '@/miniapps/finance/types'

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
