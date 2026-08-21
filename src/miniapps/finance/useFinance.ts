import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import {
  FinanceCategory,
  KategorieVysek,
  MesicniBod,
  NewTransaction,
  ObdobiFiltr,
  Transaction,
  TypFiltr,
} from './types'

// XP je nízké schválně — transakce se zadávají často, klidně několikrát
// denně, takže i malá odměna se rychle sečte. Vysoké číslo by z placení
// za oběd udělalo výnosnější činnost než dokončení Pomodora.
const XP_PER_TRANSACTION = 3

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface FinanceState {
  transactions: Transaction[]
  addTransaction: (input: NewTransaction) => void
  updateTransaction: (id: string, input: NewTransaction) => void
  deleteTransaction: (id: string) => void
}

const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      transactions: [],

      addTransaction: (input) => {
        set((state) => ({
          transactions: [
            ...state.transactions,
            { ...input, id: noveId(), createdAt: new Date().toISOString() },
          ],
        }))

        // Počítadlo a XP se hlásí přes recordAction, ne addXp — jinak by
        // šlo, aby se rozešly a odznak "Rozpočtář" se odemkl v jiný
        // okamžik, než kolik transakcí uživatel doopravdy zapsal.
        useGamificationStore.getState().recordAction('transaction', XP_PER_TRANSACTION)
      },

      // Úprava záznamu XP nedává — jinak by šlo body vydělávat tím, že se
      // ta samá transakce dokola jen přejmenuje.
      updateTransaction: (id, input) => {
        set((state) => ({
          transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...input } : t)),
        }))
      },

      deleteTransaction: (id) => {
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }))
      },
    }),
    {
      name: 'schoolbuddy-finance-storage',
      storage: createJSONStorage(() => secureStorage),
      // Poškozené nebo ručně upravené úložiště nesmí aplikaci shodit —
      // radši prázdný seznam transakcí než pád při startu.
      merge: (persisted, current) => {
        const saved = persisted as Partial<FinanceState> | undefined
        const transactions = Array.isArray(saved?.transactions)
          ? saved.transactions.filter(
              (t): t is Transaction =>
                !!t &&
                typeof t.id === 'string' &&
                (t.type === 'prijem' || t.type === 'vydaj') &&
                typeof t.amount === 'number' &&
                Number.isFinite(t.amount) &&
                typeof t.category === 'string' &&
                typeof t.date === 'string'
            )
          : []
        return { ...current, ...saved, transactions }
      },
    }
  )
)

const dnesniMesic = () => new Date().toISOString().slice(0, 7) // YYYY-MM

const minulyMesic = () => {
  const d = new Date()
  d.setDate(1) // jinak by ubrání měsíce u 31. mohlo přeskočit rovnou o dva
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 7)
}

const patriDoObdobi = (transaction: Transaction, obdobi: ObdobiFiltr): boolean => {
  if (obdobi === 'vse') return true
  const mesic = transaction.date.slice(0, 7)
  return obdobi === 'tento-mesic' ? mesic === dnesniMesic() : mesic === minulyMesic()
}

const MESICE_ZKRATKY = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro']

/** Rozdělí transakce daného typu podle kategorie, seřazené od největší. */
const rozdelPodleKategorie = (transactions: Transaction[]): KategorieVysek[] => {
  const soucty = new Map<FinanceCategory, number>()
  for (const t of transactions) soucty.set(t.category, (soucty.get(t.category) ?? 0) + t.amount)

  const celkem = [...soucty.values()].reduce((a, b) => a + b, 0)
  if (celkem === 0) return []

  return [...soucty.entries()]
    .map(([category, amount]) => ({ category, amount, percent: (amount / celkem) * 100 }))
    .sort((a, b) => b.amount - a.amount)
}

export const useFinance = () => {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useFinanceStore()

  const [typFiltr, setTypFiltr] = useState<TypFiltr>('vse')
  const [obdobiFiltr, setObdobiFiltr] = useState<ObdobiFiltr>('tento-mesic')

  // Transakce ve zvoleném období — základ pro souhrn i grafy. Filtr podle
  // typu (jen příjmy / jen výdaje) se týká výhradně seznamu níž, ať se
  // souhrn a grafy neposouvají jen proto, že si uživatel chce prohlédnout
  // samotné výdaje.
  const obdobiTransactions = useMemo(
    () => transactions.filter((t) => patriDoObdobi(t, obdobiFiltr)),
    [transactions, obdobiFiltr]
  )

  const seznam = useMemo(() => {
    return obdobiTransactions
      .filter((t) => typFiltr === 'vse' || t.type === typFiltr)
      .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
  }, [obdobiTransactions, typFiltr])

  // Skutečný zůstatek se počítá ze VŠECH transakcí, bez ohledu na
  // zvolené období — jinak by "Minulý měsíc" ukazoval zůstatek, který
  // nikdy doopravdy neplatil.
  const zustatek = useMemo(
    () =>
      transactions.reduce((sum, t) => sum + (t.type === 'prijem' ? t.amount : -t.amount), 0),
    [transactions]
  )

  const prijmyObdobi = useMemo(
    () => obdobiTransactions.filter((t) => t.type === 'prijem').reduce((s, t) => s + t.amount, 0),
    [obdobiTransactions]
  )
  const vydajeObdobi = useMemo(
    () => obdobiTransactions.filter((t) => t.type === 'vydaj').reduce((s, t) => s + t.amount, 0),
    [obdobiTransactions]
  )

  const kategorieVydaje = useMemo(
    () => rozdelPodleKategorie(obdobiTransactions.filter((t) => t.type === 'vydaj')),
    [obdobiTransactions]
  )
  const kategoriePrijmy = useMemo(
    () => rozdelPodleKategorie(obdobiTransactions.filter((t) => t.type === 'prijem')),
    [obdobiTransactions]
  )

  // Trend posledních 6 měsíců (včetně aktuálního) — pevné okno bez ohledu
  // na filtr období, ať je vždycky vidět stejný kus historie.
  const mesicniTrend = useMemo((): MesicniBod[] => {
    const body: MesicniBod[] = []
    const d = new Date()
    d.setDate(1)

    for (let i = 5; i >= 0; i--) {
      const bod = new Date(d)
      bod.setMonth(bod.getMonth() - i)
      const klic = bod.toISOString().slice(0, 7)

      const tohoMesice = transactions.filter((t) => t.date.slice(0, 7) === klic)
      body.push({
        mesic: klic,
        label: MESICE_ZKRATKY[bod.getMonth()],
        prijmy: tohoMesice.filter((t) => t.type === 'prijem').reduce((s, t) => s + t.amount, 0),
        vydaje: tohoMesice.filter((t) => t.type === 'vydaj').reduce((s, t) => s + t.amount, 0),
      })
    }

    return body
  }, [transactions])

  return {
    seznam,
    pocetCelkem: transactions.length,
    typFiltr,
    setTypFiltr,
    obdobiFiltr,
    setObdobiFiltr,
    zustatek,
    prijmyObdobi,
    vydajeObdobi,
    kategorieVydaje,
    kategoriePrijmy,
    mesicniTrend,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  }
}
