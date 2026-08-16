import React from 'react'
import './ProfilModule.css'

export const ProfilModule: React.FC = () => {
  return (
    <div className="profil-page">
      {/* Top Bar */}
      <div className="profil-top-bar">
        <div>
          <h1 className="profil-title">Profil</h1>
          <p className="profil-subtitle">Spravuj svůj účet, sleduj svůj pokrok a nastav si aplikaci podle sebe.</p>
        </div>
        <div className="profil-top-actions">
          <button className="profil-icon-btn" aria-label="Upozornění">🔔</button>
          <button className="profil-icon-btn" aria-label="Nastavení">⚙️</button>
        </div>
      </div>

      {/* Main User Card */}
      <div className="profil-user-card">
        <div className="profil-user-main">
          <div className="profil-avatar-wrapper">
            <img 
              src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300" 
              alt="Kairo" 
              className="profil-avatar-img"
            />
            <button className="profil-avatar-edit">✏️</button>
          </div>
          <div className="profil-user-info">
            <span className="profil-badge">✦ AI Student</span>
            <h2 className="profil-user-name">Kairo</h2>
            <p className="profil-user-bio">Každý den je nová šance stát se lepší verzí sebe.</p>
            <span className="profil-user-email">✉ kairo.student@email.com</span>
          </div>
        </div>

        {/* Level & Streak */}
        <div className="profil-progress-grid">
          <div className="profil-level-box">
            <div className="profil-box-head">
              <span>ÚROVEŇ 24 👑</span>
            </div>
            <div className="profil-xp-bar-bg">
              <div className="profil-xp-bar-fill" style={{ width: '85%' }}></div>
            </div>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>4 250 / 5 000 XP</span>
          </div>

          <div className="profil-streak-box">
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>DENNÍ SÉRIE</span>
            <div className="profil-streak-val">
              🔥 12
            </div>
            <span style={{ fontSize: '0.6rem', color: '#64748b' }}>dní v řadě</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="profil-quick-stats">
        <div className="profil-stat-card">
          <span className="profil-stat-val" style={{ color: '#818cf8' }}>📖 128</span>
          <span className="profil-stat-lbl">Dokončené lekce</span>
        </div>
        <div className="profil-stat-card">
          <span className="profil-stat-val" style={{ color: '#34d399' }}>📋 32</span>
          <span className="profil-stat-lbl">Úkoly hotovo</span>
        </div>
        <div className="profil-stat-card">
          <span className="profil-stat-val" style={{ color: '#fbbf24' }}>⏰ 48h</span>
          <span className="profil-stat-lbl">Čas studia</span>
        </div>
        <div className="profil-stat-card">
          <span className="profil-stat-val" style={{ color: '#38bdf8' }}>⭐ 4.8</span>
          <span className="profil-stat-lbl">Průměrné hodnocení</span>
        </div>
      </div>

      {/* Two Column Section: Achievements & Goals */}
      <div className="profil-two-col">
        {/* Achievements */}
        <div className="profil-col-card">
          <div className="profil-col-head">
            <span>Moje úspěchy</span>
            <span className="profil-link">Zobrazit vše</span>
          </div>
          <div className="profil-list-item">
            <span className="profil-item-icon">🏆</span>
            <div className="profil-item-details">
              <span className="profil-item-title">První krok</span>
              <span className="profil-item-sub">12. 5. 2024</span>
            </div>
            <span>✅</span>
          </div>
          <div className="profil-list-item">
            <span className="profil-item-icon">🔥</span>
            <div className="profil-item-details">
              <span className="profil-item-title">Týdenní bojovník</span>
              <span className="profil-item-sub">28. 5. 2024</span>
            </div>
            <span>✅</span>
          </div>
        </div>

        {/* Goals */}
        <div className="profil-col-card">
          <div className="profil-col-head">
            <span>Moje cíle</span>
            <span className="profil-link">Zobrazit vše</span>
          </div>
          <div className="profil-list-item">
            <span className="profil-item-icon">🎯</span>
            <div className="profil-item-details">
              <span className="profil-item-title">Denní cíl</span>
              <span className="profil-item-sub">45 / 60 min</span>
            </div>
          </div>
          <div className="profil-list-item">
            <span className="profil-item-icon">📚</span>
            <div className="profil-item-details">
              <span className="profil-item-title">Týdenní cíl</span>
              <span className="profil-item-sub">7 / 10 lekcí</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Menu */}
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
            <div className="profil-menu-icon">🔔</div>
            <div className="profil-menu-text">
              <span className="profil-menu-title">Upozornění</span>
              <span className="profil-menu-sub">Spravuj notifikace a připomínky</span>
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

        <div className="profil-menu-row">
          <div className="profil-menu-left">
            <div className="profil-menu-icon">❓</div>
            <div className="profil-menu-text">
              <span className="profil-menu-title">Nápověda a podpora</span>
              <span className="profil-menu-sub">Často kladené otázky a kontakt</span>
            </div>
          </div>
          <span className="profil-arrow">❯</span>
        </div>
      </div>
    </div>
  )
}

export default ProfilModule
