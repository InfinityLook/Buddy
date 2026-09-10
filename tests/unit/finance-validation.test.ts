import { describe, it, expect } from 'vitest'
import { validateFinanceData } from '@/core/utils/financeValidation'

// ==========================================
// core/utils/financeValidation.ts — stejný "poškozená položka se tiše
// vyřadí, ne celý seznam" vzor jako u ostatních miniaplikací.
// ==========================================

describe('validateFinanceData', () => {
  it('chybějící/nesprávný tvar celého objektu spadne na výchozí prázdné seznamy', () => {
    const vysledek = validateFinanceData({})
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    expect(vysledek.data.transactions).toEqual([])
    expect(vysledek.data.wallets).toEqual([])
    expect(vysledek.data.budgets).toEqual([])
    expect(vysledek.data.recurring).toEqual([])
    expect(vysledek.data.goals).toEqual([])
  })

  it('naprosto neplatný vstup (ne objekt) selže', () => {
    const vysledek = validateFinanceData('nesmysl')
    expect(vysledek.success).toBe(false)
  })

  it('poškozená transakce se tiše vyřadí, platná zůstane', () => {
    const platna = {
      id: 't1',
      type: 'vydaj',
      amount: 100,
      category: 'Jídlo',
      date: '2026-08-01',
      createdAt: '2026-08-01T10:00:00.000Z',
    }
    const poskozena = { id: 't2', type: 'nesmyslny-typ', amount: 100, category: 'Jídlo' }
    const zapornaCastka = { id: 't3', type: 'vydaj', amount: -50, category: 'Jídlo' }
    const spatnaKategorie = { id: 't4', type: 'vydaj', amount: 50, category: 'Neexistujici' }

    const vysledek = validateFinanceData({ transactions: [platna, poskozena, zapornaCastka, spatnaKategorie] })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    expect(vysledek.data.transactions).toHaveLength(1)
    expect(vysledek.data.transactions[0].id).toBe('t1')
  })

  it('peněženka bez jména (jen mezery) se vyřadí', () => {
    const vysledek = validateFinanceData({
      wallets: [
        { id: 'w1', name: 'Hotovost' },
        { id: 'w2', name: '   ' },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    expect(vysledek.data.wallets).toHaveLength(1)
    expect(vysledek.data.wallets[0].id).toBe('w1')
  })

  it('rozpočet se špatnou (příjmovou) kategorií nebo záporným limitem se vyřadí', () => {
    const vysledek = validateFinanceData({
      budgets: [
        { id: 'b1', category: 'Jídlo', limitKc: 1000 },
        { id: 'b2', category: 'Kapesné', limitKc: 1000 }, // příjmová kategorie u výdajového rozpočtu
        { id: 'b3', category: 'Doprava', limitKc: -1 },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    expect(vysledek.data.budgets).toHaveLength(1)
    expect(vysledek.data.budgets[0].id).toBe('b1')
  })

  it('opakující se platba s dnem mimo 1–28 se vyřadí', () => {
    const vysledek = validateFinanceData({
      recurring: [
        { id: 'r1', type: 'vydaj', amount: 500, category: 'Škola', dayOfMonth: 15 },
        { id: 'r2', type: 'vydaj', amount: 500, category: 'Škola', dayOfMonth: 31 },
        { id: 'r3', type: 'vydaj', amount: 500, category: 'Škola', dayOfMonth: 0 },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    expect(vysledek.data.recurring).toHaveLength(1)
    expect(vysledek.data.recurring[0].id).toBe('r1')
  })

  it('cíl bez jména nebo se zápornou cílovou částkou se vyřadí', () => {
    const vysledek = validateFinanceData({
      goals: [
        { id: 'g1', name: 'Notebook', targetAmount: 10000 },
        { id: 'g2', name: '', targetAmount: 5000 },
        { id: 'g3', name: 'Kolo', targetAmount: -100 },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    expect(vysledek.data.goals).toHaveLength(1)
    expect(vysledek.data.goals[0].id).toBe('g1')
  })

  it('chybějící volitelná pole (walletId/receiptId/updatedAt/deletedAt) se doplní bezpečnými výchozími hodnotami', () => {
    const vysledek = validateFinanceData({
      transactions: [{ id: 't1', type: 'prijem', amount: 100, category: 'Kapesné' }],
    })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    const [t] = vysledek.data.transactions
    expect(t.walletId).toBeNull()
    expect(t.receiptId).toBeNull()
    expect(t.deletedAt).toBeNull()
    expect(t.updatedAt).toBe(0)
  })
})
