import React, { useEffect, useState } from 'react'
import { ProfilIcon } from './ProfilIcon'
import { ProfileData, ProfileSecurity } from '../hooks/useProfileData'

type SheetView = 'menu' | 'personal' | 'security'

interface ProfilSettingsSheetProps {
  open: boolean
  profile: ProfileData
  onClose: () => void
  onSaveProfile: (patch: Partial<ProfileData>) => void
  onUpdateSecurity: (patch: Partial<ProfileSecurity>) => void
  onResetData: () => void
  onToast: (message: string) => void
}

export const ProfilSettingsSheet: React.FC<ProfilSettingsSheetProps> = ({
  open,
  profile,
  onClose,
  onSaveProfile,
  onUpdateSecurity,
  onResetData,
  onToast
}) => {
  const [view, setView] = useState<SheetView>('menu')
  const [form, setForm] = useState({ name: profile.name, email: profile.email, motto: profile.motto })

  // Při otevření sheetu vždy začínáme na hlavní nabídce a s čerstvými daty ve formuláři.
  useEffect(() => {
    if (open) {
      setView('menu')
      setForm({ name: profile.name, email: profile.email, motto: profile.motto })
    }
  }, [open, profile.name, profile.email, profile.motto])

  const title =
    view === 'menu' ? 'Nastavení' : view === 'personal' ? 'Osobní informace' : 'Zabezpečení'

  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      onToast('Jméno nemůže být prázdné')
      return
    }
    onSaveProfile({ name: form.name.trim(), email: form.email.trim(), motto: form.motto.trim() })
    onToast('Uloženo ✓')
    setView('menu')
  }

  const handleResetData = () => {
    if (window.confirm('Opravdu chceš smazat všechna lokálně uložená data profilu?')) {
      onResetData()
      onToast('Data byla smazána')
      setView('menu')
    }
  }

  return (
    <>
      <div className={`profil-sheet-overlay ${open ? 'open' : ''}`} onClick={onClose} />

      <div className={`profil-sheet ${open ? 'open' : ''}`} role="dialog" aria-modal="true">
        <div className="profil-sheet-handle" />

        <div className="profil-sheet-header">
          {view !== 'menu' ? (
            <button className="profil-icon-btn small" onClick={() => setView('menu')} aria-label="Zpět">
              <ProfilIcon name="chevron-left" size={16} />
            </button>
          ) : (
            <span className="profil-sheet-header-spacer" />
          )}
          <span className="profil-sheet-title">{title}</span>
          <button className="profil-icon-btn small" onClick={onClose} aria-label="Zavřít">
            <ProfilIcon name="x" size={16} />
          </button>
        </div>

        <div className="profil-sheet-body">
          {view === 'menu' && (
            <div className="profil-sheet-menu" key="menu">
              <button className="profil-sheet-item" onClick={() => setView('personal')}>
                <span className="profil-sheet-item-icon blue">
                  <ProfilIcon name="user" size={18} />
                </span>
                <span className="profil-sheet-item-text">
                  <span className="profil-sheet-item-title">Osobní informace</span>
                  <span className="profil-sheet-item-sub">Uprav jméno, e-mail a další údaje</span>
                </span>
                <ProfilIcon name="chevron-right" size={16} className="profil-sheet-item-chevron" />
              </button>

              <button className="profil-sheet-item" onClick={() => setView('security')}>
                <span className="profil-sheet-item-icon purple">
                  <ProfilIcon name="shield" size={18} />
                </span>
                <span className="profil-sheet-item-text">
                  <span className="profil-sheet-item-title">Zabezpečení</span>
                  <span className="profil-sheet-item-sub">Přihlášení a ochrana účtu</span>
                </span>
                <ProfilIcon name="chevron-right" size={16} className="profil-sheet-item-chevron" />
              </button>
            </div>
          )}

          {view === 'personal' && (
            <form className="profil-sheet-form" key="personal" onSubmit={handleSavePersonal}>
              <label className="profil-field">
                <span>Jméno</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Tvoje jméno"
                />
              </label>
              <label className="profil-field">
                <span>E-mail</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="tvuj@email.com"
                />
              </label>
              <label className="profil-field">
                <span>Motto</span>
                <input
                  value={form.motto}
                  onChange={(e) => setForm((f) => ({ ...f, motto: e.target.value }))}
                  placeholder="Tvoje osobní motto"
                />
              </label>
              <button type="submit" className="profil-sheet-save-btn">
                Uložit změny
              </button>
            </form>
          )}

          {view === 'security' && (
            <div className="profil-sheet-form" key="security">
              <div className="profil-toggle-row">
                <span className="profil-sheet-item-icon cyan">
                  <ProfilIcon name="fingerprint" size={18} />
                </span>
                <span className="profil-sheet-item-text">
                  <span className="profil-sheet-item-title">Biometrické přihlášení</span>
                  <span className="profil-sheet-item-sub">Otisk prstu / Face ID</span>
                </span>
                <button
                  className={`profil-switch ${profile.security.biometrics ? 'on' : ''}`}
                  role="switch"
                  aria-checked={profile.security.biometrics}
                  onClick={() => {
                    onUpdateSecurity({ biometrics: !profile.security.biometrics })
                    onToast(!profile.security.biometrics ? 'Biometrie zapnuta' : 'Biometrie vypnuta')
                  }}
                >
                  <span className="profil-switch-knob" />
                </button>
              </div>

              <div className="profil-toggle-row">
                <span className="profil-sheet-item-icon amber">
                  <ProfilIcon name="bell-ring" size={18} />
                </span>
                <span className="profil-sheet-item-text">
                  <span className="profil-sheet-item-title">Upozornění na přihlášení</span>
                  <span className="profil-sheet-item-sub">Oznámit nové přihlášení e-mailem</span>
                </span>
                <button
                  className={`profil-switch ${profile.security.loginAlerts ? 'on' : ''}`}
                  role="switch"
                  aria-checked={profile.security.loginAlerts}
                  onClick={() => {
                    onUpdateSecurity({ loginAlerts: !profile.security.loginAlerts })
                    onToast(!profile.security.loginAlerts ? 'Upozornění zapnuta' : 'Upozornění vypnuta')
                  }}
                >
                  <span className="profil-switch-knob" />
                </button>
              </div>

              <button className="profil-sheet-danger-btn" onClick={handleResetData}>
                <ProfilIcon name="trash" size={16} />
                Smazat lokální data profilu
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
              }
