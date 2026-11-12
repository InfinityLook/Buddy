import type { ReactNode } from 'react'
import { AppIcon } from '@/pages/app/components/AppIcon'
import './buddy-ui.css'

interface BuddyHeaderProps {
  title: string
  headingLevel?: 1 | 2
  subtitle?: string
  icon?: string
  actions?: ReactNode
  onBack?: () => void
  backLabel?: string
  variant?: 'panel' | 'quiet'
  className?: string
}

export function BuddyHeader({
  title,
  headingLevel = 1,
  subtitle,
  icon,
  actions,
  onBack,
  backLabel = 'Zpět',
  variant = 'panel',
  className = '',
}: BuddyHeaderProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h1'
  return (
    <header className={`buddy-ui-header buddy-ui-header--${variant} ${className}`}>
      {onBack && (
        <button
          type="button"
          className="buddy-ui-button buddy-ui-button--icon"
          aria-label={backLabel}
          onClick={onBack}
        >
          <AppIcon name="arrow-left" size={20} />
        </button>
      )}
      <div className="buddy-ui-header-copy">
        <div className="buddy-ui-header-title">
          {icon && <AppIcon name={icon} size={20} />}
          <Heading>{title}</Heading>
        </div>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="buddy-ui-header-actions">{actions}</div>}
    </header>
  )
}
