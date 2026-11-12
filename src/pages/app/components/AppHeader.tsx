import type { ReactNode } from 'react'
import { BuddyHeader } from '@/components/buddy-ui/BuddyHeader'
import { AppIcon } from './AppIcon'

interface AppHeaderProps {
  onBack?: () => void
  onOpenNotifications: () => void
  unreadCount: number
  title?: string
  subtitle?: string
  icon?: string
  extraActions?: ReactNode
}

export function AppHeader({
  onBack,
  onOpenNotifications,
  unreadCount,
  title = 'Aplikace',
  subtitle = 'Tvoje aplikace na jednom místě',
  icon = 'grid',
  extraActions,
}: AppHeaderProps) {
  return (
    <BuddyHeader
      title={title}
      subtitle={subtitle}
      icon={icon}
      onBack={onBack}
      actions={
        <>
          <button
            type="button"
            className="buddy-ui-button buddy-ui-button--icon"
            aria-label={unreadCount > 0 ? `Upozornění (${unreadCount} nepřečtených)` : 'Upozornění'}
            onClick={onOpenNotifications}
          >
            <AppIcon name="bell" size={20} />
            {unreadCount > 0 && <span className="buddy-ui-badge" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
          {extraActions}
        </>
      }
    />
  )
}
