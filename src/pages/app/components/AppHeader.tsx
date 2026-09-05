import React from 'react'
import { AppIcon } from './AppIcon'

interface AppHeaderProps {
  onBack?: () => void
  onOpenNotifications: () => void
  onOpenProfile: () => void
  // Počet nepřečtených upozornění — 0 znamená, že se puntík nekreslí
  unreadCount: number
  // Data URI z useProfileData — appka ho má vždy (DEFAULT_AVATAR jako
  // výchozí), viz core komentář v AppModule.tsx.
  avatarSrc: string
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onBack,
  onOpenNotifications,
  onOpenProfile,
  unreadCount,
  avatarSrc,
}) => (
  <header className="app-header">
    <button className="app-back-btn" aria-label="Zpět" onClick={onBack}>
      <AppIcon name="arrow-left" size={18} />
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

      {/* Nahrazuje dřívější tlačítko Nastavení natvrdo v hlavičce —
          Nastavení je teď vždycky na dosah v AppBottomNav, takže tenhle
          slot může místo ikony ozubeného kola nést skutečnou avatarovou
          zkratku na vlastní profil, stejně jako referenční vzhled. */}
      <button className="app-avatar-btn" aria-label="Otevřít profil" onClick={onOpenProfile}>
        <img className="app-avatar-img" src={avatarSrc} alt="" aria-hidden="true" />
        <span className="app-avatar-dot" aria-hidden="true" />
      </button>
    </div>
  </header>
)
