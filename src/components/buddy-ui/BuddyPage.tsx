import { useEffect, useRef, type ReactNode } from 'react'
import { AppBottomNav } from '@/components/AppBottomNav'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import type { SurfaceId } from '@/features/appearance/themeCatalog'
import { BuddyHeader } from './BuddyHeader'
import './buddy-page.css'

interface Props {
  surfaceId: SurfaceId
  title: string
  subtitle?: string
  backLabel: string
  onBack: () => void
  children: ReactNode
  className?: string
}

export function BuddyPage({ surfaceId, title, subtitle, backLabel, onBack, children, className = '' }: Props) {
  const { rootAttributes } = useSurfaceAppearance(surfaceId)
  const page = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = page.current
    const viewport = window.visualViewport
    if (!element || !viewport) return

    const fit = () => {
      if (viewport.scale === 1) {
        element.style.setProperty('--buddy-page-height', `${viewport.height}px`)
        element.style.setProperty('--buddy-page-top', `${viewport.offsetTop}px`)
      } else {
        element.style.removeProperty('--buddy-page-height')
        element.style.removeProperty('--buddy-page-top')
      }
    }

    fit()
    viewport.addEventListener('resize', fit)
    viewport.addEventListener('scroll', fit)
    return () => {
      viewport.removeEventListener('resize', fit)
      viewport.removeEventListener('scroll', fit)
    }
  }, [])
  return (
    <div ref={page} className={`buddy-page buddy-theme-scope ${className}`} {...rootAttributes}>
      <SurfaceBackdrop surfaceId={surfaceId} />
      <BuddyHeader title={title} subtitle={subtitle} backLabel={backLabel} onBack={onBack} />
      <main className="buddy-page-content" key={surfaceId}>
        {children}
      </main>
      <AppBottomNav placement="edge" />
    </div>
  )
}
