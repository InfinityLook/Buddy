import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAppStore } from '@/core/store/useAppStore'

// ==========================================
// core/store/useAppStore.ts — jen markAppOpened, testováno přímo přes
// Zustand store API (getState()/setState()), stejný vzor jako
// gamification.test.ts. Store je sdílený singleton, proto se `apps`
// před každým testem resetuje na čerstvý katalog bez lastOpenedAt.
// ==========================================

const vychoziStav = useAppStore.getState()

const resetStore = () => {
  useAppStore.setState({
    apps: vychoziStav.apps.map((app) => ({ ...app, lastOpenedAt: null })),
    activeAppId: null,
    returnPath: null,
  })
}

beforeEach(() => {
  resetStore()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-22T12:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('markAppOpened', () => {
  it('zapíše aktuální čas do lastOpenedAt jen u zadané appky', () => {
    useAppStore.getState().markAppOpened('school-room')

    const skola = useAppStore.getState().apps.find((a) => a.id === 'school-room')
    const jina = useAppStore.getState().apps.find((a) => a.id === 'fitness-room')

    expect(skola?.lastOpenedAt).toBe(Date.now())
    expect(jina?.lastOpenedAt).toBeNull()
  })

  it('nemění activeAppId ani returnPath — na rozdíl od setActiveAppId', () => {
    useAppStore.getState().markAppOpened('school-room')

    expect(useAppStore.getState().activeAppId).toBeNull()
    expect(useAppStore.getState().returnPath).toBeNull()
  })

  it('neznámé id nerozbije zbytek katalogu', () => {
    expect(() => useAppStore.getState().markAppOpened('neexistuje')).not.toThrow()
    expect(useAppStore.getState().apps.every((a) => a.lastOpenedAt === null)).toBe(true)
  })
})
