import React, { useRef } from 'react'
import { ProfilIcon } from './ProfilIcon'
import { ProfileData } from '../hooks/useProfileData'
import { fileToResizedDataUrl } from '../../../utils/image'

interface ProfilUserCardProps {
  profile: ProfileData
  onAvatarChange: (dataUrl: string) => void
  onToast: (message: string) => void
}

export const ProfilUserCard: React.FC<ProfilUserCardProps> = ({ profile, onAvatarChange, onToast }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const xpPercent = Math.min(100, Math.round((profile.xp / profile.xpToNext) * 100))

  const handlePickAvatar = () => fileInputRef.current?.click()

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      onAvatarChange(dataUrl)
      onToast('Fotka aktualizována ✓')
    } catch {
      onToast('Obrázek se nepodařilo načíst')
    }
  }

  return (
    <section className="profil-user-card">
      <div className="profil-user-main">
        <div className="profil-avatar-wrapper">
          <img src={profile.avatar} alt="Avatar" className="profil-avatar-img" />
          <button className="profil-avatar-edit" aria-label="Upravit fotku" onClick={handlePickAvatar}>
            <ProfilIcon name="pencil" size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="profil-hidden-input"
            onChange={handleFileSelected}
          />
        </div>

        <div className="profil-user-info">
          <span className="profil-badge">✦ AI STUDENT</span>
          <h2>{profile.name}</h2>
          <p className="profil-motto">{profile.motto}</p>
          <div className="profil-email">
            <ProfilIcon name="mail" size={14} />
            <span>{profile.email}</span>
          </div>
        </div>
      </div>

      <div className="profil-user-stats">
        <div className="profil-level-box">
          <div className="profil-level-header">
            <span className="profil-level-text">ÚROVEŇ {profile.level}</span>
            <ProfilIcon name="crown" size={16} className="profil-crown-icon" />
          </div>
          <div className="profil-xp-text">
            {profile.xp.toLocaleString('cs-CZ')} / {profile.xpToNext.toLocaleString('cs-CZ')} XP
          </div>
          <div className="profil-progress-bg">
            <div className="profil-progress-fill" style={{ width: `${xpPercent}%` }}></div>
          </div>
        </div>

        <div className="profil-streak-box">
          <ProfilIcon name="flame" size={24} className="profil-streak-fire" />
          <div className="profil-streak-info">
            <span className="profil-streak-num">{profile.streak}</span>
            <span className="profil-streak-label">denní série</span>
          </div>
        </div>
      </div>
    </section>
  )
}
