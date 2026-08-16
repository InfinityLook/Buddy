import React from 'react'
import { AppIcon } from './AppIcon'

export interface AppItem {
  id: string
  title: string
  category: string
  icon: string
  color: 'purple' | 'cyan' | 'orange' | 'green' | 'pink'
  active: boolean
  favorite: boolean
}

interface AppCardProps {
  app?: AppItem
  isCreateCard?: boolean
  onToggleFavorite?: (id: string) => void
  onCreateNew?: () => void
}

export const AppCard: React.FC<AppCardProps> = ({
  app,
  isCreateCard,
  onToggleFavorite,
  onCreateNew,
}) => {
  if (isCreateCard || !app) {
    return (
      <div className="app-card app-card--create" onClick={onCreateNew}>
        <div className="app-create-plus-icon">
          <AppIcon name="plus" size={24} />
        </div>
        <span className="app-create-text">Vytvořit novou aplikaci</span>
      </div>
    )
  }

  return (
    <div className="app-card">
      <button className="app-card-options" aria-label="Možnosti">
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
          onClick={() => onToggleFavorite?.(app.id)}
          aria-label="Oblíbené"
        >
          <AppIcon name={app.favorite ? 'star-filled' : 'star'} size={16} />
        </button>
      </div>
    </div>
  )
}
