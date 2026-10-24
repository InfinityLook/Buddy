import { useState, FormEvent } from 'react'
import { dokoncitObnovuHesla, signOut } from '@/core/supabase/auth'
import './Login.css'

// ==========================================
// Obnova zapomenutého hesla (audit #8) — appka sem dorazí ze stavu
// useAccount's own 'password-recovery' (App.tsx), poté co uživatel
// klikne na odkaz v e-mailu z Login.tsx's "Zapomenuté heslo?". Celý
// mechanismus rozpoznání appka drží v core/supabase/auth.ts's
// startAuthWatch()/dokoncitObnovuHesla() — tahle obrazovka jen volá
// dokoncitObnovuHesla() a znovu používá appčiny vlastní .login-* třídy
// z Login.css, žádné nové CSS appka nepotřebuje.
// ==========================================

export default function NoveHeslo() {
  const [heslo, setHeslo] = useState('')
  const [hesloZnovu, setHesloZnovu] = useState('')
  const [chyba, setChyba] = useState<string | null>(null)
  const [hotovo, setHotovo] = useState(false)
  const [probiha, setProbiha] = useState(false)

  const odeslat = async (e: FormEvent) => {
    e.preventDefault()
    if (probiha) return

    setChyba(null)

    if (!heslo) {
      setChyba('Napiš nové heslo.')
      return
    }
    if (heslo !== hesloZnovu) {
      setChyba('Hesla se neshodují.')
      return
    }

    setProbiha(true)
    const vysledek = await dokoncitObnovuHesla(heslo)
    setProbiha(false)

    if (!vysledek.ok) {
      setChyba(vysledek.chyba ?? 'Nepovedlo se to.')
      return
    }

    // Po úspěchu appka appku přepne na 'signed-in' (dokoncitObnovuHesla's
    // vlastní setState) — App.tsx se tím pádem skoro hned překreslí a
    // tuhle obrazovku nahradí appkou samotnou. Tahle hláška se buď mihne
    // na okamžik, nebo appka na ni ani nestihne dojít — obojí appce stačí.
    setHotovo(true)
  }

  if (hotovo) {
    return (
      <div className="login-screen">
        <div className="login-glow login-glow--cyan" aria-hidden="true" />
        <div className="login-glow login-glow--violet" aria-hidden="true" />
        <div className="login-card">
          <h1 className="login-title">Heslo je změněné</h1>
          <p className="login-subtitle">Appka tě hned přepne dovnitř.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-screen">
      <div className="login-glow login-glow--cyan" aria-hidden="true" />
      <div className="login-glow login-glow--violet" aria-hidden="true" />

      <div className="login-card">
        <h1 className="login-title">Nastav si nové heslo</h1>
        <p className="login-subtitle">
          Přišel/a jsi z odkazu na obnovu hesla. Zvol si nové a appka tě hned přihlásí.
        </p>

        <form className="login-form" onSubmit={odeslat}>
          <label className="login-field">
            <span>Nové heslo</span>
            <input
              type="password"
              placeholder="••••••••"
              value={heslo}
              onChange={(e) => setHeslo(e.target.value)}
              autoComplete="new-password"
              disabled={probiha}
              autoFocus
            />
          </label>

          <label className="login-field">
            <span>Nové heslo znovu</span>
            <input
              type="password"
              placeholder="••••••••"
              value={hesloZnovu}
              onChange={(e) => setHesloZnovu(e.target.value)}
              autoComplete="new-password"
              disabled={probiha}
            />
          </label>

          {chyba && <p className="login-error">{chyba}</p>}

          <button type="submit" className="login-submit" disabled={probiha}>
            {probiha ? 'Moment…' : 'Nastavit heslo'}
          </button>
        </form>

        <p className="login-signup">
          <button type="button" className="login-link" onClick={() => void signOut()}>
            Zpět na přihlášení
          </button>
        </p>
      </div>

      <p className="login-footer">© {new Date().getFullYear()} Buddy</p>
    </div>
  )
}
