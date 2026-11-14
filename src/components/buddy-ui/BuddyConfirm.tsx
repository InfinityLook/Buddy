import { useRef, useState } from 'react'
import type { SurfaceId } from '@/features/appearance/themeCatalog'
import { BuddyDialog } from './BuddyDialog'

export interface BuddyConfirmation {
  title: string
  description?: string
  confirmLabel: string
  action: () => void | Promise<void>
  danger?: boolean
}

interface Props {
  surfaceId: SurfaceId
  confirmation: BuddyConfirmation
  onClose: () => void
}

export function BuddyConfirm({ surfaceId, confirmation, onClose }: Props) {
  const cancel = useRef<HTMLButtonElement>(null)
  const running = useRef(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function confirm() {
    if (running.current) return
    running.current = true
    setBusy(true)
    setFailed(false)
    try {
      await confirmation.action()
      onClose()
    } catch {
      running.current = false
      setBusy(false)
      setFailed(true)
    }
  }

  return (
    <BuddyDialog surfaceId={surfaceId} title={confirmation.title} initialFocusRef={cancel}
      onClose={() => { if (!running.current) onClose() }} footer={
        <>
          <button ref={cancel} className="buddy-ui-button" type="button" disabled={busy} onClick={onClose}>Zrušit</button>
          <button className={`buddy-ui-button buddy-ui-button--${confirmation.danger ? 'danger' : 'primary'}`}
            type="button" disabled={busy} onClick={() => void confirm()}>
            {busy ? 'Pracuji…' : confirmation.confirmLabel}
          </button>
        </>
      }>
      {confirmation.description && <p className="buddy-ui-status">{confirmation.description}</p>}
      {failed && <p className="buddy-ui-alert" role="alert">Akci se nepodařilo dokončit.</p>}
    </BuddyDialog>
  )
}
