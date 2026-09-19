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
  rozpoctyKUpozorneni,
  sestavPresunTransakci,
  soucetPocatecnichZustatku as soucetPocatecnichZustatkuZTypu,
  spocitejMesicniTrend,
  spocitejStavCile,
  spocitejStavRozpoctu,
  zustatekZTransakci,
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

  /** Přesun peněz mezi dvěma vlastními peněženkami — zapíše se jako
   *  dvě propojené transakce (viz sestavPresunTransakci v types.ts),
   *  ne jako přímá úprava zůstatku, ať appka nemusí mít druhou,
   *  paralelní cestu k tomu, jak se zůstatek peněženky vůbec mění. */
  presunMeziPenezenkami: (zPenezenkyId: string, doPenezenkyId: string, castka: number, poznamka: string) => void

  addWallet: (name: string, icon: string | null, pocatecniZustatek?: number) => void
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
    (set, get) => {
      // Sdílená kontrola po přidání výdajové transakce (ruční i
      // automatické opakující se platbě) — jedna funkce, ne zkopírovaná
      // logika na obou volajících místech, ať se náhodou nerozejdou.
      const zkontrolujPrekroceneRozpocty = () => {
        const state = get()
        const dnesniMesicStr = dnesniMesicZTypu()
        const transakceTohotoMesice = state.transactions.filter(
          (t) => !t.deletedAt && !t.presunId && t.date.slice(0, 7) === dnesniMesicStr
        )
        const prekrocene = rozpoctyKUpozorneni(state.budgets, transakceTohotoMesice, dnesniMesicStr)
        if (prekrocene.length === 0) return

        set((s) => ({
          budgets: s.budgets.map((b) =>
            prekrocene.some((p) => p.budget.id === b.id)
              ? { ...b, lastExceededNotifiedMonth: dnesniMesicStr }
              : b
          ),
        }))

        prekrocene.forEach((p) => {
          void showAppNotification(
            '⚠️ Rozpočet překročen',
            `${p.budget.category}: ${p.utraceno.toLocaleString('cs-CZ')} Kč z ${p.budget.limitKc.toLocaleString('cs-CZ')} Kč limitu.`,
            `finance-budget-${p.budget.id}`
          )
        })
      }

      return {
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
              presunId: null,
            },
          ],
        }))

        // Počítadlo a XP se hlásí přes recordAction, ne addXp — jinak by
        // šlo, aby se rozešly a odznak "Rozpočtář" se odemkl v jiný
        // okamžik, než kolik transakcí uživatel doopravdy zapsal.
        useGamificationStore.getState().recordAction('transaction', XP_PER_TRANSACTION)

        zkontrolujPrekroceneRozpocty()
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
      // Smazání jedné poloviny přesunu (presunId) smaže i tu druhou —
      // jinak by ve druhé peněžence zůstal osamocený "příjem"/"výdaj"
      // bez páru, který jí ve skutečnosti nikdy nepatřil.
      deleteTransaction: (id) => {
        set((state) => {
          const mazana = state.transactions.find((t) => t.id === id)
          const ted = Date.now()
          return {
            transactions: state.transactions.map((t) => {
              const jePar = mazana?.presunId && t.presunId === mazana.presunId
              if (t.id === id || jePar) return { ...t, deletedAt: ted, updatedAt: ted }
              return t
            }),
          }
        })
      },

      presunMeziPenezenkami: (zPenezenkyId, doPenezenkyId, castka, poznamka) => {
        if (!Number.isFinite(castka) || castka <= 0) return
        if (zPenezenkyId === doPenezenkyId) return
        const state = get()
        const zPenezenky = state.wallets.find((w) => w.id === zPenezenkyId && !w.deletedAt)
        const doPenezenky = state.wallets.find((w) => w.id === doPenezenkyId && !w.deletedAt)
        if (!zPenezenky || !doPenezenky) return

        const presunId = noveId()
        const [vydaj, prijem] = sestavPresunTransakci(zPenezenky, doPenezenky, Math.round(castka), poznamka, presunId)
        const ted = new Date().toISOString()
        const spolecne = {
          date: ted.slice(0, 10),
          createdAt: ted,
          receiptId: null,
          receiptMime: null,
          updatedAt: Date.now(),
          deletedAt: null,
        }
        set((s) => ({
          transactions: [
            ...s.transactions,
            { ...vydaj, ...spolecne, id: noveId() },
            { ...prijem, ...spolecne, id: noveId() },
          ],
        }))
        // Přesun se schválně nepočítá jako "napsaná transakce" pro XP/
        // odznak Rozpočtář (recordAction('transaction', …)) — přehazování
        // peněz mezi vlastními peněženkami dokola by jinak byl snadný
        // způsob, jak farmit XP bez jediné skutečné finanční aktivity.
      },

      addWallet: (name, icon, pocatecniZustatek = 0) => {
        if (!name.trim()) return
        const nova: Wallet = {
          id: noveId(),
          name: name.trim(),
          icon,
          pocatecniZustatek: Number.isFinite(pocatecniZustatek) ? pocatecniZustatek : 0,
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
          presunId: null,
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

        // Automaticky přidaná platba může rozpočet překročit stejně
        // jako ručně zadaná — appka kontroluje na obou místech.
        zkontrolujPrekroceneRozpocty()
      },
      }
    },
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
    presunMeziPenezenkami,
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

  // Přesuny mezi vlastními peněženkami (Transaction.presunId) appka dál
  // ukazuje v seznamu (seznam výš) — uživatel je má vidět a jít smazat —
  // ale nesmí se počítat do "kolik jsem vydělal/utratil", grafu podle
  // kategorie ani rozpočtů, jinak by přeložení peněz ze spoření na běžný
  // účet vypadalo jako dalších pár tisíc příjmů i výdajů zároveň. Na
  // zůstatek peněženky (zustatek/zustatekCelkem výš) naopak vliv MÍT
  // musí — peníze doopravdy z jedné peněženky zmizely a v druhé přibyly.
  const obdobiTransactionsBezPresunu = useMemo(
    () => obdobiTransactions.filter((t) => !t.presunId),
    [obdobiTransactions]
  )

  // Součet počátečních zůstatků všech (nesmazaných) peněženek — kolik
  // appka "zdědila" už při založení, ne z vlastních transakcí. Bez
  // téhle hodnoty by hotovost/účet, co uživatel měl už před tím, než
  // appku vůbec začal používat, nikdy nešla zapsat jinak než falešnou
  // "počáteční" transakcí.
  const soucetPocatecnich = useMemo(() => soucetPocatecnichZustatkuZTypu(wallets), [wallets])

  // Skutečný zůstatek se počítá ze VŠECH transakcí zvolené peněženky,
  // bez ohledu na zvolené období — jinak by "Minulý měsíc" ukazoval
  // zůstatek, který nikdy doopravdy neplatil. K součtu transakcí se
  // připočítá i počáteční zůstatek — buď jen vybrané peněženky (filtr
  // aktivní), nebo součet za všechny (souhrnný pohled).
  const zustatek = useMemo(() => {
    const pocatecni = aktivniPenezenkaId
      ? (wallets.find((w) => w.id === aktivniPenezenkaId)?.pocatecniZustatek ?? 0)
      : soucetPocatecnich
    return zustatekZTransakci(penezenkoveTransactions, pocatecni)
  }, [penezenkoveTransactions, aktivniPenezenkaId, wallets, soucetPocatecnich])

  const prijmyObdobi = useMemo(
    () => obdobiTransactionsBezPresunu.filter((t) => t.type === 'prijem').reduce((s, t) => s + t.amount, 0),
    [obdobiTransactionsBezPresunu]
  )
  const vydajeObdobi = useMemo(
    () => obdobiTransactionsBezPresunu.filter((t) => t.type === 'vydaj').reduce((s, t) => s + t.amount, 0),
    [obdobiTransactionsBezPresunu]
  )

  const kategorieVydaje = useMemo(
    () => rozdelPodleKategorie(obdobiTransactionsBezPresunu.filter((t) => t.type === 'vydaj')),
    [obdobiTransactionsBezPresunu]
  )
  const kategoriePrijmy = useMemo(
    () => rozdelPodleKategorie(obdobiTransactionsBezPresunu.filter((t) => t.type === 'prijem')),
    [obdobiTransactionsBezPresunu]
  )

  const mesicniTrend = useMemo(
    () => spocitejMesicniTrend(penezenkoveTransactions.filter((t) => !t.presunId)),
    [penezenkoveTransactions]
  )

  // Rozpočty se vždycky porovnávají proti AKTUÁLNÍMU měsíci, napříč
  // všemi peněženkami — rozpočet je koncept "kolik utrácím na jídlo
  // celkem", ne "kolik utrácím z týhle jedné peněženky". Přesuny mezi
  // peněženkami se nepočítají (viz komentář u obdobiTransactionsBezPresunu
  // výš) — jinak by přesun 2000 Kč zaúčtovaný jako "Ostatní výdaj" mohl
  // sám o sobě spustit upozornění na překročený rozpočet.
  const tentoMesicVsechnyPenezenky = useMemo(
    () => transactions.filter((t) => patriDoObdobi(t, 'tento-mesic') && !t.presunId),
    [transactions]
  )
  const budgetStavy = useMemo(
    (): BudgetStav[] => spocitejStavRozpoctu(budgets, tentoMesicVsechnyPenezenky),
    [budgets, tentoMesicVsechnyPenezenky]
  )

  const zustatekCelkem = useMemo(
    () => zustatekZTransakci(transactions, soucetPocatecnich),
    [transactions, soucetPocatecnich]
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
    // Zůstatek napříč všemi peněženkami, ne jen tou právě vybranou —
    // goalStavy (cíle) je z něj záměrně počítá, protože jeden finanční
    // cíl nemá smysl škálovat podle toho, jestli má uživatel zrovna
    // vybraný filtr na jednu konkrétní peněženku. Exportováno navíc k
    // zustatek, ať si Finance.tsx u cílů může zobrazit přesně to samé
    // číslo, ze kterého je počítaný progress bar (spocitejStavCile),
    // ne to filtrované — jinak by se text a výplň pruhu u aktivního
    // filtru mohly rozejít.
    zustatekCelkem,
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
    presunMeziPenezenkami,

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
