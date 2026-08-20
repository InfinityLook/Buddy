import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured } from '@/core/supabase/client'
import { registerAccount, resetPassword, signIn } from '@/core/supabase/auth'
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
  const [probiha, setProbiha] = useState(false)
  const navigate = useNavigate()

  const registruje = rezim === 'registrace'

  const dovnitr = () => {
    onLogin()
    navigate('/hub')
  }

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

  const zapomenuteHeslo = async () => {
    setChyba(null)
    setHlaska(null)

    if (!email.trim()) {
      setChyba('Napiš nejdřív e-mail, pošlu na něj odkaz.')
      return
    }

    const vysledek = await resetPassword(email.trim())
    if (vysledek.ok) setHlaska('Odkaz na změnu hesla je na cestě.')
    else setChyba(vysledek.chyba ?? 'Nepovedlo se to.')
  }

  return (
    <div className="login-screen">
      <div className="login-glow login-glow--cyan" aria-hidden="true" />
      <div className="login-glow login-glow--violet" aria-hidden="true" />

      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand__mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"
                fill="url(#brand-gradient)"
              />
              <defs>
                <linearGradient id="brand-gradient" x1="3" y1="2" x2="21" y2="20">
                  <stop offset="0" stopColor="#35c4f0" />
                  <stop offset="1" stopColor="#8a5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="login-brand__name">SchoolBuddy</span>
        </div>

        <h1 className="login-title">{registruje ? 'Založ si účet' : 'Vítej zpátky'}</h1>
        <p className="login-subtitle">
          {registruje
            ? 'S účtem si přeneseš postup mezi zařízeními a odemkneš Social.'
            : 'Přihlas se a pokračuj tam, kde jsi skončil/a.'}
        </p>

        <form className="login-form" onSubmit={odeslat}>
          <label className="login-field">
            <span>E-mail</span>
            <input
              type="email"
              placeholder="jmeno@skola.cz"
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
              placeholder="••••••••"
              value={heslo}
              onChange={(e) => setHeslo(e.target.value)}
              autoComplete={registruje ? 'new-password' : 'current-password'}
              disabled={probiha}
            />
          </label>

          {!registruje && (
            <button type="button" className="login-forgot" onClick={zapomenuteHeslo}>
              Zapomenuté heslo?
            </button>
          )}

          {chyba && <p className="login-error">{chyba}</p>}
          {hlaska && <p className="login-note">{hlaska}</p>}

          <button type="submit" className="login-submit" disabled={probiha}>
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
            <button type="button" className="login-guest" onClick={dovnitr}>
              Pokračovat bez účtu
            </button>
          </>
        )}

        <p className="login-signup">
          {registruje ? 'Účet už máš?' : 'Nemáš účet?'}{' '}
          <button
            type="button"
            className="login-link"
            onClick={() => {
              setRezim(registruje ? 'prihlaseni' : 'registrace')
              setChyba(null)
              setHlaska(null)
            }}
          >
            {registruje ? 'Přihlas se' : 'Zaregistruj se'}
          </button>
        </p>
      </div>

      <p className="login-footer">© {new Date().getFullYear()} SchoolBuddy</p>
    </div>
  )
}
