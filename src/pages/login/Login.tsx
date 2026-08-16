import { useState, FormEvent, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

interface LoginProps {
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const navigate = useNavigate()

  // Visual-only submit for now — wire this to the real auth endpoint later.
  function handleSubmit(e: FormEvent | MouseEvent) {
    e.preventDefault()
    onLogin()
    navigate('/hub')
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

        <h1 className="login-title">Vítej zpátky</h1>
        <p className="login-subtitle">Přihlas se a pokračuj tam, kde jsi skončil/a.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>E-mail</span>
            <input
              type="email"
              placeholder="jmeno@skola.cz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="login-field">
            <span>Heslo</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button type="button" className="login-forgot">
            Zapomenuté heslo?
          </button>

          <button type="submit" className="login-submit">
            Přihlásit se
          </button>
        </form>

        <div className="login-divider">
          <span>nebo</span>
        </div>

        <button type="button" className="login-google" onClick={handleSubmit}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
            />
          </svg>
          Pokračovat s Google
        </button>

        <p className="login-signup">
          Nemáš účet? <button type="button" className="login-link">Zaregistruj se</button>
        </p>
      </div>

      <p className="login-footer">© {new Date().getFullYear()} SchoolBuddy</p>
    </div>
  )
}
