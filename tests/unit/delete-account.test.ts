import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Fake klient Supabase: relace s tokenem, signOut, bez sítě.
const { signOut, getSession } = vi.hoisted(() => ({
  signOut: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('@/core/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { getSession, signOut } },
}))

import { smazMistniData, smazatUcet } from '@/core/supabase/deleteAccount'
import { useAuthStore } from '@/core/store/useAuthStore'

describe('smazMistniData', () => {
  beforeEach(() => localStorage.clear())

  it('smaže schoolbuddy-* a sb-* klíče, cizí klíče nechá', async () => {
    localStorage.setItem('schoolbuddy-profile-storage', 'x')
    localStorage.setItem('schoolbuddy-finance-sync-cursor', '1')
    localStorage.setItem('sb-abc-auth-token', 'tok')
    localStorage.setItem('jiny-klic', 'zustane')

    await smazMistniData()

    expect(localStorage.getItem('schoolbuddy-profile-storage')).toBeNull()
    expect(localStorage.getItem('schoolbuddy-finance-sync-cursor')).toBeNull()
    expect(localStorage.getItem('sb-abc-auth-token')).toBeNull()
    expect(localStorage.getItem('jiny-klic')).toBe('zustane')
  })
})

describe('smazatUcet', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    signOut.mockReset()
    signOut.mockResolvedValue({ error: null })
    localStorage.clear()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('bez relace nic nevolá a vrátí chybu', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    const v = await smazatUcet('a@b.cz')
    expect(v.ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('pošle token a e-mail a při chybě serveru nic místně nemaže', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'TOKEN' } } })
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ chyba: 'E-mail se neshoduje s e-mailem účtu.' }) })
    localStorage.setItem('schoolbuddy-profile-storage', 'x')

    const v = await smazatUcet('a@b.cz')

    expect(fetchMock).toHaveBeenCalledWith('/api/delete-account', expect.objectContaining({ method: 'POST' }))
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer TOKEN')
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.cz' })
    expect(v).toEqual({ ok: false, chyba: 'E-mail se neshoduje s e-mailem účtu.' })
    expect(localStorage.getItem('schoolbuddy-profile-storage')).toBe('x')
    expect(signOut).not.toHaveBeenCalled()
  })

  it('síťová chyba vrátí srozumitelnou hlášku', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'T' } } })
    fetchMock.mockRejectedValue(new Error('offline'))
    const v = await smazatUcet('a@b.cz')
    expect(v.ok).toBe(false)
    expect(v.chyba).toMatch(/online/)
  })

  it('po úspěchu odhlásí a vyčistí zařízení', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'T' } } })
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    localStorage.setItem('schoolbuddy-profile-storage', 'x')
    useAuthStore.getState().login()

    const v = await smazatUcet('a@b.cz')

    expect(v.ok).toBe(true)
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(localStorage.getItem('schoolbuddy-profile-storage')).toBeNull()
    expect(useAuthStore.getState().isAuthed).toBe(false)
  })
})
