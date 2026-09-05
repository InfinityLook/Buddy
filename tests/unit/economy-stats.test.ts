import { describe, it, expect } from 'vitest'
import { spocitatMesicniSrovnani, formatujRozdilMesic } from '@/flagships/economy-room/economyStats'
import type { Transaction, TransactionType } from '@/miniapps/finance/types'

// Den 15 je schválně mimo okrajové případy (1./28.-31.) — posun o měsíc
// zpátky z 15. nikdy nepřeskočí ani neopakuje měsíc jinak, než setDate(1)
// dělá uvnitř skutečného minulyMesic() v useFinance.ts.
const datumPredMesici = (pocetMesicu: number): string => {
  const d = new Date()
  d.setDate(15)
  d.setMonth(d.getMonth() - pocetMesicu)
  return d.toISOString().slice(0, 10)
}

const transakce = (type: TransactionType, amount: number, mesicniOffset: number): Transaction => ({
  id: `${Math.random()}`,
  type,
  amount,
  category: type === 'prijem' ? 'Kapesné' : 'Jídlo',
  note: '',
  date: datumPredMesici(mesicniOffset),
  createdAt: new Date().toISOString(),
})

describe('spocitatMesicniSrovnani', () => {
  it('sečte jen transakce z minulého měsíce, ne tento ani starší', () => {
    const vysledek = spocitatMesicniSrovnani([
      transakce('prijem', 500, 0), // tento měsíc — nepočítá se
      transakce('prijem', 300, 1), // minulý měsíc
      transakce('prijem', 200, 1), // minulý měsíc
      transakce('vydaj', 150, 1), // minulý měsíc
      transakce('vydaj', 999, 2), // předminulý měsíc — nepočítá se
    ])

    expect(vysledek.prijmyMinuly).toBe(500)
    expect(vysledek.vydajeMinuly).toBe(150)
  })

  it('bez transakcí vrátí nulové srovnání', () => {
    expect(spocitatMesicniSrovnani([])).toEqual({ prijmyMinuly: 0, vydajeMinuly: 0 })
  })
})

describe('formatujRozdilMesic', () => {
  it('kladný rozdíl dostane znaménko plus a jednotku Kč', () => {
    expect(formatujRozdilMesic(1500, 1200)).toBe('+300 Kč vs min. měsíc')
  })

  it('záporný rozdíl dostane znaménko mínus a absolutní hodnotu', () => {
    expect(formatujRozdilMesic(800, 1000)).toBe('−200 Kč vs min. měsíc')
  })

  it('stejná hodnota hlásí "stejně jako minulý měsíc", ne "+0 Kč"', () => {
    expect(formatujRozdilMesic(500, 500)).toBe('stejně jako minulý měsíc')
  })
})
