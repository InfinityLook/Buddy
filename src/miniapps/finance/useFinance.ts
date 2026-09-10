import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDbStorage } from '@/core/utils/indexedDbStorage'
import { validateFinanceData } from '@/core/utils/financeValidation'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { requestNotificationPermission, showAppNotification } from '@/core/utils/notify'
import {
  Budget,
  BudgetStav,
  ExpenseCategory,
  FinanceCategory,
  FinanceGoal,
  GoalStav,
  NewTransaction,
  ObdobiFiltr,
  RecurringTransaction,
  Transaction,
  TransactionType,
  TypFiltr,
  Wallet,
  dnesniMesic as dnesniMesicZTypu,
  melaByBytPridanaDnes,
  minulyMesic as minulyMesicZTypu,
  patriDoObdobi as patriDoObdobiZTypu,
  rozdelPodleKategorie as rozdelPodleKategorieZTypu,
  spocitejMesicniTrend,
  spocitejStavCile,
  spocitejStavRozpoctu,
} from './types'

// Re-exportováno pro zpětnou kompatibilitu volajících uvnitř appky
// (EconomyRoomModule.tsx a další, co je zvyklé importovat "od
// useFinance") — skutečné definice žijí v types.ts (viz jeho vlastní
// komentář, proč testy musí importovat odtamtud, ne odsud).
export const dnesniMesic = dnesniMesicZTypu
export const minulyMesic = minulyMesicZTypu
export const patriDoObdobi = patriDoObdobiZTypu
export const rozdelPodleKategorie = rozdelPodleKategorieZTypu

// XP je nízké schválně — transakce se zadávají často, klidně několikrát
// denně, takže i malá odměna se rychle sečte. Vysoké číslo by z placení
// za oběd udělalo výnosnější činnost než dokončení Pomodora.
const XP_PER_TRANSACTION = 3

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

interface FinanceState {
  transactions: Transaction[]
  wallets: Wallet[]
  budgets: Budget[]
  recurring: RecurringTransaction[]
  goals: FinanceGoal[]

  addTransaction: (input: NewTransaction) => void
  updateTransaction: (id: string, input: NewTransaction) => void
  deleteTransaction: (id: string) => void

  addWallet: (name: string, icon: string | null) => void
  updateWallet: (id: string, name: string, icon: string | null) => void
  deleteWallet: (id: string) => void

  addBudget: (category: ExpenseCategory, limitKc: number) => void
  updateBudget: (id: string, limitKc: number) => void
  deleteBudget: (id: string) => void

  addRecurring: (input: {
    type: TransactionType
    amount: number
    category: FinanceCategory
    note: string
    dayOfMonth: number
  }) => void
  updateRecurring: (id: string, active: boolean) => void
  deleteRecurring: (id: string) => void

  addGoal: (name: string, targetAmount: number, deadline: string | null) => void
  deleteGoal: (id: string) => void

  /** Projde aktivní opakující se platby a přidá ty, co jsou dnes na
   *  řadě — volá se z checkRecurringDue níž, ne přímo z UI. */
  zpracujOpakujiciSePlatby: () => void
}

const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      wallets: [],
      budgets: [],
      recurring: [],
      goals: [],

      addTransaction: (input) => {
        set((state) => ({
          transactions: [
            ...state.transactions,
            {
              ...input,
              id: noveId(),
              createdAt: new Date().toISOString(),
              walletId: input.walletId ?? null,
              receiptId: input.receiptId ?? null,
              receiptMime: input.receiptMime ?? null,
              updatedAt: Date.now(),
              deletedAt: null,
            },
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
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...input, updatedAt: Date.now() } : t
          ),
        }))
      },

      // Měkké smazání — viz types.ts's komentář u Transaction.deletedAt.
      // Skutečné odstranění z pole by cloudové synchronizaci nedalo nic,
      // co by mohla poslat ostatním zařízením jako "tohle je pryč".
      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, deletedAt: Date.now(), updatedAt: Date.now() } : t
          ),
        }))
      },

      addWallet: (name, icon) => {
        if (!name.trim()) return
        const nova: Wallet = {
          id: noveId(),
          name: name.trim(),
          icon,
          createdAt: new Date().toISOString(),
          updatedAt: Date.now(),
          deletedAt: null,
        }
        set((state) => ({ wallets: [...state.wallets, nova] }))
      },

      updateWallet: (id, name, icon) => {
        if (!name.trim()) return
        set((state) => ({
          wallets: state.wallets.map((w) =>
            w.id === id ? { ...w, name: name.trim(), icon, updatedAt: Date.now() } : w
          ),
        }))
      },

      deleteWallet: (id) => {
        set((state) => ({
          wallets: state.wallets.map((w) =>
            w.id === id ? { ...w, deletedAt: Date.now(), updatedAt: Date.now() } : w
          ),
          // Transakce zařazené do smazané peněženky se nemažou ani
          // neztrácí — jen se odpojí zpátky na "nezařazeno", stejné
          // ON DELETE SET NULL chování, jaké Music Studio's smazaná
          // nahrávka/beat dělá se skladbou, co na ně odkazovala.
          transactions: state.transactions.map((t) =>
            t.walletId === id ? { ...t, walletId: null, updatedAt: Date.now() } : t
          ),
        }))
      },

      addBudget: (category, limitKc) => {
        if (!Number.isFinite(limitKc) || limitKc <= 0) return
        // Jeden rozpočet na kategorii nejvýš — druhé nastavení stejné
        // kategorie přepíše limit prvního, ne že by vznikly dva
        // soupeřící rozpočty na tu samou kategorii.
        const existujici = get().budgets.find((b) => b.category === category && !b.deletedAt)
        if (existujici) {
          get().updateBudget(existujici.id, limitKc)
          return
        }
        const novy: Budget = {
          id: noveId(),
          category,
          limitKc: Math.round(limitKc),
          createdAt: new Date().toISOString(),
          updatedAt: Date.now(),
          deletedAt: null,
        }
        set((state) => ({ budgets: [...state.budgets, novy] }))
      },

      updateBudget: (id, limitKc) => {
        if (!Number.isFinite(limitKc) || limitKc <= 0) return
        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === id ? { ...b, limitKc: Math.round(limitKc), updatedAt: Date.now() } : b
          ),
        }))
      },

      deleteBudget: (id) => {
        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === id ? { ...b, deletedAt: Date.now(), updatedAt: Date.now() } : b
          ),
        }))
      },

      addRecurring: (input) => {
        if (!Number.isFinite(input.amount) || input.amount <= 0) return
        // Založení první opakující se platby je nejpřirozenější chvíle
        // zeptat se na svolení k notifikacím — stejné gesto jako
        // Planerovo addTask/Pomodorovo start().
        requestNotificationPermission()
        const nova: RecurringTransaction = {
          id: noveId(),
          type: input.type,
          amount: Math.round(input.amount),
          category: input.category,
          note: input.note.trim(),
          dayOfMonth: Math.min(28, Math.max(1, Math.round(input.dayOfMonth))),
          active: true,
          lastAddedMonth: null,
          createdAt: new Date().toISOString(),
          updatedAt: Date.now(),
          deletedAt: null,
        }
        set((state) => ({ recurring: [...state.recurring, nova] }))
      },

      updateRecurring: (id, active) => {
        set((state) => ({
          recurring: state.recurring.map((r) =>
            r.id === id ? { ...r, active, updatedAt: Date.now() } : r
          ),
        }))
      },

      deleteRecurring: (id) => {
        set((state) => ({
          recurring: state.recurring.map((r) =>
            r.id === id ? { ...r, deletedAt: Date.now(), updatedAt: Date.now() } : r
          ),
        }))
      },

      addGoal: (name, targetAmount, deadline) => {
        if (!name.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0) return
        const novy: FinanceGoal = {
          id: noveId(),
          name: name.trim(),
          targetAmount: Math.round(targetAmount),
          deadline,
          createdAt: new Date().toISOString(),
          updatedAt: Date.now(),
          deletedAt: null,
        }
        set((state) => ({ goals: [...state.goals, novy] }))
      },

      deleteGoal: (id) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id ? { ...g, deletedAt: Date.now(), updatedAt: Date.now() } : g
          ),
        }))
      },

      zpracujOpakujiciSePlatby: () => {
        const dnes = new Date()
        const state = get()
        const dueRecurring = state.recurring.filter((r) => !r.deletedAt && melaByBytPridanaDnes(r, dnes))
        if (dueRecurring.length === 0) return

        const dnesniIso = `${dnes.getFullYear()}-${String(dnes.getMonth() + 1).padStart(2, '0')}-${String(dnes.getDate()).padStart(2, '0')}`
        const dnesniMesicStr = dnesniIso.slice(0, 7)

        const noveTransakce: Transaction[] = dueRecurring.map((r) => ({
          id: noveId(),
          type: r.type,
          amount: r.amount,
          category: r.category,
          note: r.note,
          date: dnesniIso,
          createdAt: new Date().toISOString(),
          walletId: null,
          receiptId: null,
          receiptMime: null,
          updatedAt: Date.now(),
          deletedAt: null,
        }))

        set((s) => ({
          transactions: [...s.transactions, ...noveTransakce],
          recurring: s.recurring.map((r) =>
            dueRecurring.some((d) => d.id === r.id)
              ? { ...r, lastAddedMonth: dnesniMesicStr, updatedAt: Date.now() }
              : r
          ),
        }))

        dueRecurring.forEach(() => {
          useGamificationStore.getState().recordAction('transaction', XP_PER_TRANSACTION)
        })

        void showAppNotification(
          '🔁 Opakující se platba přidána',
          dueRecurring.length === 1
            ? `${dueRecurring[0].category} · ${dueRecurring[0].amount.toLocaleString('cs-CZ')} Kč`
            : `${dueRecurring.length} plateb přidáno automaticky.`,
          'finance-recurring'
        )
      },
    }),
    {
      name: 'schoolbuddy-finance-storage',
      // IndexedDB, ne secureStorage — viz core/utils/indexedDbStorage.ts's
      // vlastní komentář, proč Economy Roomova reálná finanční historie
      // (roky transakcí, rozpočty, cíle) je přesně ten případ, co může
      // localStorage skutečně vyčerpat.
      storage: createJSONStorage(() => indexedDbStorage),

      // Poškozené nebo ručně upravené úložiště nesmí aplikaci shodit —
      // radši prázdné seznamy než pád při startu.
      merge: (persisted, current) => {
        const validace = validateFinanceData(persisted)
        if (!validace.success) return current
        return { ...current, ...validace.data }
      },
    }
  )
)

// ==========================================
// Automatické přidávání opakujících se plateb — stejný "modulový"
// vzorec jako Planerovo setupStudyPlannerReminders/Pomodorovo
// registerResumeTriggers: kontroluje se hned při startu a pak při
// každém návratu do appky, ne jen když je Finance zrovna otevřená,
// protože store se do hlavního balíčku načítá eagerly přes Economy
// Roomovy vlastní panely (viz useFinance() import tam).
// ==========================================

let recurringCheckStarted = false

export const setupFinanceRecurringCheck = (): void => {
  if (recurringCheckStarted) return
  recurringCheckStarted = true

  const zkontroluj = () => useFinanceStore.getState().zpracujOpakujiciSePlatby()

  zkontroluj()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') zkontroluj()
  })
  window.addEventListener('focus', zkontroluj)
  window.addEventListener('online', zkontroluj)
}

// Přístup k surovému stavu (bez Reactu) pro financeSync.ts — sync
// potřebuje vidět i měkce smazané záznamy (tombstones), které
// useFinance() hook níž schválně všude odfiltrovává.
export const getRawFinanceState = () => useFinanceStore.getState()
export const setRawFinanceState = (patch: Partial<FinanceState>) => useFinanceStore.setState(patch)
export const subscribeFinanceStore = (fn: () => void) => useFinanceStore.subscribe(fn)

export const useFinance = () => {
  const {
    transactions: transactionsRaw,
    wallets: walletsRaw,
    budgets: budgetsRaw,
    recurring: recurringRaw,
    goals: goalsRaw,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addWallet,
    updateWallet,
    deleteWallet,
    addBudget,
    updateBudget,
    deleteBudget,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    addGoal,
    deleteGoal,
  } = useFinanceStore()

  const [typFiltr, setTypFiltr] = useState<TypFiltr>('vse')
  const [obdobiFiltr, setObdobiFiltr] = useState<ObdobiFiltr>('tento-mesic')
  // Session-only jako typFiltr/obdobiFiltr výš — null = "Vše" (souhrn
  // napříč všemi peněženkami), stejné chování jako dřív, než peněženky
  // vůbec existovaly. Nepersistuje se, appka vždycky otevírá agregovaný
  // pohled.
  const [aktivniPenezenkaId, setAktivniPenezenkaId] = useState<string | null>(null)

  // Měkce smazané záznamy appka nikde v UI neukazuje — jen sync
  // (financeSync.ts, getRawFinanceState) je čte kvůli přenosu mezi
  // zařízeními.
  const transactions = useMemo(() => transactionsRaw.filter((t) => !t.deletedAt), [transactionsRaw])
  const wallets = useMemo(() => walletsRaw.filter((w) => !w.deletedAt), [walletsRaw])
  const budgets = useMemo(() => budgetsRaw.filter((b) => !b.deletedAt), [budgetsRaw])
  const recurring = useMemo(() => recurringRaw.filter((r) => !r.deletedAt), [recurringRaw])
  const goals = useMemo(() => goalsRaw.filter((g) => !g.deletedAt), [goalsRaw])

  const penezenkoveTransactions = useMemo(
    () => (aktivniPenezenkaId ? transactions.filter((t) => t.walletId === aktivniPenezenkaId) : transactions),
    [transactions, aktivniPenezenkaId]
  )

  // Transakce ve zvoleném období — základ pro souhrn i grafy. Filtr podle
  // typu (jen příjmy / jen výdaje) se týká výhradně seznamu níž, ať se
  // souhrn a grafy neposouvají jen proto, že si uživatel chce prohlédnout
  // samotné výdaje.
  const obdobiTransactions = useMemo(
    () => penezenkoveTransactions.filter((t) => patriDoObdobi(t, obdobiFiltr)),
    [penezenkoveTransactions, obdobiFiltr]
  )

  const seznam = useMemo(() => {
    return obdobiTransactions
      .filter((t) => typFiltr === 'vse' || t.type === typFiltr)
      .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
  }, [obdobiTransactions, typFiltr])

  // Skutečný zůstatek se počítá ze VŠECH transakcí zvolené peněženky,
  // bez ohledu na zvolené období — jinak by "Minulý měsíc" ukazoval
  // zůstatek, který nikdy doopravdy neplatil.
  const zustatek = useMemo(
    () =>
      penezenkoveTransactions.reduce((sum, t) => sum + (t.type === 'prijem' ? t.amount : -t.amount), 0),
    [penezenkoveTransactions]
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

  const mesicniTrend = useMemo(
    () => spocitejMesicniTrend(penezenkoveTransactions),
    [penezenkoveTransactions]
  )

  // Rozpočty se vždycky porovnávají proti AKTUÁLNÍMU měsíci, napříč
  // všemi peněženkami — rozpočet je koncept "kolik utrácím na jídlo
  // celkem", ne "kolik utrácím z týhle jedné peněženky".
  const tentoMesicVsechnyPenezenky = useMemo(
    () => transactions.filter((t) => patriDoObdobi(t, 'tento-mesic')),
    [transactions]
  )
  const budgetStavy = useMemo(
    (): BudgetStav[] => spocitejStavRozpoctu(budgets, tentoMesicVsechnyPenezenky),
    [budgets, tentoMesicVsechnyPenezenky]
  )

  const zustatekCelkem = useMemo(
    () => transactions.reduce((sum, t) => sum + (t.type === 'prijem' ? t.amount : -t.amount), 0),
    [transactions]
  )
  const goalStavy = useMemo(
    (): GoalStav[] => goals.map((g) => spocitejStavCile(g, zustatekCelkem)),
    [goals, zustatekCelkem]
  )

  return {
    // Surové transakce navíc k odvozeným hodnotám výš — Finance sama je
    // nikdy nepotřebovala (počítala si vlastní odvozeniny), ale Economy
    // Room (src/flagships/economy-room/economyStats.ts) potřebuje i
    // minulý měsíc, což žádná z výš uvedených hodnot nenese. Stejné
    // "appka exportuje surová data, jakmile je potřebuje druhý volající"
    // zdůvodnění jako dnesniMesic/minulyMesic/patriDoObdobi/
    // rozdelPodleKategorie o pár řádků výš.
    transactions,
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

    // Peněženky/účty
    wallets,
    aktivniPenezenkaId,
    setAktivniPenezenkaId,
    addWallet,
    updateWallet,
    deleteWallet,

    // Rozpočty
    budgets,
    budgetStavy,
    addBudget,
    updateBudget,
    deleteBudget,

    // Opakující se transakce
    recurring,
    addRecurring,
    updateRecurring,
    deleteRecurring,

    // Finanční cíle
    goals,
    goalStavy,
    addGoal,
    deleteGoal,
  }
}
