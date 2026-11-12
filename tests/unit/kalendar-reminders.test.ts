import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Udalost } from '@/miniapps/kalendar/types'

// kalendarReminders.ts importuje core/utils/notify.ts (Vite-only
// virtual:pwa-register, stejný důvod proč rozvrhReminders.ts testuje jen
// svoje pure jádro) - zamockuju showAppNotification přímo, ať jde reálně
// vyzkoušet NOVOU/změněnou plánovací logiku (Map dedup, MAX_ZPOZDENI).
vi.mock('@/core/utils/notify', () => ({
  showAppNotification: vi.fn(),
}))

const udalost = (over: Partial<Udalost> = {}): Udalost => ({
  id: 'u1',
  datum: '2024-01-10',
  nazev: 'Test',
  popis: '',
  createdAt: 0,
  opakovani: 'zadne',
  celodenni: false,
  casOd: '10:00',
  casDo: undefined,
  datumDo: undefined,
  vyjimky: [],
  pripominkaMinut: 10,
  updatedAt: 0,
  deletedAt: null,
  ...over,
})

async function cerstvyModul() {
  vi.resetModules()
  const notify = await import('@/core/utils/notify')
  const { useKalendarStore } = await import('@/miniapps/kalendar/useKalendar')
  const { setupKalendarReminders } = await import('@/miniapps/kalendar/kalendarReminders')
  return { showAppNotification: notify.showAppNotification as unknown as ReturnType<typeof vi.fn>, useKalendarStore, setupKalendarReminders }
}

describe('kalendarReminders - plánovací logika (mock notify.ts)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-10T09:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('odešle připomínku v přesný naplánovaný okamžik', async () => {
    const { showAppNotification, useKalendarStore, setupKalendarReminders } = await cerstvyModul()
    useKalendarStore.setState({ udalosti: [udalost()] })
    setupKalendarReminders()

    // Událost v 10:00, připomínka 10 min předem -> 9:50. Teď je 9:00,
    // tedy za 50 minut.
    expect(showAppNotification).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(50 * 60_000 - 1)
    expect(showAppNotification).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(showAppNotification).toHaveBeenCalledTimes(1)
    expect(showAppNotification).toHaveBeenCalledWith('Blíží se událost', 'Test v 10:00', 'kalendar-u1')
  })

  it('nepošle připomínku dvakrát, i když se naplánuje znovu krátce po odeslání', async () => {
    const { showAppNotification, useKalendarStore, setupKalendarReminders } = await cerstvyModul()
    useKalendarStore.setState({ udalosti: [udalost()] })
    setupKalendarReminders()

    await vi.advanceTimersByTimeAsync(50 * 60_000)
    expect(showAppNotification).toHaveBeenCalledTimes(1)

    // Návrat do appky (focus/visibilitychange) hned po odeslání nesmí
    // vyvolat druhou notifikaci na ten samý výskyt.
    window.dispatchEvent(new Event('focus'))
    await vi.advanceTimersByTimeAsync(0)
    expect(showAppNotification).toHaveBeenCalledTimes(1)
  })

  it('dvě události se stejným okamžikem připomínky dostanou DVĚ oddělené notifikace (různé tagy)', async () => {
    const { showAppNotification, useKalendarStore, setupKalendarReminders } = await cerstvyModul()
    useKalendarStore.setState({
      udalosti: [udalost({ id: 'a', nazev: 'A' }), udalost({ id: 'b', nazev: 'B' })],
    })
    setupKalendarReminders()

    await vi.advanceTimersByTimeAsync(50 * 60_000)
    expect(showAppNotification).toHaveBeenCalledTimes(2)
    expect(showAppNotification).toHaveBeenCalledWith('Blíží se událost', 'A v 10:00', 'kalendar-a')
    expect(showAppNotification).toHaveBeenCalledWith('Blíží se událost', 'B v 10:00', 'kalendar-b')
  })

  it('celodenní událost ohlásí jen název, bez času', async () => {
    const { showAppNotification, useKalendarStore, setupKalendarReminders } = await cerstvyModul()
    useKalendarStore.setState({
      udalosti: [udalost({ datum: '2024-01-11', celodenni: true, casOd: undefined, pripominkaMinut: 60 })],
    })
    setupKalendarReminders()

    // Celodenní -> appka počítá "začátek" od 00:00 dne události (11. 1.),
    // připomínka 60 min předem -> 10. 1. 23:00, tedy 14 hodin od "teď"
    // (10. 1. 9:00).
    await vi.advanceTimersByTimeAsync(14 * 60 * 60_000 - 1)
    expect(showAppNotification).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(showAppNotification).toHaveBeenCalledWith('Blíží se událost', 'Test', 'kalendar-u1')
  })

  it('smazaná událost (deletedAt) nikdy nic neohlásí', async () => {
    const { showAppNotification, useKalendarStore, setupKalendarReminders } = await cerstvyModul()
    useKalendarStore.setState({ udalosti: [udalost({ deletedAt: Date.now() })] })
    setupKalendarReminders()

    await vi.advanceTimersByTimeAsync(24 * 60 * 60_000)
    expect(showAppNotification).not.toHaveBeenCalled()
  })

  it('událost bez pripominkaMinut nikdy nic neohlásí', async () => {
    const { showAppNotification, useKalendarStore, setupKalendarReminders } = await cerstvyModul()
    useKalendarStore.setState({ udalosti: [udalost({ pripominkaMinut: null })] })
    setupKalendarReminders()

    await vi.advanceTimersByTimeAsync(24 * 60 * 60_000)
    expect(showAppNotification).not.toHaveBeenCalled()
  })

  it('přidání nové události přes store se promítne do nového plánu (naplánuj se spustí na subscribe)', async () => {
    const { showAppNotification, useKalendarStore, setupKalendarReminders } = await cerstvyModul()
    useKalendarStore.setState({ udalosti: [] })
    setupKalendarReminders()

    await vi.advanceTimersByTimeAsync(24 * 60 * 60_000)
    expect(showAppNotification).not.toHaveBeenCalled()

    // Teď (9:00 druhého dne) přidám událost se stejnou připomínkou za 5 minut.
    useKalendarStore.setState({
      udalosti: [udalost({ datum: '2024-01-11', casOd: '09:05', pripominkaMinut: 0 })],
    })
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(showAppNotification).toHaveBeenCalledTimes(1)
  })

  it('velmi vzdálená připomínka (přes 24.8 dne) appku nerozbije přetečením setTimeout', async () => {
    const { showAppNotification, useKalendarStore, setupKalendarReminders } = await cerstvyModul()
    // Událost 9. 2. v 10:00, připomínka 10 min předem (09:50), bez
    // opakování. Od "teď" (10. 1. 9:00) je to přesně 30 dní + 50 minut
    // = 2 595 000 000 ms - víc než MAX_ZPOZDENI (2 147 483 647 ms,
    // ~24,855 dne), appka si to tedy musí rozdělit na dvě dávky.
    const CEKANI_MS = 30 * 24 * 60 * 60_000 + 50 * 60_000
    useKalendarStore.setState({
      udalosti: [udalost({ datum: '2024-02-09', pripominkaMinut: 10 })],
    })
    setupKalendarReminders()

    // O 20 dní dál appka ještě NESMÍ ohlásit (přetečení by způsobilo
    // okamžité - špatné - vypálení už po první dávce).
    await vi.advanceTimersByTimeAsync(20 * 24 * 60 * 60_000)
    expect(showAppNotification).not.toHaveBeenCalled()

    // Těsně před přesným okamžikem (napříč oběma dávkami) ještě nic,
    // přesně v něm ano - appčina dávkovací logika neztratí přesnost.
    await vi.advanceTimersByTimeAsync(CEKANI_MS - 20 * 24 * 60 * 60_000 - 1)
    expect(showAppNotification).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(showAppNotification).toHaveBeenCalledTimes(1)
  })
})
