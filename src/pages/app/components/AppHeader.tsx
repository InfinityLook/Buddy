import React from 'react'
import { AppIcon } from './AppIcon'

interface AppHeaderProps {
  onBack?: () => void
  onOpenNotifications: () => void
  onOpenSettings: () => void
  // Počet nepřečtených upozornění — 0 znamená, že se puntík nekreslí
  unreadCount: number
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onBack,
  onOpenNotifications,
  onOpenSettings,
  unreadCount,
}) => (
  <header className="app-header">
    <button className="app-back-btn" onClick={onBack}>
      <AppIcon name="arrow-left" size={18} />
      <span>Zpět</span>
    </button>

    <div className="app-header-center">
      <div className="app-header-title-wrap">
        <AppIcon name="grid" size={22} className="app-header-icon" />
        <h1>Aplikace</h1>
      </div>
      <p>Tvoje aplikace na jednom místě</p>
    </div>

    <div className="app-header-actions">
      <button
        className="app-icon-btn"
        aria-label={
          unreadCount > 0 ? `Upozornění (${unreadCount} nepřečtených)` : 'Upozornění'
        }
        onClick={onOpenNotifications}
      >
        <AppIcon name="bell" size={20} />
        {unreadCount > 0 && <span className="app-icon-badge">{unreadCount}</span>}
      </button>

      <button className="app-icon-btn" aria-label="Nastavení" onClick={onOpenSettings}>
        <AppIcon name="settings" size={20} />
      </button>
    </div>
  </header>
)
