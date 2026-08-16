import React from 'react'
import { useNavigate } from 'react-router-dom'
import './HubModule.css'

interface HubModuleProps {
  onLogout?: () => void
  onOpenApps?: () => void
  onOpenProfile?: () => void
  onOpenSettings?: () => void
  onTalk?: () => void
}

export const HubModule: React.FC<HubModuleProps> = ({
  onLogout,
  onOpenApps,
  onOpenProfile,
  onOpenSettings,
  onTalk,
}) => {
  const navigate = useNavigate()

  const handleAppsClick = () => {
    if (onOpenApps) {
      onOpenApps()
    } else {
      navigate('/apps')
    }
  }

  return (
    <div className="hub-container">
      {/* Header */}
      <div className="hub-header">
        <div className="hub-logo">
          ✦ SchoolBuddy
        </div>
        <div className="hub-level-badge">
          ⭐ ÚROVEŇ 1
        </div>
        <button 
          className="hub-logout-btn" 
          aria-label="Odhlásit se"
          onClick={onLogout}
        >
          ➔
        </button>
      </div>

      {/* Daily Challenge Banner */}
      <div className="hub-banner">
        <span className="hub-banner-tag">DENNÍ VÝZVA</span>
        <span>Dnes tě čekají 3 úkoly z matematiky</span>
      </div>

      {/* Top Grid (Profil, Shop, Rewards, Cloud) */}
      <div className="hub-grid-top">
        <button className="hub-btn-card" onClick={onOpenProfile}>
          <span className="hub-card-icon" style={{ color: '#38bdf8' }}>👤</span>
          <span>Profil</span>
        </button>

        <button className="hub-btn-card" onClick={() => alert('Shop bude brzy dostupný!')}>
          <span className="hub-card-icon" style={{ color: '#fbbf24' }}>🛍️</span>
          <span>Shop</span>
        </button>

        <button className="hub-btn-card" onClick={() => alert('Rewards budou brzy dostupné!')}>
          <span className="hub-card-icon" style={{ color: '#34d399' }}>🎁</span>
          <span>Rewards</span>
          <span className="hub-badge-new">NEW</span>
        </button>

        <button className="hub-btn-card" onClick={() => alert('Cloud zálohování vyžaduje nastavení Supabase.')}>
          <span className="hub-card-icon" style={{ color: '#818cf8' }}>☁️</span>
          <span>Cloud</span>
        </button>
      </div>

      {/* Companion Section */}
      <div className="hub-pet-section">
        <div className="hub-speech-bubble">
          Ahoj! 👋 Jsem Buddy, tvůj studijní parťák. Společně to zvládneme! 💙
        </div>
        <img 
          src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=250" 
          alt="Buddy" 
          className="hub-pet-img"
        />
      </div>

      {/* Middle Square Buttons (Apps, Play, Library) */}
      <div className="hub-grid-squares">
        <button className="hub-btn-card hub-btn-square" onClick={handleAppsClick}>
          <span className="hub-card-icon" style={{ color: '#a855f7' }}>🎛️</span>
          <span>Apps</span>
        </button>

        <button className="hub-btn-card hub-btn-square" onClick={() => alert('Sekce Play se připravuje!')}>
          <span className="hub-card-icon" style={{ color: '#f43f5e' }}>🎮</span>
          <span>Play</span>
        </button>

        <button className="hub-btn-card hub-btn-square" onClick={() => alert('Knihovna bude brzy k dispozici!')}>
          <span className="hub-card-icon" style={{ color: '#22c55e' }}>📚</span>
          <span>Library</span>
        </button>
      </div>

      {/* Bottom Bar */}
      <div className="hub-bottom-bar">
        <button className="hub-action-btn-icon" aria-label="Zvuk" onClick={() => alert('Zvuk zapnut/vypnut')}>
          🔊
        </button>
        
        <button className="hub-talk-btn" onClick={onTalk || (() => alert('Buddy poslouchá...'))}>
          🎙️ PROMLUV SI SE MNOU
        </button>

        <button className="hub-action-btn-icon" onClick={onOpenSettings} aria-label="Settings">
          ⚙️
        </button>
      </div>
    </div>
  )
}

export default HubModule
        
