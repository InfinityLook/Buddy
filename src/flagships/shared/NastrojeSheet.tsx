import { BuddyDialog } from '@/components/buddy-ui/BuddyDialog'
import type { SurfaceId } from '@/features/appearance/themeCatalog'
import { AppIcon } from '@/pages/app/components/AppIcon'
import type { FlagshipDlazdice } from './types'

interface Props {
  nadpis: string
  nastroje: FlagshipDlazdice[]
  onZavrit: () => void
  surfaceId?: SurfaceId
}

export function NastrojeSheet({ nadpis, nastroje, onZavrit, surfaceId }: Props) {
  const list = (
    <div className={surfaceId ? 'fs-themed-list' : 'fs-picker-seznam'}>
      {nastroje.map(item => (
        <button
          key={item.id}
          type="button"
          className={surfaceId ? 'buddy-ui-button fs-themed-item' : 'fs-picker-polozka'}
          onClick={item.onClick}
        >
          <span className={`fs-picker-ikona fs-barva--${item.barva}`} aria-hidden="true">
            <AppIcon name={item.ikona} size={18} />
          </span>
          <span className="fs-picker-text">
            <strong>{item.nazev}</strong>
            <span>{item.popis}</span>
          </span>
          <span aria-hidden="true"><AppIcon name="arrow-right" size={15} /></span>
        </button>
      ))}
    </div>
  )

  if (surfaceId) {
    return (
      <BuddyDialog surfaceId={surfaceId} title={nadpis} presentation="sheet" onClose={onZavrit}>
        {list}
      </BuddyDialog>
    )
  }

  return (
    <>
      <div className="fs-overlay" onClick={onZavrit} />
      <div className="fs-picker" role="dialog" aria-label={nadpis}>
        <div className="fs-picker-hlavicka">
          <h3>{nadpis}</h3>
          <button type="button" className="fs-picker-zavrit" aria-label="Zavřít" onClick={onZavrit}>
            <AppIcon name="x" size={16} />
          </button>
        </div>
        {list}
      </div>
    </>
  )
}
