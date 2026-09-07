import React, { useEffect, useState } from 'react'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'

interface Props {
  onToast: (zprava: string) => void
}

// ==========================================
// Nastavení — Osobní údaje. Beze změny logiky, jen přesunuté z bývalé
// první karty přímo na hlavní stránce Nastavení do vlastního modulu
// (viz SettingsModule.tsx's nový menu vzor).
// ==========================================

export const OsobniUdajeSekce: React.FC<Props> = ({ onToast }) => {
  const { profile, updateProfile } = useProfileData()
  const [form, setForm] = useState({
    name: profile.name,
    email: profile.email,
    motto: profile.motto,
    bio: profile.bio,
  })

  // Když se profil změní jinde (obnova ze zálohy), formulář se srovná.
  useEffect(() => {
    setForm({ name: profile.name, email: profile.email, motto: profile.motto, bio: profile.bio })
  }, [profile.name, profile.email, profile.motto, profile.bio])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      onToast('Jméno nemůže být prázdné')
      return
    }
    updateProfile({
      name: form.name.trim(),
      email: form.email.trim(),
      motto: form.motto.trim(),
      bio: form.bio.trim(),
    })
    onToast('Uloženo ✓')
  }

  return (
    <section className="settings-card">
      <form className="settings-form" onSubmit={handleSave}>
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
  )
}

export default OsobniUdajeSekce
