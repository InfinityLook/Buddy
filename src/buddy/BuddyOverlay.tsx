import { lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import type { Buddy3DOverlayProps } from '../buddy3d/Buddy3DOverlay'
import '@/components/buddy-ui/buddy-ui.css'
import './BuddyOverlay.css'

const Buddy3DOverlay = lazy(() => import('../buddy3d/Buddy3DOverlay'))

function Nacitani({ voice, onZavrit, themeId = 'zlaty-soumrak' }: Buddy3DOverlayProps) {
  return createPortal(
    <div className="buddy-theme-scope buddy-overlay-loading" data-buddy-theme={themeId}>
      <span role="status">Buddy přichází…</span>
      <button type="button" className="buddy-ui-button" onClick={() => {
        voice.zastavit()
        onZavrit()
      }}>Zavřít</button>
    </div>,
    document.body,
  )
}

export function BuddyOverlay(props: Buddy3DOverlayProps) {
  return (
    <Suspense fallback={<Nacitani {...props} />}>
      <Buddy3DOverlay {...props} />
    </Suspense>
  )
}
