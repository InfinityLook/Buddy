import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import './SettingsModule.css'

// ==========================================
// Nastavení aplikace. Zatím obsahuje osobní údaje a zabezpečení, ale je
// to místo, kam patří všechno další nastavení — dřív bylo schované
// v bottom sheetu nad profilem, kam se víc sekcí rozumně nevejde.
// ==========================================

export const SettingsModule: React.FC = () => {
  const navigate = useNavigate()
  const { profile, updateProfile, updateSecurity, resetProfile } = useProfileData()

  const [form, setForm] = useState({ name: profile.name, email: profile.email, motto: profile.motto })
  const [toast, setToast] = useState<string | null>(null)

  // Když se profil změní jinde (obnova ze zálohy), formulář se srovná
  useEffect(() => {
    setForm({ name: profile.name, email: profile.email, motto: profile.motto })
  }, [profile.name, profile.email, profile.motto])

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
    updateProfile({ name: form.name.trim(), email: form.email.trim(), motto: form.motto.trim() })
    showToast('Uloženo ✓')
  }

  const handleResetProfile = () => {
    if (window.confirm('Opravdu chceš smazat profil a vrátit ho do výchozího stavu? Úkoly, poznámky ani XP se nesmažou.')) {
      resetProfile()
      showToast('Profil byl vrácen do výchozího stavu')
    }
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
            <span className="settings-toggle-sub">Otisk prstu nebo Face ID</span>
          </div>
          <button
            className={`settings-switch ${profile.security.biometrics ? 'on' : ''}`}
            role="switch"
            aria-checked={profile.security.biometrics}
            aria-label="Biometrické přihlášení"
            onClick={() => {
              const zapnuto = !profile.security.biometrics
              updateSecurity({ biometrics: zapnuto })
              showToast(zapnuto ? 'Biometrie zapnuta' : 'Biometrie vypnuta')
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

      {toast && <div className="settings-toast">{toast}</div>}
    </div>
  )
}

export default SettingsModule
