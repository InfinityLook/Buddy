import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { getXpForNextLevel, getLevelProgress } from '@/core/utils/gamificationUtils'
import './ProfilModule.css'

export const ProfilModule: React.FC = () => {
  const navigate = useNavigate()
  const { level, xp, streakDays, badges } = useGamificationStore()

  const xpToNext = getXpForNextLevel(level)
  const progressPercent = getLevelProgress(xp)
  const unlockedBadges = badges.filter((b) => b.unlockedAt !== null)

  return (
    <div className="profil-page">
      {/* Top Bar */}
      <div className="profil-top-bar">
        <div>
          <button
            onClick={() => navigate('/hub')}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.85rem',
              cursor: 'pointer',
              padding: 0,
              marginBottom: '0.5rem',
            }}
          >
            ← Zpět do Hubu
          </button>
          <h1 className="profil-title">Profil</h1>
          <p className="profil-subtitle">Spravuj svůj účet, sleduj svůj pokrok a nastav si aplikaci podle sebe.</p>
        </div>
        <div className="profil-top-actions">
          <button className="profil-icon-btn" aria-label="Upozornění" onClick={() => alert('Notifikace budou brzy dostupné!')}>🔔</button>
          <button className="profil-icon-btn" aria-label="Nastavení" onClick={() => alert('Nastavení budou brzy dostupná!')}>⚙️</button>
        </div>
      </div>

      {/* Main User Card */}
      <div className="profil-user-card">
        <div className="profil-user-main">
          <div className="profil-avatar-wrapper">
            <img 
              src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300" 
              alt="Uživatelský avatar" 
              className="profil-avatar-img"
            />
            <button className="profil-avatar-edit" onClick={() => alert('Nahrávání avataru bude brzy dostupné!')}>✏️</button>
          </div>
          <div className="profil-user-info">
            <span className="profil-badge">✦ AI Student</span>
            <h2 className="profil-user-name">Studující</h2>
            <p className="profil-user-bio">Každý den je nová šance stát se lepší verzí sebe.</p>
          </div>
        </div>

        {/* Level & Streak — reálná data z gamifikačního storu */}
        <div className="profil-progress-grid">
          <div className="profil-level-box">
            <div className="profil-box-head">
              <span>ÚROVEŇ {level} 👑</span>
            </div>
            <div className="profil-xp-bar-bg">
              <div className="profil-xp-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{xp} / {xpToNext} XP</span>
          </div>

          <div className="profil-streak-box">
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>DENNÍ SÉRIE</span>
            <div className="profil-streak-val">
              🔥 {streakDays}
            </div>
            <span style={{ fontSize: '0.6rem', color: '#64748b' }}>dní v řadě</span>
          </div>
        </div>
      </div>

      {/* Achievements — reálné odznaky ze storu */}
      <div className="profil-two-col">
        <div className="profil-col-card">
          <div className="profil-col-head">
            <span>Moje úspěchy</span>
          </div>
          {unlockedBadges.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Zatím žádné odemčené odznaky. Začni studovat! 💪</p>
          ) : (
            unlockedBadges.map((badge) => (
              <div className="profil-list-item" key={badge.id}>
                <span className="profil-item-icon">{badge.icon}</span>
                <div className="profil-item-details">
                  <span className="profil-item-title">{badge.title}</span>
                  <span className="profil-item-sub">
                    {badge.unlockedAt ? new Date(badge.unlockedAt).toLocaleDateString('cs-CZ') : ''}
                  </span>
                </div>
                <span>✅</span>
              </div>
            ))
          )}
        </div>

        <div className="profil-col-card">
          <div className="profil-col-head">
            <span>Moje cíle</span>
            <span className="profil-link">Zobrazit vše</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Sekce cílů se propojí s Goal Trackerem v jednom z dalších kroků.
          </p>
        </div>
      </div>

      {/* Settings Menu — zatím jen vizuální, funkčnost přidáme v kroku 5 */}
      <div className="profil-settings-list">
        <div className="profil-menu-row">
          <div className="profil-menu-left">
            <div className="profil-menu-icon">👤</div>
            <div className="profil-menu-text">
              <span className="profil-menu-title">Osobní informace</span>
              <span className="profil-menu-sub">Upravit jméno, e-mail a další údaje</span>
            </div>
          </div>
          <span className="profil-arrow">❯</span>
        </div>

        <div className="profil-menu-row">
          <div className="profil-menu-left">
            <div className="profil-menu-icon">🛡️</div>
            <div className="profil-menu-text">
              <span className="profil-menu-title">Zabezpečení</span>
              <span className="profil-menu-sub">Heslo, přihlášení a ochrana účtu</span>
            </div>
          </div>
          <span className="profil-arrow">❯</span>
        </div>

        <div className="profil-menu-row">
          <div className="profil-menu-left">
            <div className="profil-menu-icon">🎨</div>
            <div className="profil-menu-text">
              <span className="profil-menu-title">Vzhled aplikace</span>
              <span className="profil-menu-sub">Motiv, jazyk a další nastavení</span>
            </div>
          </div>
          <span className="profil-arrow">❯</span>
        </div>
      </div>
    </div>
  )
}

export default ProfilModule
