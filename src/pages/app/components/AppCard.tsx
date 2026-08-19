import React, { useEffect, useRef } from 'react'
import { AppIcon } from './AppIcon'
// Tvar dlaždice má jediné místo — store. Vlastní kopie tohohle rozhraní
// se s ním rozešla v typu 'color' a rozdíl odhalil až typecheck.
import type { AppItem } from '@/core/store/useAppStore'

export type { AppItem }

interface AppCardProps {
  app: AppItem
  // Otevřená nabídka se drží v AppModule, aby jich nešlo rozbalit víc naráz
  menuOpen: boolean
  onMenuToggle: (id: string | null) => void
  onClick?: (app: AppItem) => void
  onToggleFavorite?: (id: string) => void
  onToggleVisible?: (id: string) => void
}

export const AppCard: React.FC<AppCardProps> = ({
  app,
  menuOpen,
  onMenuToggle,
  onClick,
  onToggleFavorite,
  onToggleVisible,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuToggle(null)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [menuOpen, onMenuToggle])

  return (
    <div
      className={`app-card ${app.active ? '' : 'is-hidden'} ${menuOpen ? 'has-menu-open' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(app)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(app)
        }
      }}
    >
      <div className="app-card-menu-wrap" ref={menuRef}>
        <button
          className="app-card-options"
          aria-label={`Možnosti — ${app.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation()
            onMenuToggle(menuOpen ? null : app.id)
          }}
        >
          <AppIcon name="dots" size={18} />
        </button>

        {menuOpen && (
          <div className="app-card-menu" role="menu" onClick={(e) => e.stopPropagation()}>
            <button
              className="app-card-menu-item"
              onClick={() => {
                onMenuToggle(null)
                onClick?.(app)
              }}
            >
              <AppIcon name="arrow-right" size={15} />
              Otevřít
            </button>

            <button
              className="app-card-menu-item"
              onClick={() => {
                onToggleFavorite?.(app.id)
                onMenuToggle(null)
              }}
            >
              <AppIcon name={app.favorite ? 'star' : 'star-filled'} size={15} />
              {app.favorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
            </button>

            <div className="app-card-menu-divider" />

            <button
              className="app-card-menu-item"
              onClick={() => {
                onToggleVisible?.(app.id)
                onMenuToggle(null)
              }}
            >
              <AppIcon name={app.active ? 'eye-off' : 'eye'} size={15} />
              {app.active ? 'Skrýt z přehledu' : 'Vrátit do přehledu'}
            </button>
          </div>
        )}
      </div>

      <div className={`app-card-icon-wrap ${app.color}`}>
        <AppIcon name={app.icon} size={28} />
      </div>

      <div className="app-card-text">
        <h3 className="app-card-title">{app.title}</h3>
        <span className="app-card-category">{app.category}</span>
      </div>

      <div className="app-card-footer">
        <div className="app-card-status">
          <span className={`app-status-dot ${app.active ? '' : 'is-off'}`}></span>
          <span>{app.active ? 'Aktivní' : 'Skrytá'}</span>
        </div>

        <button
          className={`app-favorite-btn ${app.favorite ? 'is-favorite' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite?.(app.id)
          }}
          aria-label={app.favorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
          aria-pressed={app.favorite}
        >
          <AppIcon name={app.favorite ? 'star-filled' : 'star'} size={16} />
        </button>
      </div>
    </div>
  )
}
