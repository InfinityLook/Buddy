import { syncNow } from './cloudSync'
import { syncFinanceNow } from '@/miniapps/finance/financeSync'
import { syncGoalTrackerNow } from '@/miniapps/goal-tracker/goalTrackerSync'
import { syncWriterNow } from '@/flagships/writer-room/writerSync'
import { syncSkolaNow } from '@/flagships/school-room/skolaSync'

// ==========================================
// Vynutí jeden okamžitý (ne debounced) průchod VŠECH pěti
// synchronizačních strojů — audit #2+#3, Část A.
//
// SettingsModule.tsx's handleLogout tohle volá PŘED signOut(): jakmile
// se relace přepne, RLS appce znemožní odeslat data pod starou
// identitou, takže tenhle flush musí doběhnout dřív, ne po něm.
// Debounced push appky normálně čeká 2,5–3 s po poslední úpravě (viz
// cloudSync.ts/financeSync.ts/recordSync.ts) — bez téhle vynucené
// verze by úprava udělaná pár vteřin před odhlášením mohla zůstat jen
// lokálně a nikdy se nedostat do cloudu.
//
// Vytažené z komponenty do vlastního, čistého modulu právě proto, ať
// se tahle sekvence dá otestovat bez vykreslování celého
// SettingsModule.tsx (ten importuje core/utils/registerSW.ts, které
// — stejně jako notify.ts jinde v appce — sahá na Vite-only
// virtual:pwa-register a ve Vitestu by nešlo vůbec zkompilovat).
// Seznam synchronizačních funkcí appka přijímá jako argument (s
// výchozí hodnotou = těch pět skutečných) přesně proto, ať to test
// může zavolat s vlastními fake funkcemi bez mockování pěti modulů.
// ==========================================

export type SynchronizacniFunkce = () => Promise<void>

export const VYCHOZI_SYNCHRONIZACE: SynchronizacniFunkce[] = [
  syncNow,
  syncFinanceNow,
  syncGoalTrackerNow,
  syncWriterNow,
  syncSkolaNow,
]

export const FLUSH_TIMEOUT_MS = 5000

// Časový limit u každého průchodu samostatně (ne jeden společný) je
// čistě obranný — appka ho se třemi úspěšnými průchody a dvěma
// zaseklými neblokuje navěky, "cloud je doplněk, ne podmínka" platí i
// tady: odhlášení musí proběhnout i offline nebo při výpadku sítě, jen
// o ten flush navíc přijde.
const sOmezenymCasem = (prubeh: Promise<void>, limitMs: number): Promise<void> =>
  Promise.race([prubeh, new Promise<void>((resolve) => window.setTimeout(resolve, limitMs))])

/**
 * Zavolá každou ze zadaných synchronizačních funkcí a počká, až se
 * všechny buď dokončí, nebo vyprší jejich vlastní časový limit —
 * Promise.allSettled, ne Promise.all, ať jeden zaseklý/offline stroj
 * (nebo appka bez nastaveného Supabase vůbec, kdy syncNow() vrací
 * Promise.resolve() okamžitě) nesmí shodit flush ostatních.
 */
export const flushVsechnySynchronizace = async (
  synchronizace: SynchronizacniFunkce[] = VYCHOZI_SYNCHRONIZACE,
  limitMs: number = FLUSH_TIMEOUT_MS
): Promise<void> => {
  await Promise.allSettled(synchronizace.map((fn) => sOmezenymCasem(fn(), limitMs)))
}
