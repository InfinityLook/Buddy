import { create } from 'zustand'
import type { StoreApi, UseBoundStore } from 'zustand'
import { isSupabaseConfigured, supabase } from './client'
import { useAccount } from './auth'
import type { SyncStatus } from './types'

// ==========================================
// Obecný "záznam po záznamu" synchronizační stroj — vytažený z
// miniapps/finance/financeSync.ts (první doména, co tohle potřebovala)
// ve chvíli, kdy stejnou logiku potřebovala druhá a třetí doména
// (Writer's Room, Goal Tracker, školní appky) najednou. Finance's
// vlastní soubor zůstal beze změny (funguje, riskovat existující
// tabulky kvůli přeskládání by nebylo k ničemu) — tenhle modul slouží
// jen novým doménám.
//
// Princip je stejný, jaký financeSync.ts's hlavička už popisuje: appka
// synchronizuje SEZNAMY skutečných záznamů (ne pár čísel jako
// core/supabase/cloudSync.ts), záznam po záznamu podle id — nový se
// přidá, upravený přepíše starší podle updatedAt, smazaný (deletedAt)
// zůstane jako tombstone řádek, co appka na druhém zařízení pozná a
// smaže i tam. Zdrojem pravdy zůstává lokální Zustand/secureStorage
// úložiště — appka zapisuje okamžitě tam, offline funguje přesně jako
// dřív, cloud je jen zrcadlo navíc.
// ==========================================

export type SoftDeletable = { id: string; updatedAt: number; deletedAt: number | null }

export interface TabulkaSync<T extends SoftDeletable> {
  table: string
  toRow: (userId: string, item: T) => Record<string, unknown>
  fromRow: (row: Record<string, any>) => T
  getLocal: () => T[]
  setLocal: (items: T[]) => void
}

export const naIso = (ms: number): string => new Date(ms).toISOString()
export const zIso = (iso: string | null): number => (iso ? new Date(iso).getTime() : 0)

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

interface RecordSyncState {
  status: SyncStatus
  lastSyncedAt: string | null
  error: string | null
}

export interface RecordSyncController {
  /** Zustand store se stavem synchronizace (pro volitelný UI řádek). */
  useSyncStatus: UseBoundStore<StoreApi<RecordSyncState>>
  /** Spustí jeden průchod hned — appka ho volá i sama pro sebe, hlavně
   *  ale slouží testům/ladění. */
  syncNow: () => Promise<void>
  /** Napojí se na místní store (debounced push po změně) a na
   *  návratové okamžiky appky (visibilitychange/online/pagehide) —
   *  volá se jednou z App.tsx, stejně jako startFinanceSync. */
  start: () => void
}

/** Postaví kompletní synchronizační řadič nad danou sadou tabulek —
 *  jeden sdílený kurzor (localStorage klíč `cursorKey`), jeden status
 *  store, jedna sada resync spouštěčů. `ziskejTabulky` se volá znovu
 *  při každém průchodu (ne jednou při startu), ať appka vždycky čte
 *  čerstvý stav místních storů, ne ten z okamžiku volání tovární
 *  funkce. `sledujZmeny` appka volá s jedním společným posluchačem
 *  pro VŠECHNY synchronizované storu dané domény — volající modul si
 *  sám poskládá, které storu odběr přihlásit (viz writerSync.ts). */
export const vytvorZaznamovySync = (
  cursorKey: string,
  ziskejTabulky: () => TabulkaSync<any>[],
  sledujZmeny: (posluchac: () => void) => void
): RecordSyncController => {
  const useSyncStatus = create<RecordSyncState>(() => ({
    status: isSupabaseConfigured ? 'connecting' : 'off',
    lastSyncedAt: null,
    error: null,
  }))

  const setStatus = (patch: Partial<RecordSyncState>) => useSyncStatus.setState(patch)

  const nactiKurzor = (): number => {
    const raw = localStorage.getItem(cursorKey)
    const cislo = raw ? Number(raw) : 0
    return Number.isFinite(cislo) ? cislo : 0
  }

  const ulozKurzor = (cas: number) => localStorage.setItem(cursorKey, String(cas))

  const syncOneTable = async (userId: string, cfg: TabulkaSync<any>, kurzor: number) => {
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

  let inFlight = false

  const failed = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'Synchronizace selhala.'
    console.warn(`[record-sync:${cursorKey}]`, message)
    setStatus({ status: navigator.onLine === false ? 'offline' : 'error', error: message })
  }

  const runSync = async (): Promise<void> => {
    if (!isSupabaseConfigured) return
    const userId = useAccount.getState().userId
    // Bez skutečného účtu appka jede dál jen nad lokálním úložištěm —
    // stejná "cloud je doplněk, ne podmínka" zásada jako všude jinde.
    if (!userId || useAccount.getState().status !== 'signed-in') return
    if (inFlight) return

    inFlight = true
    setStatus({ status: 'connecting', error: null })

    try {
      // Čas TĚSNĚ PŘED průchodem, ne po něm — konzervativní volba: pár
      // řádků se příště pošle/stáhne znovu (upsert je idempotentní),
      // ale nikdy nic nevznikne během průchodu a neprojde bez povšimnutí.
      const noveKurzor = Date.now()
      const kurzor = nactiKurzor()

      for (const tabulka of ziskejTabulky()) {
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

  const syncNow = (): Promise<void> => {
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

  const start = (): void => {
    if (started || !isSupabaseConfigured) return
    started = true

    void syncNow()

    // Místní změna (přidání/úprava/smazání záznamu) se odešle se
    // zpožděním — víc zápisů za sebou nemá smysl posílat jednotlivě.
    sledujZmeny(() => {
      if (pushTimer) window.clearTimeout(pushTimer)
      pushTimer = window.setTimeout(() => void syncNow(), PUSH_DELAY)
    })

    let posledniUcet = useAccount.getState().userId
    useAccount.subscribe((stav) => {
      if (stav.userId === posledniUcet) return
      posledniUcet = stav.userId
      void syncNow()
    })

    const resync = () => {
      if (document.visibilityState === 'visible') void syncNow()
    }
    document.addEventListener('visibilitychange', resync)
    window.addEventListener('online', () => void syncNow())

    window.addEventListener('pagehide', () => {
      if (pushTimer) window.clearTimeout(pushTimer)
      void syncNow()
    })
  }

  return { useSyncStatus, syncNow, start }
}
