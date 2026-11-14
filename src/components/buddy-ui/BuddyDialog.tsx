import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import type { SurfaceId } from '@/features/appearance/themeCatalog'
import './buddy-ui.css'

interface BuddyDialogProps {
  title: string
  surfaceId: SurfaceId
  callerId?: SurfaceId
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  initialFocusRef?: { current: HTMLElement | null }
  closeLabel?: string
  presentation?: 'dialog' | 'sheet'
  className?: string
  contentClassName?: string
}

/** Mount while open. Native modality handles keyboard focus and the top layer. */
export function BuddyDialog({
  title,
  surfaceId,
  callerId,
  onClose,
  children,
  footer,
  initialFocusRef,
  closeLabel = 'Zavřít panel',
  presentation = 'dialog',
  className = '',
  contentClassName = '',
}: BuddyDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pointerStartedOnBackdrop = useRef(false)
  const { rootAttributes } = useSurfaceAppearance(surfaceId, callerId)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const opener = document.activeElement
    const viewport = window.visualViewport
    function fitViewport() {
      if (!dialog || !viewport) return
      if (viewport.scale !== 1) {
        dialog.style.removeProperty('--buddy-ui-visual-height')
        dialog.style.removeProperty('--buddy-ui-visual-top')
        dialog.style.removeProperty('--buddy-ui-visual-bottom')
        return
      }
      const bottom = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      dialog.style.setProperty('--buddy-ui-visual-height', `${viewport.height}px`)
      dialog.style.setProperty('--buddy-ui-visual-top', `${Math.max(0, viewport.offsetTop)}px`)
      dialog.style.setProperty('--buddy-ui-visual-bottom', `${bottom}px`)
    }

    dialog.showModal()
    initialFocusRef?.current?.focus({ preventScroll: true })
    fitViewport()
    viewport?.addEventListener('resize', fitViewport)
    viewport?.addEventListener('scroll', fitViewport)

    return () => {
      viewport?.removeEventListener('resize', fitViewport)
      viewport?.removeEventListener('scroll', fitViewport)
      dialog.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [initialFocusRef])

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`buddy-theme-scope buddy-ui-dialog buddy-ui-dialog--${presentation} ${className}`}
      {...rootAttributes}
      aria-labelledby={titleId}
      onCancel={event => {
        if (event.target !== event.currentTarget) return
        event.preventDefault()
        onClose()
      }}
      onPointerDown={event => {
        pointerStartedOnBackdrop.current = event.target === event.currentTarget
      }}
      onClick={event => {
        if (pointerStartedOnBackdrop.current && event.target === event.currentTarget) onClose()
        pointerStartedOnBackdrop.current = false
      }}
    >
      <div className="buddy-ui-dialog-layout">
        <header className="buddy-ui-dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="buddy-ui-button buddy-ui-button--icon"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <AppIcon name="x" size={20} />
          </button>
        </header>
        <div className={`buddy-ui-dialog-content ${contentClassName}`}>{children}</div>
        {footer && <footer className="buddy-ui-dialog-footer">{footer}</footer>}
      </div>
    </dialog>,
    document.body,
  )
}
