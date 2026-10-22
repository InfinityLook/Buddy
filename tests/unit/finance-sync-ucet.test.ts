import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccount } from '@/core/supabase/auth'

// ==========================================
// Regresní test pro financeSync.ts's VLASTNÍ kopii opravy "únik dat
// mezi účty při přepnutí účtu na jednom zařízení" (audit #2+#3) —
// stejná logika jako core/supabase/recordSync.ts (viz
// record-sync-ucet.test.ts), ale financeSync.ts si ji drží jako svou
// vlastní, ne přes sdílenou továrnu, takže potřebuje svůj vlastní test.
//
// Na rozdíl od recordSync.ts (kde je vytvorZaznamovySync exportovaná
// továrna, kterou test může zavolat s vlastní testovací tabulkou),
// financeSync.ts exportuje jen syncFinanceNow/startFinanceSync — appka
// to celé jede přes jediný skutečný modul, takže se tu musí mockovat
// useFinance's getRawFinanceState/setRawFinanceState/
// subscribeFinanceStore a appka to pohání přes REÁLNÝ syncFinanceNow().
// ==========================================

const upsertVolani = vi.hoisted(() => ({ radky: [] as Record<string, unknown>[] }))
const stazenaData = vi.hoisted(() => ({ radky: [] as Record<string, unknown>[] }))
const fakeStore = vi.hoisted(() => ({
  transactions: [] as any[],
  wallets: [] as any[],
  budgets: [] as any[],
  recurring: [] as any[],
  goals: [] as any[],
}))

vi.mock('@/core/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (_table: string) => ({
      upsert: async (rows: Record<string, unknown>[], _opts: unknown) => {
        upsertVolani.radky.push(...rows)
        return { error: null }
      },
      select: () => ({
        eq: () => ({
          gt: async () => ({ data: stazenaData.radky, error: null }),
        }),
      }),
    }),
  },
}))

vi.mock('@/miniapps/finance/useFinance', () => ({
  getRawFinanceState: () => fakeStore,
  setRawFinanceState: (patch: Partial<typeof fakeStore>) => Object.assign(fakeStore, patch),
  subscribeFinanceStore: (_fn: () => void) => () => {},
}))

describe('financeSync — reset místních dat při přepnutí na jiný účet', () => {
  const CURSOR_KEY = 'schoolbuddy-finance-sync-cursor'
  const UCET_KLIC = `${CURSOR_KEY}-ucet`

  beforeEach(() => {
    fakeStore.transactions = []
    fakeStore.wallets = []
    fakeStore.budgets = []
    fakeStore.recurring = []
    fakeStore.goals = []
    upsertVolani.radky = []
    stazenaData.radky = []
    localStorage.removeItem(CURSOR_KEY)
    localStorage.removeItem(UCET_KLIC)
    useAccount.setState({ status: 'signed-in', userId: 'ucet-a', email: null })
  })

  afterEach(() => {
    useAccount.setState({ status: 'anonymous', userId: null, email: null })
    localStorage.removeItem(CURSOR_KEY)
    localStorage.removeItem(UCET_KLIC)
  })

  it('na čerstvém zařízení (žádný zaznamenaný vlastník) se místní peněženky NEzahodí', async () => {
    const { syncFinanceNow } = await import('@/miniapps/finance/financeSync')
    fakeStore.wallets = [
      { id: 'penezenka-offline', name: 'Hotovost', icon: null, pocatecniZustatek: 500, createdAt: '2024-01-01', updatedAt: 1000, deletedAt: null },
    ]

    await syncFinanceNow()

    expect(fakeStore.wallets.some((w) => w.id === 'penezenka-offline')).toBe(true)
    expect(upsertVolani.radky.some((r) => r.id === 'penezenka-offline')).toBe(true)
    expect(localStorage.getItem(UCET_KLIC)).toBe('ucet-a')
  })

  it('přepnutí na jiný skutečný účet vyprázdní všech pět tabulek PŘED synchronizací', async () => {
    const { syncFinanceNow } = await import('@/miniapps/finance/financeSync')

    fakeStore.wallets = [
      { id: 'ucet-a-penezenka', name: 'Áčkova peněženka', icon: null, pocatecniZustatek: 1000, createdAt: '2024-01-01', updatedAt: 1000, deletedAt: null },
    ]
    fakeStore.goals = [
      { id: 'ucet-a-cil', name: 'Áčkův tajný spořicí cíl', targetAmount: 50000, deadline: null, createdAt: '2024-01-01', updatedAt: 1000, deletedAt: null },
    ]
    await syncFinanceNow()
    expect(localStorage.getItem(UCET_KLIC)).toBe('ucet-a')
    upsertVolani.radky = []

    useAccount.setState({ status: 'signed-in', userId: 'ucet-b', email: null })
    stazenaData.radky = [
      { id: 'ucet-b-cloud-penezenka', user_id: 'ucet-b', name: 'Bčkova peněženka', icon: null, pocatecni_zustatek: 200, updated_at: new Date().toISOString(), deleted_at: null },
    ]

    await syncFinanceNow()

    // Áčkova peněženka a jeho cíl (včetně názvu, co by si B neměl
    // nikdy přečíst) se NESMÍ odeslat pod B's user_id ani zůstat v
    // mergnutém místním stavu.
    expect(upsertVolani.radky.some((r) => r.id === 'ucet-a-penezenka' || r.id === 'ucet-a-cil')).toBe(false)
    expect(fakeStore.wallets.some((w) => w.id === 'ucet-a-penezenka')).toBe(false)
    expect(fakeStore.goals.some((g) => g.id === 'ucet-a-cil')).toBe(false)
    // Bčkova reálná cloudová peněženka se správně stáhla.
    expect(fakeStore.wallets.some((w) => w.id === 'ucet-b-cloud-penezenka')).toBe(true)
    expect(localStorage.getItem(UCET_KLIC)).toBe('ucet-b')
  })

  it('čerstvá, ještě neodeslaná úprava účtu A se NEODEŠLE pod user_id účtu B', async () => {
    // Stejné zpřísnění jako record-sync-ucet.test.ts: updatedAt daleko
    // v minulosti by prošlo i bez opravy (syncOneTable's own
    // updatedAt > kurzor filtr by ho beztak nepustil), takže appka
    // musí modelovat úpravu NOVĚJŠÍ než vlastní kurzor A, aby
    // skutečně prokázala tu nebezpečnou cestu (odeslání pod cizím
    // user_id), ne jen slabší symptom (viditelnost v mergnutém stavu).
    const { syncFinanceNow } = await import('@/miniapps/finance/financeSync')

    fakeStore.transactions = [
      { id: 'puvodni-a-transakce', type: 'expense', amount: 100, category: 'jidlo', note: '', date: '2024-01-01', createdAt: '2024-01-01', walletId: null, receiptId: null, receiptMime: null, presunId: null, updatedAt: 1000, deletedAt: null },
    ]
    await syncFinanceNow()
    upsertVolani.radky = []
    const kurzorPoPrvnimSyncu = Number(localStorage.getItem(CURSOR_KEY) ?? 0)

    fakeStore.transactions = [
      ...fakeStore.transactions,
      {
        id: 'cerstva-neodeslana-transakce-a',
        type: 'expense',
        amount: 99999,
        category: 'jine',
        note: 'Áčkova soukromá rozepsaná útrata',
        date: '2024-06-01',
        createdAt: '2024-06-01',
        walletId: null,
        receiptId: null,
        receiptMime: null,
        presunId: null,
        updatedAt: kurzorPoPrvnimSyncu + 5000,
        deletedAt: null,
      },
    ]

    useAccount.setState({ status: 'signed-in', userId: 'ucet-b', email: null })
    stazenaData.radky = []

    await syncFinanceNow()

    expect(upsertVolani.radky.some((r) => r.id === 'cerstva-neodeslana-transakce-a')).toBe(false)
    expect(fakeStore.transactions.some((t) => t.id === 'cerstva-neodeslana-transakce-a')).toBe(false)
  })

  it('opětovné přihlášení TOHO SAMÉHO účtu žádný reset nespustí', async () => {
    const { syncFinanceNow } = await import('@/miniapps/finance/financeSync')

    fakeStore.wallets = [
      { id: 'trvala-penezenka', name: 'Trvalá peněženka', icon: null, pocatecniZustatek: 300, createdAt: '2024-01-01', updatedAt: 1000, deletedAt: null },
    ]
    await syncFinanceNow()

    useAccount.setState({ status: 'signed-in', userId: 'ucet-a', email: null })
    await syncFinanceNow()

    expect(fakeStore.wallets.some((w) => w.id === 'trvala-penezenka')).toBe(true)
  })
})
