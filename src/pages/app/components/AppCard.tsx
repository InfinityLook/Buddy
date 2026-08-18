import React from 'react'
import { AppIcon } from './AppIcon'
// Tvar dlaždice má jediné místo — store. Vlastní kopie tohohle rozhraní
// se s ním rozešla v typu 'color' a rozdíl odhalil až typecheck.
import type { AppItem } from '@/core/store/useAppStore'

export type { AppItem }

interface AppCardProps {
  app: AppItem
  onClick?: (app: AppItem) => void
  onToggleFavorite?: (id: string) => void
}

export const AppCard: React.FC<AppCardProps> = ({
  app,
  onClick,
  onToggleFavorite,
}) => {
  return (
    <div className="app-card" onClick={() => onClick?.(app)} style={{ cursor: 'pointer' }}>
      <button 
        className="app-card-options" 
        aria-label="Možnosti"
        onClick={(e) => e.stopPropagation()}
      >
        <AppIcon name="dots" size={18} />
      </button>

      <div className={`app-card-icon-wrap ${app.color}`}>
        <AppIcon name={app.icon} size={28} />
      </div>

      <h3 className="app-card-title">{app.title}</h3>
      <span className="app-card-category">{app.category}</span>

      <div className="app-card-footer">
        <div className="app-card-status">
          <span className="app-status-dot"></span>
          <span>Aktivní</span>
        </div>

        <button
          className={`app-favorite-btn ${app.favorite ? 'is-favorite' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite?.(app.id)
          }}
          aria-label="Oblíbené"
        >
          <AppIcon name={app.favorite ? 'star-filled' : 'star'} size={16} />
        </button>
      </div>
    </div>
  )
}
