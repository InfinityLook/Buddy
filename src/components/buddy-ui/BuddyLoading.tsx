import { SurfaceThemeScope } from '@/features/appearance/SurfaceAppearance'
import './buddy-ui.css'

export function BuddyLoading({ text = 'Načítám…' }: { text?: string }) {
  return (
    <SurfaceThemeScope surfaceId="boot" className="buddy-ui-screen-state">
      <p className="buddy-ui-status buddy-ui-card" role="status">{text}</p>
    </SurfaceThemeScope>
  )
}
