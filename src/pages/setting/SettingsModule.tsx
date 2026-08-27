import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { useHasPermission } from '@/core/role'
import { useThemeStore, VSECHNY_VZHLEDY } from '@/core/theme'
import { jeBiometrieDostupna, zaregistrujBiometrii } from '@/core/utils/biometrics'
import { AVATAR_FRAMES } from '@/social/avatarFrames'
import './SettingsModule.css'

// ==========================================
// Nastavení aplikace. Zatím obsahuje osobní údaje a zabezpečení, ale je
// to místo, kam patří všechno další nastavení — dřív bylo schované
// v bottom sheetu nad profilem, kam se víc sekcí rozumně nevejde.
// ==========================================

export const SettingsModule: React.FC = () => {
  const navigate = useNavigate()
  const { profile, updateProfile, updateSecurity, resetProfile } = useProfileData()
  const smiAdmin = useHasPermission('admin.panel')
  const smiModerovat = useHasPermission('moderation.content')
  // Stejné oprávnění, jaké už uděluje prémiová kosmetika v obchodě —
  // vzhled aplikace je jen další kus kosmetiky, ne nová kategorie.
  const smiPremium = useHasPermission('cosmetics.premium')
  const themeId = useThemeStore((s) => s.themeId)
  const setThemeId = useThemeStore((s) => s.setThemeId)

  const [form, setForm] = useState({
    name: profile.name,
    email: profile.email,
    motto: profile.motto,
    bio: profile.bio,
  })
  const [toast, setToast] = useState<string | null>(null)
  const [biometrieProbiha, setBiometrieProbiha] = useState(false)

  // Když se profil změní jinde (obnova ze zálohy), formulář se srovná
  useEffect(() => {
    setForm({ name: profile.name, email: profile.email, motto: profile.motto, bio: profile.bio })
  }, [profile.name, profile.email, profile.motto, profile.bio])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }

  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      showToast('Jméno nemůže být prázdné')
      return
    }
    updateProfile({
      name: form.name.trim(),
      email: form.email.trim(),
      motto: form.motto.trim(),
      bio: form.bio.trim(),
    })
    showToast('Uloženo ✓')
  }

  const vybratRamecek = (id: string | null, vip: boolean, nazev: string) => {
    if (vip && !smiPremium) {
      showToast('Tenhle rámeček je jen pro VIP.')
      return
    }
    updateProfile({ frameId: id })
    showToast(id ? `Rámeček „${nazev}“ nastaven ✓` : 'Rámeček zrušen ✓')
  }

  const handleResetProfile = () => {
    if (window.confirm('Opravdu chceš smazat profil a vrátit ho do výchozího stavu? Úkoly, poznámky ani XP se nesmažou.')) {
      resetProfile()
      showToast('Profil byl vrácen do výchozího stavu')
    }
  }

  const vybratVzhled = (id: (typeof VSECHNY_VZHLEDY)[number]['id'], vip: boolean, nazev: string) => {
    if (vip && !smiPremium) {
      showToast('Tenhle vzhled je jen pro VIP.')
      return
    }
    setThemeId(id)
    showToast(`Vzhled „${nazev}“ nastaven ✓`)
  }

  return (
    <div className="settings-page">
      <div className="settings-top-bar">
        <button className="settings-back-btn" onClick={() => navigate('/profil')}>
          ← Zpět na profil
        </button>
        <h1 className="settings-title">Nastavení</h1>
      </div>

      {/* Osobní údaje */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon blue" aria-hidden="true">👤</span>
          <div>
            <h2 className="settings-card-title">Osobní údaje</h2>
            <p className="settings-card-sub">Jméno, e-mail a motto na profilu</p>
          </div>
        </div>

        <form className="settings-form" onSubmit={handleSavePersonal}>
          <label className="settings-field">
            <span>Jméno</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Tvoje jméno"
            />
          </label>

          <label className="settings-field">
            <span>E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="tvuj@email.cz"
              autoComplete="email"
            />
          </label>

          <label className="settings-field">
            <span>Motto</span>
            <input
              value={form.motto}
              onChange={(e) => setForm((f) => ({ ...f, motto: e.target.value }))}
              placeholder="Tvoje osobní motto"
            />
          </label>

          <label className="settings-field">
            <span>O mně</span>
            <textarea
              className="settings-textarea"
              value={form.bio}
              maxLength={300}
              rows={3}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Pár vět o sobě — zájmy, oblíbený předmět, cokoli chceš"
            />
          </label>

          <button type="submit" className="settings-save-btn">Uložit změny</button>
        </form>
      </section>

      {/* Zvuk.
          Přepínač zvuků Buddyho stával v Hubu ve spodní liště. Patří ale
          mezi ostatní nastavení, ne mezi tlačítka, kterými se aplikace
          ovládá — v liště jen zabíral místo. */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon blue" aria-hidden="true">🔊</span>
          <div>
            <h2 className="settings-card-title">Zvuk</h2>
            <p className="settings-card-sub">Jak se Buddy ozývá</p>
          </div>
        </div>

        {/* Zatím jen řádek s poznámkou, ne přepínač: přepínat by nebylo co
            a vypínač, který nic nedělá, je horší než žádný. */}
        <div className="settings-toggle-row settings-toggle-row--soon">
          <div className="settings-toggle-text">
            <span className="settings-toggle-title">
              Zvuky Buddyho
              <span className="settings-badge-soon">BRZY</span>
            </span>
            <span className="settings-toggle-sub">Ozvučení reakcí a odměn</span>
          </div>
        </div>
      </section>

      {/* Vzhled aplikace — 5 barevných palet, 3 volné a 2 pro VIP (viz
          core/theme/themes.ts). Karta jen vykresluje VSECHNY_VZHLEDY —
          přidat šestý vzhled znamená dopsat ho tam, ne sem. */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span
            className="settings-card-icon"
            style={{ background: 'linear-gradient(135deg, #a855f7, #f5c451)' }}
            aria-hidden="true"
          >
            🎨
          </span>
          <div>
            <h2 className="settings-card-title">Vzhled aplikace</h2>
            <p className="settings-card-sub">5 barevných vzhledů — 3 volně, 2 jen pro VIP</p>
          </div>
        </div>

        <div className="settings-theme-grid">
          {VSECHNY_VZHLEDY.map((tema) => {
            const zamceno = tema.vip && !smiPremium
            const aktivni = tema.id === themeId

            return (
              <button
                key={tema.id}
                className={`settings-theme-card ${aktivni ? 'is-aktivni' : ''} ${zamceno ? 'je-zamceno' : ''}`}
                onClick={() => vybratVzhled(tema.id, tema.vip, tema.nazev)}
              >
                <div
                  className="settings-theme-swatch"
                  style={{
                    background: `linear-gradient(135deg, ${tema.bgPanel}, ${tema.bgPanelRaised})`,
                    borderColor: tema.borderStrong,
                  }}
                >
                  <span className="settings-theme-dot" style={{ background: tema.accentCyan }} />
                  <span className="settings-theme-dot" style={{ background: tema.accentViolet }} />
                  <span className="settings-theme-dot" style={{ background: tema.accentMagenta }} />

                  {tema.vip && (
                    <span className="settings-theme-vip">{zamceno ? '🔒' : '👑'} VIP</span>
                  )}
                  {aktivni && <span className="settings-theme-check">✓</span>}
                </div>

                <span className="settings-theme-nazev">
                  {tema.ikona} {tema.nazev}
                </span>
                <span className="settings-theme-popis">{tema.popis}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Rámeček avataru — pevná paleta místo barvy podle id, viz
          social/avatarFrames.ts. Stejná mřížka jako Vzhled aplikace výš,
          jen náhled je kruh (jak rámeček doopravdy vypadá), ne obdélník. */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span
            className="settings-card-icon"
            style={{ background: 'linear-gradient(135deg, #7dd3fc, #fbbf24)' }}
            aria-hidden="true"
          >
            🖼️
          </span>
          <div>
            <h2 className="settings-card-title">Rámeček avataru</h2>
            <p className="settings-card-sub">Pevná barva prstenu místo té podle jména — 2 volně, 2 jen pro VIP</p>
          </div>
        </div>

        <div className="settings-theme-grid">
          <button
            className={`settings-theme-card ${profile.frameId === null ? 'is-aktivni' : ''}`}
            onClick={() => vybratRamecek(null, false, 'Výchozí')}
          >
            <div className="settings-ramecek-nahled" style={{ background: 'var(--bg-panel-raised)' }}>
              {profile.frameId === null && <span className="settings-theme-check">✓</span>}
            </div>
            <span className="settings-theme-nazev">Výchozí</span>
            <span className="settings-theme-popis">Barva prstenu podle jména</span>
          </button>

          {AVATAR_FRAMES.map((ramecek) => {
            const zamceno = ramecek.vip && !smiPremium
            const aktivni = ramecek.id === profile.frameId

            return (
              <button
                key={ramecek.id}
                className={`settings-theme-card ${aktivni ? 'is-aktivni' : ''} ${zamceno ? 'je-zamceno' : ''}`}
                onClick={() => vybratRamecek(ramecek.id, ramecek.vip, ramecek.nazev)}
              >
                <div
                  className="settings-ramecek-nahled"
                  style={{ background: `conic-gradient(from 0deg, ${ramecek.a}, ${ramecek.b}, ${ramecek.a})` }}
                >
                  {ramecek.vip && <span className="settings-theme-vip">{zamceno ? '🔒' : '👑'} VIP</span>}
                  {aktivni && <span className="settings-theme-check">✓</span>}
                </div>
                <span className="settings-theme-nazev">{ramecek.nazev}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Zabezpečení */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon purple" aria-hidden="true">🛡️</span>
          <div>
            <h2 className="settings-card-title">Zabezpečení</h2>
            <p className="settings-card-sub">Přihlášení a ochrana účtu</p>
          </div>
        </div>

        <div className="settings-toggle-row">
          <div className="settings-toggle-text">
            <span className="settings-toggle-title">Biometrické přihlášení</span>
            <span className="settings-toggle-sub">
              Otisk prstu nebo Face ID zamkne appku na tomhle zařízení
            </span>
          </div>
          <button
            className={`settings-switch ${profile.security.biometrics ? 'on' : ''}`}
            role="switch"
            aria-checked={profile.security.biometrics}
            aria-label="Biometrické přihlášení"
            disabled={biometrieProbiha}
            onClick={async () => {
              // Vypnutí nepotřebuje žádné ověření — appka WebAuthn credential
              // z JS smazat neumí (rozhraní to nenabízí), jen si přestane
              // pamatovat jeho id, takže se appka na něj přestane ptát.
              if (profile.security.biometrics) {
                updateSecurity({ biometrics: false, biometricCredentialId: undefined })
                showToast('Biometrie vypnuta')
                return
              }

              setBiometrieProbiha(true)
              const dostupna = await jeBiometrieDostupna()
              if (!dostupna) {
                setBiometrieProbiha(false)
                showToast('Tohle zařízení nebo prohlížeč biometrii nepodporuje.')
                return
              }

              const credentialId = await zaregistrujBiometrii(profile.name)
              setBiometrieProbiha(false)

              if (!credentialId) {
                showToast('Nepovedlo se to. Zkus to znovu.')
                return
              }

              updateSecurity({ biometrics: true, biometricCredentialId: credentialId })
              showToast('Biometrie zapnuta ✓')
            }}
          >
            <span className="settings-switch-knob" />
          </button>
        </div>

        <div className="settings-toggle-row">
          <div className="settings-toggle-text">
            <span className="settings-toggle-title">Upozornění na přihlášení</span>
            <span className="settings-toggle-sub">Dát vědět o novém přihlášení</span>
          </div>
          <button
            className={`settings-switch ${profile.security.loginAlerts ? 'on' : ''}`}
            role="switch"
            aria-checked={profile.security.loginAlerts}
            aria-label="Upozornění na přihlášení"
            onClick={() => {
              const zapnuto = !profile.security.loginAlerts
              updateSecurity({ loginAlerts: zapnuto })
              showToast(zapnuto ? 'Upozornění zapnuta' : 'Upozornění vypnuta')
            }}
          >
            <span className="settings-switch-knob" />
          </button>
        </div>

        <button className="settings-danger-btn" onClick={handleResetProfile}>
          🗑️ Vrátit profil do výchozího stavu
        </button>
      </section>

      {/* Podpora — vidí ji každý přihlášený, na rozdíl od Administrace
          níž bez žádné podmínky. Admin otevře stejnou obrazovku a uvidí
          v ní tikety od všech (RLS to rozhoduje, ne tenhle odkaz). */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon blue" aria-hidden="true">💬</span>
          <div>
            <h2 className="settings-card-title">Podpora</h2>
            <p className="settings-card-sub">Máš dotaz nebo problém? Napiš nám.</p>
          </div>
        </div>

        <button className="settings-save-btn" onClick={() => navigate('/podpora')}>
          Otevřít podporu
        </button>
      </section>

      {/* Administrace — vidí ji admin i moderátor, každý přes jiné
          oprávnění. Tlačítko samo nikoho nechrání (role v prohlížeči
          si jde přepsat), skutečná data za ním si přístup ověřují sama
          v databázi — viz komentář v pages/admin/AdminModule.tsx.
          AdminModule.tsx sám omezí, co moderátor uvnitř uvidí. */}
      {(smiAdmin || smiModerovat) && (
        <section className="settings-card">
          <div className="settings-card-head">
            <span className="settings-card-icon amber" aria-hidden="true">🛠️</span>
            <div>
              <h2 className="settings-card-title">{smiAdmin ? 'Administrace' : 'Moderace'}</h2>
              <p className="settings-card-sub">
                {smiAdmin ? 'Přehled, hlášení a konzole aplikace' : 'Hlášení od uživatelů'}
              </p>
            </div>
          </div>

          <button className="settings-save-btn" onClick={() => navigate('/admin')}>
            {smiAdmin ? 'Otevřít Admin panel' : 'Otevřít moderaci'}
          </button>
        </section>
      )}

      {toast && <div className="settings-toast">{toast}</div>}
    </div>
  )
}

export default SettingsModule
