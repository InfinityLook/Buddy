import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from '@/core/supabase/client'
import { useAccount } from '@/core/supabase/auth'
import type { SyncStatus } from '@/core/supabase/types'
import {
  getRawFinanceState,
  setRawFinanceState,
  subscribeFinanceStore,
} from './useFinance'
import type { Budget, FinanceGoal, RecurringTransaction, Transaction, Wallet } from './types'

// ==========================================
// Cloudová synchronizace Financí — na rozdíl od core/supabase/cloudSync.ts
// (jeden snímek, "vyšší vyhrává" u počtů) tady appka synchronizuje pět
// oddělených SEZNAMŮ skutečných záznamů, ne pár čísel — "vyšší vyhrává"
// na tenhle tvar dat nesedí (transakce se maže/upravuje, nesbírá se
// jen nahoru). Řešením je záznam po záznamu, podle id: nový záznam se
// přidá, upravený přepíše starší podle updatedAt, smazaný (deletedAt)
// zůstane jako tombstone řádek, co pull krok pozná a smaže i lokálně.
//
// Zdrojem pravdy zůstává lokální úložiště (IndexedDB, viz
// core/utils/indexedDbStorage.ts) — appka zapisuje okamžitě tam, offline
// funguje přesně jako dřív. Cloud je zrcadlo navíc: při připojení appka
// potichu odešle nové/změněné záznamy a stáhne, co mezitím přibylo na
// jiném zařízení. Stejná filozofie, stejný start/resync vzorec jako
// core/supabase/cloudSync.ts, jen nad jiným tvarem dat.
// ==========================================

interface FinanceSyncState {
  status: SyncStatus
  lastSyncedAt: string | null
  error: string | null
}

export const useFinanceSyncStatus = create<FinanceSyncState>(() => ({
  status: isSupabaseConfigured ? 'connecting' : 'off',
  lastSyncedAt: null,
  error: null,
}))

const setStatus = (patch: Partial<FinanceSyncState>) => useFinanceSyncStatus.setState(patch)

// Jeden sdílený kurzor pro celou Economy Room doménu, ne pět
// oddělených — appka synchronizuje všech pět tabulek v jednom průchodu,
// takže jeden společný "od kdy" bod stačí a je jednodušší na údržbu.
// Ukládá se do localStorage přímo (ne přes Zustand persist) — je to
// jedno jediné číslo, žádný důvod pro celý store kolem něj.
const CURSOR_KEY = 'schoolbuddy-finance-sync-cursor'

const nactiKurzor = (): number => {
  const raw = localStorage.getItem(CURSOR_KEY)
  const cislo = raw ? Number(raw) : 0
  return Number.isFinite(cislo) ? cislo : 0
}

const ulozKurzor = (cas: number) => localStorage.setItem(CURSOR_KEY, String(cas))

type SoftDeletable = { id: string; updatedAt: number; deletedAt: number | null }

interface TabulkaSync<T extends SoftDeletable> {
  table: string
  toRow: (userId: string, item: T) => Record<string, unknown>
  fromRow: (row: Record<string, any>) => T
  getLocal: () => T[]
  setLocal: (items: T[]) => void
}

const naIso = (ms: number): string => new Date(ms).toISOString()
const zIso = (iso: string | null): number => (iso ? new Date(iso).getTime() : 0)

/** Sloučí lokální a stažené záznamy podle id — kdo má novější
 *  updatedAt, ten vyhrává (včetně tombstone řádků, smazání je jen
 *  další "novější stav" téhož id). */
const slouc = <T extends SoftDeletable>(lokalni: T[], vzdalene: T[]): T[] => {
  const mapa = new Map<string, T>()
  for (const item of lokalni) mapa.set(item.id, item)
  for (const item of vzdalene) {
    const existujici = mapa.get(item.id)
    if (!existujici || item.updatedAt >= existujici.updatedAt) mapa.set(item.id, item)
  }
  return [...mapa.values()]
}

const syncOneTable = async <T extends SoftDeletable>(userId: string, cfg: TabulkaSync<T>, kurzor: number) => {
  if (!supabase) return

  const lokalni = cfg.getLocal()
  const kOdeslani = lokalni.filter((item) => item.updatedAt > kurzor)

  if (kOdeslani.length > 0) {
    const { error } = await supabase.from(cfg.table).upsert(
      kOdeslani.map((item) => cfg.toRow(userId, item)),
      { onConflict: 'id' }
    )
    if (error) throw new Error(`${cfg.table}: ${error.message}`)
  }

  const { data, error } = await supabase
    .from(cfg.table)
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', naIso(kurzor))

  if (error) throw new Error(`${cfg.table}: ${error.message}`)

  const stazene = (data ?? []).map(cfg.fromRow)
  if (stazene.length > 0) {
    cfg.setLocal(slouc(lokalni, stazene))
  }
}

const tabulky = (): TabulkaSync<any>[] => {
  const state = getRawFinanceState()

  const transactions: TabulkaSync<Transaction> = {
    table: 'finance_transactions',
    getLocal: () => state.transactions,
    setLocal: (items) => setRawFinanceState({ transactions: items }),
    toRow: (userId, t) => ({
      id: t.id,
      user_id: userId,
      type: t.type,
      amount: t.amount,
      category: t.category,
      note: t.note,
      date: t.date,
      wallet_id: t.walletId,
      receipt_id: t.receiptId,
      receipt_mime: t.receiptMime,
      updated_at: naIso(t.updatedAt),
      deleted_at: t.deletedAt ? naIso(t.deletedAt) : null,
    }),
    fromRow: (r): Transaction => ({
      id: r.id,
      type: r.type,
      amount: r.amount,
      category: r.category,
      note: r.note ?? '',
      date: r.date,
      createdAt: r.created_at ?? new Date().toISOString(),
      walletId: r.wallet_id,
      receiptId: r.receipt_id,
      receiptMime: r.receipt_mime,
      updatedAt: zIso(r.updated_at),
      deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
    }),
  }

  const wallets: TabulkaSync<Wallet> = {
    table: 'finance_wallets',
    getLocal: () => state.wallets,
    setLocal: (items) => setRawFinanceState({ wallets: items }),
    toRow: (userId, w) => ({
      id: w.id,
      user_id: userId,
      name: w.name,
      icon: w.icon,
      updated_at: naIso(w.updatedAt),
      deleted_at: w.deletedAt ? naIso(w.deletedAt) : null,
    }),
    fromRow: (r): Wallet => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      createdAt: r.created_at ?? new Date().toISOString(),
      updatedAt: zIso(r.updated_at),
      deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
    }),
  }

  const budgets: TabulkaSync<Budget> = {
    table: 'finance_budgets',
    getLocal: () => state.budgets,
    setLocal: (items) => setRawFinanceState({ budgets: items }),
    toRow: (userId, b) => ({
      id: b.id,
      user_id: userId,
      category: b.category,
      limit_kc: b.limitKc,
      updated_at: naIso(b.updatedAt),
      deleted_at: b.deletedAt ? naIso(b.deletedAt) : null,
    }),
    fromRow: (r): Budget => ({
      id: r.id,
      category: r.category,
      limitKc: r.limit_kc,
      createdAt: r.created_at ?? new Date().toISOString(),
      updatedAt: zIso(r.updated_at),
      deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
    }),
  }

  const recurring: TabulkaSync<RecurringTransaction> = {
    table: 'finance_recurring',
    getLocal: () => state.recurring,
    setLocal: (items) => setRawFinanceState({ recurring: items }),
    toRow: (userId, r) => ({
      id: r.id,
      user_id: userId,
      type: r.type,
      amount: r.amount,
      category: r.category,
      note: r.note,
      day_of_month: r.dayOfMonth,
      active: r.active,
      last_added_month: r.lastAddedMonth,
      updated_at: naIso(r.updatedAt),
      deleted_at: r.deletedAt ? naIso(r.deletedAt) : null,
    }),
    fromRow: (r): RecurringTransaction => ({
      id: r.id,
      type: r.type,
      amount: r.amount,
      category: r.category,
      note: r.note ?? '',
      dayOfMonth: r.day_of_month,
      active: r.active,
      lastAddedMonth: r.last_added_month,
      createdAt: r.created_at ?? new Date().toISOString(),
      updatedAt: zIso(r.updated_at),
      deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
    }),
  }

  const goals: TabulkaSync<FinanceGoal> = {
    table: 'finance_goals',
    getLocal: () => state.goals,
    setLocal: (items) => setRawFinanceState({ goals: items }),
    toRow: (userId, g) => ({
      id: g.id,
      user_id: userId,
      name: g.name,
      target_amount: g.targetAmount,
      deadline: g.deadline,
      updated_at: naIso(g.updatedAt),
      deleted_at: g.deletedAt ? naIso(g.deletedAt) : null,
    }),
    fromRow: (r): FinanceGoal => ({
      id: r.id,
      name: r.name,
      targetAmount: r.target_amount,
      deadline: r.deadline,
      createdAt: r.created_at ?? new Date().toISOString(),
      updatedAt: zIso(r.updated_at),
      deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
    }),
  }

  return [transactions, wallets, budgets, recurring, goals]
}

let inFlight = false

const failed = (err: unknown) => {
  const message = err instanceof Error ? err.message : 'Synchronizace Financí selhala.'
  console.warn('[finance-sync]', message)
  setStatus({ status: navigator.onLine === false ? 'offline' : 'error', error: message })
}

const runSync = async (): Promise<void> => {
  if (!isSupabaseConfigured) return
  const userId = useAccount.getState().userId
  // Bez skutečného účtu appka jede dál jen nad lokálním IndexedDB —
  // stejná "cloud je doplněk, ne podmínka" zásada jako všude jinde.
  if (!userId || useAccount.getState().status !== 'signed-in') return
  if (inFlight) return

  inFlight = true
  setStatus({ status: 'connecting', error: null })

  try {
    // Čas TĚSNĚ PŘED průchodem, ne po něm — konzervativní volba: pár
    // řádků se příště pošle/stáhne znovu (upsert je idempotentní), ale
    // nikdy nic nevznikne během průchodu a neprojde bez povšimnutí.
    const noveKurzor = Date.now()
    const kurzor = nactiKurzor()

    for (const tabulka of tabulky()) {
      await syncOneTable(userId, tabulka, kurzor)
    }

    ulozKurzor(noveKurzor)
    setStatus({ status: 'synced', lastSyncedAt: new Date().toISOString(), error: null })
  } catch (err) {
    failed(err)
  } finally {
    inFlight = false
  }
}

let syncPromise: Promise<void> | null = null

export const syncFinanceNow = (): Promise<void> => {
  if (!isSupabaseConfigured) return Promise.resolve()
  if (syncPromise) return syncPromise
  syncPromise = runSync().finally(() => {
    syncPromise = null
  })
  return syncPromise
}

let started = false
const PUSH_DELAY = 3000
let pushTimer: number | null = null

export const startFinanceSync = (): void => {
  if (started || !isSupabaseConfigured) return
  started = true

  void syncFinanceNow()

  // Místní změna (přidání/úprava/smazání záznamu) se odešle se
  // zpožděním — víc zápisů za sebou (třeba zpracujOpakujiciSePlatby
  // najednou přidá víc transakcí) nemá smysl posílat jednotlivě.
  subscribeFinanceStore(() => {
    if (pushTimer) window.clearTimeout(pushTimer)
    pushTimer = window.setTimeout(() => void syncFinanceNow(), PUSH_DELAY)
  })

  let posledniUcet = useAccount.getState().userId
  useAccount.subscribe((stav) => {
    if (stav.userId === posledniUcet) return
    posledniUcet = stav.userId
    void syncFinanceNow()
  })

  const resync = () => {
    if (document.visibilityState === 'visible') void syncFinanceNow()
  }
  document.addEventListener('visibilitychange', resync)
  window.addEventListener('online', () => void syncFinanceNow())

  window.addEventListener('pagehide', () => {
    if (pushTimer) window.clearTimeout(pushTimer)
    void syncFinanceNow()
  })
}
