import { useOnlineStatus } from '@/core/hooks/useOnlineStatus'
import { useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import './NetworkStatusBanner.css'

export function NetworkStatusBanner() {
  const isOnline = useOnlineStatus()
  const { rootAttributes } = useSurfaceAppearance('boot')

  return (
    <div className="buddy-network buddy-theme-scope" data-offline={!isOnline} {...rootAttributes} role={isOnline ? undefined : "status"} aria-live="polite">
      {!isOnline && <span>Jsi offline. Některé funkce vyžadují připojení.</span>}
    </div>
  )
}
