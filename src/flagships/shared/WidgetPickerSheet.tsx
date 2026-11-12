import { BuddyDialog } from '@/components/buddy-ui/BuddyDialog'
import type { SurfaceId } from '@/features/appearance/themeCatalog'
import { AppIcon } from '@/pages/app/components/AppIcon'
import type { FlagshipDlazdice } from './types'

interface Props {
  surfaceId: SurfaceId
  moznosti: FlagshipDlazdice[]
  aktualniId: string | null
  onVybrat: (widgetId: string) => void
  onOdebrat: () => void
  onZavrit: () => void
}

export function WidgetPickerSheet({ surfaceId, moznosti, aktualniId, onVybrat, onOdebrat, onZavrit }: Props) {
  return (
    <BuddyDialog
      surfaceId={surfaceId}
      title="Vybrat widget"
      presentation="sheet"
      onClose={onZavrit}
      footer={aktualniId && (
        <button type="button" className="buddy-ui-button fs-themed-remove" onClick={onOdebrat}>
          Odebrat ze slotu
        </button>
      )}
    >
      <div className="fs-themed-list">
        {moznosti.map(item => (
          <button
            key={item.id}
            type="button"
            className="buddy-ui-button fs-themed-item"
            aria-pressed={aktualniId === item.id}
            onClick={() => onVybrat(item.id)}
          >
            <span className={`fs-picker-ikona fs-barva--${item.barva}`} aria-hidden="true">
              <AppIcon name={item.ikona} size={18} />
            </span>
            <span className="fs-picker-text">
              <strong>{item.nazev}</strong>
              <span>{item.popis}</span>
            </span>
            {aktualniId === item.id && <span aria-hidden="true"><AppIcon name="check" size={16} /></span>}
          </button>
        ))}
      </div>
    </BuddyDialog>
  )
}
