import React, { useEffect, useState } from 'react'
import { SURFACES, THEME_FAMILIES, type BuddyThemeId, type SurfaceId } from './themeCatalog'
import { useAppearanceStore } from './useAppearanceStore'
import { resolveSurfaceTheme } from './themePreferences'
import './buddy-theme-tokens.css'

/** Handles both / and a configured Vite base. catalog paths are public-root paths. */
export const themeAssetUrl = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

export function useSurfaceAppearance(id: SurfaceId, callerId?: SurfaceId) {
  const globalThemeId = useAppearanceStore((state) => state.globalThemeId)
  const overrides = useAppearanceStore((state) => state.surfaceOverrides)
  const ownScenery = useAppearanceStore((state) => state.sceneryOverrides[id])
  const themeId = resolveSurfaceTheme({ globalThemeId, surfaceOverrides: overrides, sceneryOverrides: {} }, id, callerId)
  return {
    themeId,
    scenery: ownScenery ?? SURFACES[id].defaultScenery,
    theme: THEME_FAMILIES[themeId],
    variant: SURFACES[id].variants[themeId],
    rootAttributes: { 'data-buddy-theme': themeId, 'data-buddy-surface': id, 'data-buddy-backdrop': SURFACES[id].backgroundMode },
  }
}

export function SurfaceBackdrop({ surfaceId }: { surfaceId: SurfaceId }) {
  const { themeId, scenery, theme, variant } = useSurfaceAppearance(surfaceId)
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [surfaceId, themeId, scenery])
  if (SURFACES[surfaceId].backgroundMode === 'none') return null
  if (failed) return null // The scope always retains its solid background color.
  const mobile = scenery ? theme.assets.sceneMobile : variant.assets.backgroundMobile
  const tablet = scenery ? theme.assets.sceneTablet : variant.assets.backgroundTablet
  return (
    <div className="buddy-theme-backdrop" data-scenery={scenery} aria-hidden="true">
      <picture>
        <source media="(min-width: 768px)" srcSet={themeAssetUrl(tablet)} />
        <img src={themeAssetUrl(mobile)} alt="" decoding="async" onError={() => setFailed(true)} />
      </picture>
    </div>
  )
}

export function SurfaceThemeIcon({ surfaceId, themeId, tile = false, size = 28, label = '' }: {
  surfaceId: SurfaceId; themeId: BuddyThemeId; tile?: boolean; size?: number; label?: string
}) {
  const assets = SURFACES[surfaceId].variants[themeId].assets
  return <img className="buddy-themed-icon" src={themeAssetUrl(tile ? assets.tile : assets.icon)}
    width={size} height={size} alt={label} aria-hidden={label ? undefined : true} />
}

/** Useful for a portal/dialog outside the normal root: theme it explicitly. */
export function SurfaceThemeScope({ surfaceId, children, className = '', callerId }: {
  surfaceId: SurfaceId; children: React.ReactNode; className?: string; callerId?: SurfaceId
}) {
  const { rootAttributes } = useSurfaceAppearance(surfaceId, callerId)
  return <div className={`buddy-theme-scope ${className}`} {...rootAttributes}>{children}</div>
}
