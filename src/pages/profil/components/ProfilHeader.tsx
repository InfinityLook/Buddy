import React from 'react'
import { ProfilIcon } from './ProfilIcon'

interface ProfilHeaderProps {
  onBack?: () => void
  onToggleNotifications: () => void
  onToggleSettings: () => void
  notificationsOpen: boolean
  settingsOpen: boolean
  hasUnread: boolean
}

export const ProfilHeader: React.FC<ProfilHeaderProps> = ({
  onBack,
  onToggleNotifications,
  onToggleSettings,
  notificationsOpen,
  settingsOpen,
  hasUnread
}) => (
  <>
    <header className="profil-header">
      <button className="profil-back-btn" onClick={onBack}>
        <ProfilIcon name="arrow-left" size={18} />
        <span>Zpět</span>
      </button>
      <div className="profil-header-actions">
        <button
          className={`profil-icon-btn ${notificationsOpen ? 'active' : ''}`}
          aria-label="Notifikace"
          onClick={onToggleNotifications}
        >
          <ProfilIcon name="bell" size={20} />
          {hasUnread && <span className="profil-notif-badge" />}
        </button>
        <button
          className={`profil-icon-btn ${settingsOpen ? 'active' : ''}`}
          aria-label="Nastavení"
          onClick={onToggleSettings}
        >
          <ProfilIcon name="settings" size={20} />
        </button>
      </div>
    </header>

    <div className="profil-title-section">
      <h1>Profil</h1>
      <p>Spravuj svůj účet a sleduj svůj pokrok.</p>
    </div>
  </>
)
