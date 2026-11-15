import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, useAccount } from '@/core/supabase/auth'
import { smazatUcet } from '@/core/supabase/deleteAccount'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import '@/pages/login/Login.css'

// ==========================================
// Smazání účtu a souvisejících dat (Google Play: Account Deletion).
//
// Jedna stránka pro obě cesty, které Google chce:
//   • v appce: Nastavení → Zabezpečení → Smazat účet,
//   • na webu: veřejná adresa /smazat-ucet (nejde za přihlášením — kdo už
//     appku nemá nainstalovanou, se tu může přihlásit a účet smazat).
// Skutečné mazání dělá api/delete-account.ts; tady je jen potvrzení.
// ==========================================

const MAZE_SE = [
  'profil, jméno, avatar a banner, XP, odznaky a streak',
  'příspěvky, příběhy, komentáře, lajky, uložené příspěvky a sledování',
  'zprávy a přílohy, které jsi poslal/a, všechny nahrané fotky a videa',
  'finance, rozvrh, známky, cíle, psaní a další data synchronizovaná do cloudu',
  'tikety v podpoře a hlášení chyb z tvého zařízení',
  'všechna data uložená v tomhle zařízení (po úspěšném smazání)',
]

const ZUSTAVA = [
  'zprávy v cizích konverzacích zůstanou druhým jako „Zpráva smazána“ — bez textu, příloh a bez tvého jména',
  'hlášení uživatelů, záznamy moderace a auditu a blokace zůstávají jen jako anonymní evidence bezpečnosti, bez odkazu na tebe',
]

export default function SmazaniUctuPage() {
  const navigate = useNavigate()
  const { rootAttributes } = useSurfaceAppearance('login')
  const { status, userId, email: emailUctu } = useAccount()

  const [prihlasEmail, setPrihlasEmail] = useState('')
  const [prihlasHeslo, setPrihlasHeslo] = useState('')
  const [potvrzeniEmail, setPotvrzeniEmail] = useState('')
  const [rozumim, setRozumim] = useState(false)
  const [chyba, setChyba] = useState<string | null>(null)
  const [probiha, setProbiha] = useState(false)
  const [smazano, setSmazano] = useState(false)

  const prihlasit = async (e: FormEvent) => {
    e.preventDefault()
    if (probiha) return
    setChyba(null)
    setProbiha(true)
    const vysledek = await signIn(prihlasEmail.trim(), prihlasHeslo)
    setProbiha(false)
    if (!vysledek.ok) setChyba(vysledek.chyba ?? 'Přihlášení se nepovedlo.')
  }

  const smazat = async (e: FormEvent) => {
    e.preventDefault()
    if (probiha) return
    setChyba(null)
    setProbiha(true)
    const vysledek = await smazatUcet(potvrzeniEmail.trim())
    setProbiha(false)
    if (!vysledek.ok) {
      setChyba(vysledek.chyba ?? 'Smazání se nepovedlo.')
      return
    }
    setSmazano(true)
  }

  const obal = (obsah: React.ReactNode) => (
    <div className="login-screen buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId="login" />
      <main className="login-card buddy-ui-card">{obsah}</main>
      <p className="login-footer">© {new Date().getFullYear()} Buddy</p>
    </div>
  )

  if (smazano) {
    return obal(
      <>
        <h1 className="login-title">Účet je smazaný</h1>
        <p className="login-subtitle" role="status">
          Tvůj účet a související data byly smazány a data v tomhle zařízení vyčištěna.
        </p>
        <p className="login-signup">
          <button type="button" className="buddy-ui-button login-link" onClick={() => navigate('/', { replace: true })}>
            Zpět na úvod
          </button>
        </p>
      </>,
    )
  }

  if (status === 'loading') {
    return obal(<p className="login-subtitle" role="status">Načítám…</p>)
  }

  if (status === 'off') {
    return obal(
      <>
        <h1 className="login-title">Smazání účtu</h1>
        <p className="login-subtitle">V téhle verzi appky nejsou účty zapnuté, takže není co mazat v cloudu.</p>
      </>,
    )
  }

  const prihlasen = userId !== null && (status === 'signed-in' || status === 'anonymous')
  const maEmail = Boolean(emailUctu)

  const seznamy = (
    <>
      <p className="login-subtitle"><strong>Smaže se:</strong></p>
      <ul className="smazani-seznam">
        {MAZE_SE.map((t) => <li key={t}>{t}</li>)}
      </ul>
      <p className="login-subtitle"><strong>Zůstane (anonymně):</strong></p>
      <ul className="smazani-seznam">
        {ZUSTAVA.map((t) => <li key={t}>{t}</li>)}
      </ul>
      <p className="login-subtitle">Smazání je nevratné. Zálohy, které sis stáhl/a do souboru, jsou jen u tebe — ty smazat musíš sám/sama.</p>
    </>
  )

  if (!prihlasen) {
    return obal(
      <>
        <h1 className="login-title">Smazat účet</h1>
        <p className="login-subtitle">Pro smazání účtu se nejdřív přihlas.</p>
        <form className="login-form" onSubmit={prihlasit} aria-busy={probiha}>
          <label className="login-field">
            <span>E-mail</span>
            <input type="email" required value={prihlasEmail} onChange={(e) => setPrihlasEmail(e.target.value)} autoComplete="email" disabled={probiha} />
          </label>
          <label className="login-field">
            <span>Heslo</span>
            <input type="password" required value={prihlasHeslo} onChange={(e) => setPrihlasHeslo(e.target.value)} autoComplete="current-password" disabled={probiha} />
          </label>
          {chyba && <p className="login-error buddy-ui-alert" role="alert">{chyba}</p>}
          <button type="submit" className="login-submit buddy-ui-button buddy-ui-button--primary" disabled={probiha}>
            {probiha ? 'Moment…' : 'Přihlásit se'}
          </button>
        </form>
        {seznamy}
      </>,
    )
  }

  return obal(
    <>
      <h1 className="login-title">Smazat účet</h1>
      {seznamy}
      <form className="login-form" onSubmit={smazat} aria-busy={probiha}>
        {maEmail && (
          <label className="login-field">
            <span>Pro potvrzení napiš e-mail účtu ({emailUctu})</span>
            <input type="email" required value={potvrzeniEmail} onChange={(e) => setPotvrzeniEmail(e.target.value)} autoComplete="off" disabled={probiha} />
          </label>
        )}
        <label className="login-field">
          <span>
            <input type="checkbox" checked={rozumim} onChange={(e) => setRozumim(e.target.checked)} disabled={probiha} />{' '}
            Rozumím, že smazání je nevratné.
          </span>
        </label>
        {chyba && <p className="login-error buddy-ui-alert" role="alert">{chyba}</p>}
        <button
          type="submit"
          className="login-submit buddy-ui-button buddy-ui-button--primary"
          disabled={probiha || !rozumim || (maEmail && !potvrzeniEmail.trim())}
        >
          {probiha ? 'Mažu…' : 'Trvale smazat účet'}
        </button>
      </form>
      <p className="login-signup">
        <button type="button" className="buddy-ui-button login-link" disabled={probiha} onClick={() => navigate(-1)}>
          Zrušit
        </button>
      </p>
    </>,
  )
}
