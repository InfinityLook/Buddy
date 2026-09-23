import { describe, it, expect } from 'vitest'
import { spocitatMesicniSrovnani, formatujRozdilMesic, spocitejGrafCistehoJmeni } from '@/flagships/economy-room/economyStats'
import type { Transaction, TransactionType, Wallet } from '@/miniapps/finance/types'

// Den 15 je schválně mimo okrajové případy (1./28.-31.) — posun o měsíc
// zpátky z 15. nikdy nepřeskočí ani neopakuje měsíc jinak, než setDate(1)
// dělá uvnitř skutečného minulyMesic() v useFinance.ts.
const datumPredMesici = (pocetMesicu: number): string => {
  const d = new Date()
  d.setDate(15)
  d.setMonth(d.getMonth() - pocetMesicu)
  return d.toISOString().slice(0, 10)
}

const transakce = (
  type: TransactionType,
  amount: number,
  mesicniOffset: number,
  presunId: string | null = null
): Transaction => ({
  id: `${Math.random()}`,
  type,
  amount,
  category: type === 'prijem' ? 'Kapesné' : 'Jídlo',
  note: '',
  date: datumPredMesici(mesicniOffset),
  createdAt: new Date().toISOString(),
  walletId: null,
  receiptId: null,
  receiptMime: null,
  updatedAt: 0,
  deletedAt: null,
  presunId,
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

  it('přesun mezi vlastními peněženkami (presunId) se do srovnání nepočítá', () => {
    const vysledek = spocitatMesicniSrovnani([
      transakce('prijem', 300, 1),
      transakce('vydaj', 5000, 1, 'presun-1'), // přesun — nepočítá se
      transakce('prijem', 5000, 1, 'presun-1'), // přesun — nepočítá se
    ])
    expect(vysledek.prijmyMinuly).toBe(300)
    expect(vysledek.vydajeMinuly).toBe(0)
  })
})

describe('spocitejGrafCistehoJmeni', () => {
  const wallet = (pocatecniZustatek: number, createdAt: string): Wallet => ({
    id: `w-${Math.random()}`,
    name: 'Test',
    icon: null,
    pocatecniZustatek,
    createdAt,
    updatedAt: 0,
    deletedAt: null,
  })

  const tx = (amount: number, type: TransactionType, date: string): Transaction => ({
    id: `${Math.random()}`,
    type,
    amount,
    category: type === 'prijem' ? 'Kapesné' : 'Jídlo',
    note: '',
    date,
    createdAt: `${date}T00:00:00.000Z`,
    walletId: null,
    receiptId: null,
    receiptMime: null,
    updatedAt: 0,
    deletedAt: null,
    presunId: null,
  })

  // Pevné referenční "teď" — appka jinak počítá od Date.now(), což by
  // dělalo test nedeterministickým.
  const ted = new Date(2024, 5, 15) // 15. června 2024

  it('počítá čisté jmění ke konci každého měsíce, ne k jeho začátku', () => {
    const wallets = [wallet(1000, '2024-01-01')]
    const transactions = [
      tx(500, 'prijem', '2024-04-10'),
      tx(200, 'vydaj', '2024-05-20'),
    ]

    const body = spocitejGrafCistehoJmeni(transactions, wallets, 6, ted)

    // Leden: jen počáteční vklad
    expect(body.find((b) => b.mesic === '2024-01')?.hodnota).toBe(1000)
    // Duben: počáteční + příjem
    expect(body.find((b) => b.mesic === '2024-04')?.hodnota).toBe(1500)
    // Květen: počáteční + příjem − výdaj
    expect(body.find((b) => b.mesic === '2024-05')?.hodnota).toBe(1300)
    // Červen (aktuální): beze změny od května
    expect(body.find((b) => b.mesic === '2024-06')?.hodnota).toBe(1300)
  })

  it('peněženka založená až během okna se nepočítá do dřívějších měsíců', () => {
    const wallets = [wallet(2000, '2024-05-01')]
    const body = spocitejGrafCistehoJmeni([], wallets, 6, ted)

    expect(body.find((b) => b.mesic === '2024-01')?.hodnota).toBe(0)
    expect(body.find((b) => b.mesic === '2024-05')?.hodnota).toBe(2000)
    expect(body.find((b) => b.mesic === '2024-06')?.hodnota).toBe(2000)
  })

  it('vrátí přesně `pocetMesicu` bodů, výchozích 6', () => {
    const body = spocitejGrafCistehoJmeni([], [], undefined, ted)
    expect(body).toHaveLength(6)
    expect(body[body.length - 1].mesic).toBe('2024-06')
    expect(body[0].mesic).toBe('2024-01')
  })

  it('vyskaProcent škáluje 10–90 % podle rozsahu okna, ne od nuly', () => {
    const wallets = [wallet(0, '2024-01-01')]
    const transactions = [tx(1000, 'prijem', '2024-06-01')]
    const body = spocitejGrafCistehoJmeni(transactions, wallets, 6, ted)

    const min = Math.min(...body.map((b) => b.vyskaProcent))
    const max = Math.max(...body.map((b) => b.vyskaProcent))
    expect(min).toBe(10)
    expect(max).toBe(90)
  })

  it('stejná hodnota ve všech měsících dá plochých 50 % (rozsah je 0)', () => {
    const wallets = [wallet(500, '2024-01-01')]
    const body = spocitejGrafCistehoJmeni([], wallets, 6, ted)
    expect(body.every((b) => b.vyskaProcent === 50)).toBe(true)
  })

  it('funguje i pro záporné čisté jmění (peněženka v mínusu)', () => {
    const wallets = [wallet(-500, '2024-01-01')]
    const body = spocitejGrafCistehoJmeni([], wallets, 6, ted)
    expect(body.every((b) => b.hodnota === -500)).toBe(true)
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
