import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ==========================================
// Regresní test pro core/supabase/flushAllSync.ts — vynucený flush
// všech synchronizačních strojů před odhlášením (audit #2+#3, Část A).
//
// Logika je vytažená z SettingsModule.tsx's own handleLogout do
// vlastního, čistého modulu právě proto, ať se tahle sekvence dá
// otestovat bez vykreslování celé komponenty (ta importuje
// core/utils/registerSW.ts, které — stejně jako notify.ts jinde v
// appce — sahá na Vite-only virtual:pwa-register a ve Vitestu by
// nešlo zkompilovat).
//
// flushAllSync.ts samo o sobě staticky importuje cloudSync.ts a
// financeSync.ts/goalTrackerSync.ts/writerSync.ts/skolaSync.ts —
// financeSync.ts (přes useFinance.ts) i goalTrackerSync.ts (přes
// useGoalTracker.ts) samy transitivně sahají na notify.ts/
// registerSW.ts stejnou cestou. Proto appka mockuje přímo těch pět
// syncXNow modulů (ne jejich hlubší závislosti) — vi.mock nahradí
// celý modul ještě PŘED tím, než by Vite musel vůbec začít parsovat
// jeho skutečný zdrojový kód, takže se virtual:pwa-register nikdy
// nedostane ke slovu.
// ==========================================

const cloudSyncMock = vi.hoisted(() => vi.fn<() => Promise<void>>())
const financeSyncMock = vi.hoisted(() => vi.fn<() => Promise<void>>())
const goalTrackerSyncMock = vi.hoisted(() => vi.fn<() => Promise<void>>())
const writerSyncMock = vi.hoisted(() => vi.fn<() => Promise<void>>())
const skolaSyncMock = vi.hoisted(() => vi.fn<() => Promise<void>>())

vi.mock('@/core/supabase/cloudSync', () => ({ syncNow: cloudSyncMock }))
vi.mock('@/miniapps/finance/financeSync', () => ({ syncFinanceNow: financeSyncMock }))
vi.mock('@/miniapps/goal-tracker/goalTrackerSync', () => ({ syncGoalTrackerNow: goalTrackerSyncMock }))
vi.mock('@/flagships/writer-room/writerSync', () => ({ syncWriterNow: writerSyncMock }))
vi.mock('@/flagships/school-room/skolaSync', () => ({ syncSkolaNow: skolaSyncMock }))

import { flushVsechnySynchronizace } from '@/core/supabase/flushAllSync'

describe('flushVsechnySynchronizace', () => {
  beforeEach(() => {
    cloudSyncMock.mockReset().mockResolvedValue(undefined)
    financeSyncMock.mockReset().mockResolvedValue(undefined)
    goalTrackerSyncMock.mockReset().mockResolvedValue(undefined)
    writerSyncMock.mockReset().mockResolvedValue(undefined)
    skolaSyncMock.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('bez argumentu zavolá přesně těch pět reálných synchronizačních funkcí, co appka doopravdy má', async () => {
    await flushVsechnySynchronizace()

    expect(cloudSyncMock).toHaveBeenCalledTimes(1)
    expect(financeSyncMock).toHaveBeenCalledTimes(1)
    expect(goalTrackerSyncMock).toHaveBeenCalledTimes(1)
    expect(writerSyncMock).toHaveBeenCalledTimes(1)
    expect(skolaSyncMock).toHaveBeenCalledTimes(1)
  })

  it('zavolá úplně všechny zadané synchronizační funkce, ne jen první', async () => {
    const volano: string[] = []
    const a = vi.fn(async () => {
      volano.push('a')
    })
    const b = vi.fn(async () => {
      volano.push('b')
    })
    const c = vi.fn(async () => {
      volano.push('c')
    })

    await flushVsechnySynchronizace([a, b, c], 5000)

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
    expect(c).toHaveBeenCalledTimes(1)
    expect(volano.sort()).toEqual(['a', 'b', 'c'])
  })

  it('jeden zaseklý/offline stroj NEzablokuje odeslání ostatních (Promise.allSettled, ne Promise.all)', async () => {
    const uspesny = vi.fn(async () => {})
    const selhavajici = vi.fn(async () => {
      throw new Error('síť je dole')
    })
    const druhyUspesny = vi.fn(async () => {})

    // Samotné zavolání nesmí vyhodit — kdyby appka použila Promise.all,
    // tenhle await by skončil reject a odhlášení samo by se nikdy
    // nestihlo (void signOut()/logout()/navigate() by se nezavolaly).
    await expect(flushVsechnySynchronizace([uspesny, selhavajici, druhyUspesny], 5000)).resolves.toBeUndefined()

    expect(uspesny).toHaveBeenCalledTimes(1)
    expect(selhavajici).toHaveBeenCalledTimes(1)
    expect(druhyUspesny).toHaveBeenCalledTimes(1)
  })

  it('stroj, co nikdy nedoběhne, appku nezablokuje navěky — flush skončí po vlastním časovém limitu', async () => {
    vi.useFakeTimers()

    const nikdyNedobehne = vi.fn(() => new Promise<void>(() => {}))
    const rychleUspesny = vi.fn(async () => {})

    const flushPromise = flushVsechnySynchronizace([nikdyNedobehne, rychleUspesny], 1000)
    let dokonceno = false
    void flushPromise.then(() => {
      dokonceno = true
    })

    // Těsně před limitem appka ještě čeká — kdyby flush neuplatňoval
    // časový limit na KAŽDÝ stroj samostatně, zůstal by viset navěky.
    await vi.advanceTimersByTimeAsync(999)
    expect(dokonceno).toBe(false)

    await vi.advanceTimersByTimeAsync(2)
    expect(dokonceno).toBe(true)
    expect(nikdyNedobehne).toHaveBeenCalledTimes(1)
  })
})
