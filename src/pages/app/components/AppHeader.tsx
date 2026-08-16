import React from 'react'
import { AppIcon } from './AppIcon'

interface AppHeaderProps {
  onBack?: () => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onBack }) => (
  <header className="app-header">
    <button className="app-back-btn" onClick={onBack}>
      <AppIcon name="arrow-left" size={18} />
      <span>Zpět</span>
    </button>

    <div className="app-header-center">
      <div className="app-header-title-wrap">
        <AppIcon name="grid" size={22} className="app-header-icon" />
        <h1>App</h1>
      </div>
      <p>Tvoje aplikace na jednom místě</p>
    </div>

    <div className="app-header-actions">
      <button className="app-icon-btn" aria-label="Notifikace">
        <AppIcon name="bell" size={20} />
      </button>
      <button className="app-icon-btn" aria-label="Nastavení">
        <AppIcon name="settings" size={20} />
      </button>
    </div>
  </header>
)
