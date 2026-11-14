import type { ReactNode } from 'react'
import { BuddyDialog } from '@/components/buddy-ui/BuddyDialog'
import type { SurfaceId } from '@/features/appearance/themeCatalog'
import '../Community.css'

interface Props {
  title: string
  surfaceId: SurfaceId
  callerId?: SurfaceId
  onClose: () => void
  children: ReactNode
  fullscreen?: boolean
}

export function CommunityDialog({ title, surfaceId, callerId, onClose, children, fullscreen }: Props) {
  return (
    <BuddyDialog title={title} surfaceId={surfaceId} callerId={callerId} onClose={onClose}
      presentation={fullscreen ? 'dialog' : 'sheet'}
      className={fullscreen ? 'community-dialog community-dialog--fullscreen' : 'community-dialog'}
      contentClassName="community-dialog-content">
      {children}
    </BuddyDialog>
  )
}
