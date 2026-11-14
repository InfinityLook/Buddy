import { useState, FormEvent } from 'react'
import { BuddyDialog } from '@/components/buddy-ui/BuddyDialog'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured } from '@/core/supabase/client'
import { registerAccount, resetPassword, signIn } from '@/core/supabase/auth'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import './Login.css'

interface LoginProps {
  onLogin: () => void
}

type Rezim = 'prihlaseni' | 'registrace'

export default function Login({ onLogin }: LoginProps) {
  const [rezim, setRezim] = useState<Rezim>('prihlaseni')
  const [email, setEmail] = useState('')
  const [heslo, setHeslo] = useState('')
  const [chyba, setChyba] = useState<string | null>(null)
  const [hlaska, setHlaska] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetBusy, setResetBusy] = useState(false)
  const [probiha, setProbiha] = useState(false)
  const navigate = useNavigate()

  const registruje = rezim === 'registrace'

  const dovnitr = () => {
    onLogin()
    navigate('/hub')
  }

  const { rootAttributes } = useSurfaceAppearance('login')

  const odeslat = async (e: FormEvent) => {
    e.preventDefault()
    if (probiha) return

    setChyba(null)
    setHlaska(null)

    if (!email.trim() || !heslo) {
      setChyba('Vyplň e-mail i heslo.')
      return
    }

    setProbiha(true)
    const vysledek = registruje
      ? await registerAccount(email.trim(), heslo)
      : await signIn(email.trim(), heslo)
    setProbiha(false)

    if (!vysledek.ok) {
      setChyba(vysledek.chyba ?? 'Nepovedlo se to.')
      return
    }

    // Potvrzování e-mailem je nastavení projektu, ne vlastnost aplikace.
    // Když je zapnuté, účet ještě neplatí a je poctivější to říct než
    // pustit uživatele dál a nechat ho narazit až v Socialu.
    if (vysledek.cekaNaPotvrzeni) {
      setHlaska('Účet je založený. Potvrď ho odkazem, který ti přišel na e-mail, a pak se přihlas.')
      setRezim('prihlaseni')
      return
    }

    dovnitr()
  }

  const zapomenuteHeslo = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || resetBusy) return
    setResetError(null)
    setResetBusy(true)
    try {
      const vysledek = await resetPassword(email.trim())
      if (vysledek.ok) {
        setResetOpen(false)
        setHlaska('Odkaz na změnu hesla je na cestě.')
      } else {
        setResetError(vysledek.chyba ?? 'Odkaz se nepodařilo odeslat.')
      }
    } finally {
      setResetBusy(false)
    }
  }

  return (
    <div className="login-screen buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId="login" />

      <main className="login-card buddy-ui-card">
        <div className="login-brand">
          <span className="login-brand__mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"
                fill="url(#brand-gradient)"
              />
              <defs>
                {/* Buddy v2 — CSS proměnné se v SVG prezentačních atributech
                    jako stop-color řeší přes kaskádu stejně jako v CSS,
                    takže appka tu může odkázat přímo na motivové tokeny
                    místo natvrdo daných #35c4f0/#8a5cf6. */}
                <linearGradient id="brand-gradient" x1="3" y1="2" x2="21" y2="20">
                  <stop offset="0" stopColor="var(--accent-cyan)" />
                  <stop offset="1" stopColor="var(--accent-violet)" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="login-brand__name">Buddy</span>
        </div>

        <h1 className="login-title">{registruje ? 'Založ si účet' : 'Vítej zpátky'}</h1>
        <p className="login-subtitle">
          {registruje
            ? 'S účtem si přeneseš postup mezi zařízeními a odemkneš Social.'
            : 'Přihlas se a pokračuj tam, kde jsi skončil/a.'}
        </p>

        <form className="login-form" onSubmit={odeslat} aria-busy={probiha}>
          <label className="login-field">
            <span>E-mail</span>
            <input
              type="email"
              placeholder="jmeno@skola.cz"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={probiha}
            />
          </label>

          <label className="login-field">
            <span>Heslo</span>
            <input
              type="password"
              required
              value={heslo}
              onChange={(e) => setHeslo(e.target.value)}
              autoComplete={registruje ? 'new-password' : 'current-password'}
              disabled={probiha}
            />
          </label>

          {!registruje && (
            <button type="button" className="buddy-ui-button login-forgot" disabled={probiha} onClick={() => {
              setChyba(null)
              setHlaska(null)
              setResetError(null)
              setResetOpen(true)
            }}>
              Zapomenuté heslo?
            </button>
          )}

          {chyba && <p className="login-error buddy-ui-alert" role="alert">{chyba}</p>}
          {hlaska && <p className="login-note buddy-ui-status" role="status">{hlaska}</p>}

          <button type="submit" className="login-submit buddy-ui-button buddy-ui-button--primary" disabled={probiha}>
            {probiha ? 'Moment…' : registruje ? 'Založit účet' : 'Přihlásit se'}
          </button>
        </form>

        {/* Bez nastaveného cloudu nemá jak účet vzniknout. Blokovat vstup
            by v takovém případě neposloužilo nikomu — uživatel by se do
            aplikace nedostal a neměl by jak to spravit. */}
        {!isSupabaseConfigured && (
          <>
            <div className="login-divider">
              <span>nebo</span>
            </div>
            <p className="login-note">
              Účty nejsou v téhle verzi nastavené, takže se přihlásit nedá.
            </p>
            <button type="button" className="buddy-ui-button login-guest" onClick={dovnitr}>
              Pokračovat bez účtu
            </button>
          </>
        )}

        <p className="login-signup">
          {registruje ? 'Účet už máš?' : 'Nemáš účet?'}{' '}
          <button
            type="button"
            className="buddy-ui-button login-link" disabled={probiha}
            onClick={() => {
              setRezim(registruje ? 'prihlaseni' : 'registrace')
              setChyba(null)
              setHlaska(null)
            }}
          >
            {registruje ? 'Přihlas se' : 'Zaregistruj se'}
          </button>
        </p>
      </main>

      {resetOpen && (
        <BuddyDialog title="Zapomenuté heslo" surfaceId="login" presentation="sheet"
          onClose={() => { if (!resetBusy) setResetOpen(false) }}>
          <form className="login-form" onSubmit={zapomenuteHeslo} aria-busy={resetBusy}>
            <label className="login-field">
              <span>E-mail pro obnovu</span>
              <input type="email" autoComplete="email" value={email} required disabled={resetBusy}
                onChange={event => setEmail(event.target.value)} />
            </label>
            {resetError && <p className="buddy-ui-alert" role="alert">{resetError}</p>}
            <button className="buddy-ui-button buddy-ui-button--primary" type="submit" disabled={resetBusy || !email.trim()}>
              {resetBusy ? 'Odesílám…' : 'Poslat odkaz'}
            </button>
          </form>
        </BuddyDialog>
      )}
      <p className="login-footer">© {new Date().getFullYear()} Buddy</p>
    </div>
  )
}
