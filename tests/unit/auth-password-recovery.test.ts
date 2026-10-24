import { beforeEach, describe, expect, it, vi } from 'vitest'

// ==========================================
// Regresní test pro core/supabase/auth.ts (audit #8) — appka dřív
// nemohla obnovu zapomenutého hesla ani jednou doopravdy ověřit testem,
// protože startAuthWatch()/dokoncitObnovuHesla() přímo volají
// supabase.auth.* (ne jen core/supabase/client.ts's isSupabaseConfigured
// jako cloud-sync-ucet.test.ts) — appka proto mockuje celý supabase
// export, stejný vzor, co appka použila u cloudSync testů, jen o jeden
// krok hlouběji.
//
// client.ts's samotná oprava (detectSessionInUrl: false → true) appka
// tady neověří přímo — appka ji jen zkontroluje čtením zdrojového
// souboru (stejně jako appka appčin vercel.json ověřila ve finding
// #7), protože appka doopravdy přečte token z URL jen v reálném
// prohlížeči s reálným odkazem, ne v jsdom mocku.
// ==========================================

const getSessionMock = vi.hoisted(() => vi.fn())
const onAuthStateChangeMock = vi.hoisted(() => vi.fn())
const updateUserMock = vi.hoisted(() => vi.fn())
const signOutMock = vi.hoisted(() => vi.fn())
const resetPasswordForEmailMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      updateUser: updateUserMock,
      signOut: signOutMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
    },
  },
}))

import { dokoncitObnovuHesla, resetPassword, startAuthWatch, useAccount } from '@/core/supabase/auth'

type Udalost = 'PASSWORD_RECOVERY' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'INITIAL_SESSION'
type ZachycenyRelace = { user: { id: string; email?: string; is_anonymous?: boolean } } | null
type Posluchac = (udalost: Udalost, relace: ZachycenyRelace) => void

// startAuthWatch appka volá jen jednou za celý běh appky (appčina
// vlastní jednorázová pojistka `sleduje`) — appka ho proto v testu
// zavolá taky jen jednou a zachyceného posluchače pak zkouší opakovaně
// s různými eventy, stejně jako appka dřív u cloudSync testovala
// SKUTEČNÉ chování, ne jen že appka volání proběhlo.
getSessionMock.mockResolvedValue({ data: { session: null } })
startAuthWatch()
const posluchac = onAuthStateChangeMock.mock.calls[0][0] as Posluchac

const relace = (id: string, email: string): ZachycenyRelace => ({ user: { id, email, is_anonymous: false } })

describe('startAuthWatch — rozlišení PASSWORD_RECOVERY eventu (audit #8)', () => {
  beforeEach(() => {
    useAccount.setState({ status: 'loading', userId: null, email: null })
  })

  it('PASSWORD_RECOVERY event appka přepne na appčin vlastní stav password-recovery, ne signed-in', () => {
    posluchac('PASSWORD_RECOVERY', relace('u1', 'a@b.cz'))

    expect(useAccount.getState().status).toBe('password-recovery')
    expect(useAccount.getState().userId).toBe('u1')
    expect(useAccount.getState().email).toBe('a@b.cz')
  })

  it('appka ve stavu password-recovery ignoruje ambientní TOKEN_REFRESHED (appku nepřepíše zpátky na signed-in)', () => {
    posluchac('PASSWORD_RECOVERY', relace('u1', 'a@b.cz'))
    posluchac('TOKEN_REFRESHED', relace('u1', 'a@b.cz'))

    expect(useAccount.getState().status).toBe('password-recovery')
  })

  it('appka ve stavu password-recovery ignoruje i opakovanou INITIAL_SESSION', () => {
    posluchac('PASSWORD_RECOVERY', relace('u1', 'a@b.cz'))
    posluchac('INITIAL_SESSION', relace('u1', 'a@b.cz'))

    expect(useAccount.getState().status).toBe('password-recovery')
  })

  it('SIGNED_OUT appku ze stavu password-recovery pustí ven (appčino vlastní "Zpět na přihlášení")', () => {
    posluchac('PASSWORD_RECOVERY', relace('u1', 'a@b.cz'))
    posluchac('SIGNED_OUT', null)

    expect(useAccount.getState().status).toBe('anonymous')
    expect(useAccount.getState().userId).toBeNull()
  })

  it('mimo appčin password-recovery appka normální SIGNED_IN zapíše jako dřív (žádná regrese)', () => {
    posluchac('SIGNED_IN', relace('u2', 'c@d.cz'))

    expect(useAccount.getState().status).toBe('signed-in')
    expect(useAccount.getState().userId).toBe('u2')
  })
})

describe('dokoncitObnovuHesla (audit #8)', () => {
  beforeEach(() => {
    updateUserMock.mockReset()
    useAccount.setState({ status: 'password-recovery', userId: 'u1', email: 'a@b.cz' })
  })

  it('po úspěšné změně appka appku přepne zpátky na signed-in', async () => {
    updateUserMock.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.cz' } }, error: null })

    const vysledek = await dokoncitObnovuHesla('noveTajneHeslo123')

    expect(vysledek.ok).toBe(true)
    expect(updateUserMock).toHaveBeenCalledWith({ password: 'noveTajneHeslo123' })
    expect(useAccount.getState().status).toBe('signed-in')
    expect(useAccount.getState().userId).toBe('u1')
  })

  it('appka při chybě appku NEchá ve stavu password-recovery a přeloží appčinu hlášku o krátkém heslu', async () => {
    updateUserMock.mockResolvedValue({ data: {}, error: new Error('Password should be at least 6 characters.') })

    const vysledek = await dokoncitObnovuHesla('a')

    expect(vysledek.ok).toBe(false)
    expect(vysledek.chyba).toBe('Heslo musí mít aspoň 6 znaků.')
    expect(useAccount.getState().status).toBe('password-recovery')
  })

  it('appka přeloží appčinu specifickou hlášku "nové heslo musí být jiné než staré"', async () => {
    updateUserMock.mockResolvedValue({
      data: {},
      error: new Error('New password should be different from the old password.'),
    })

    const vysledek = await dokoncitObnovuHesla('stareHeslo')

    expect(vysledek.chyba).toBe('Nové heslo musí být jiné než to staré.')
  })

  it('appka přeloží appčinu hlášku o vypršelém/použitém odkazu', async () => {
    updateUserMock.mockResolvedValue({ data: {}, error: new Error('Auth session missing!') })

    const vysledek = await dokoncitObnovuHesla('noveHeslo123')

    expect(vysledek.chyba).toBe('Odkaz na obnovu hesla vypršel nebo už byl použitý. Zkus si vyžádat nový.')
  })
})

describe('resetPassword — žádná regrese (appka appku stejně pošle jako dřív)', () => {
  it('appka zavolá resetPasswordForEmail se správným e-mailem a appčiným vlastním původem', async () => {
    resetPasswordForEmailMock.mockReset().mockResolvedValue({ error: null })

    const vysledek = await resetPassword('kdokoli@appka.cz')

    expect(vysledek.ok).toBe(true)
    expect(resetPasswordForEmailMock).toHaveBeenCalledWith('kdokoli@appka.cz', { redirectTo: expect.any(String) })
  })
})

describe('client.ts — appka doopravdy čte token z URL (audit #8, ověřeno čtením zdrojáku)', () => {
  it('detectSessionInUrl appka nastavuje na true, ne na false', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
    const zdroj = fs.readFileSync(path.join(koren, 'src/core/supabase/client.ts'), 'utf-8')

    expect(zdroj).toMatch(/detectSessionInUrl:\s*true/)
    expect(zdroj).not.toMatch(/detectSessionInUrl:\s*false/)
  })
})
