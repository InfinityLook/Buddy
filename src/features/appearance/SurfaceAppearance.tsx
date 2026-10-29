import React, { useEffect, useState } from 'react'
import { SURFACES, THEME_FAMILIES, type BuddyThemeId, type SurfaceId } from './themeCatalog'
import { useAppearanceStore } from './useAppearanceStore'
import { resolveSurfaceTheme } from './themePreferences'
import './buddy-theme-tokens.css'

/** Handles both / and a configured Vite base. catalog paths are public-root paths. */
export const themeAssetUrl = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

// <K extends SurfaceId> (ne jen `id: SurfaceId`) je to, co dovolí volajícímu
// se svým vlastním literálem (`useSurfaceAppearance('hub')` v Hub.tsx) dostat
// zpátky `variant` zúžený přesně na SURFACES['hub']['variants'][...] — se
// starým, negenerickým podpisem by TS spočítal `variant` jako sjednocení přes
// všech 73 surfaces (appka by nemohla sáhnout na hub-specifické klíče jako
// `aiButton`, protože ty na drtivé většině ostatních surfaces neexistují).
// Volání s obecným `surfaceId: SurfaceId` (SurfaceBackdrop/SurfaceThemeScope
// níž) se chová přesně jako dřív — K se tam zúží zpátky na celé SurfaceId.
export function useSurfaceAppearance<K extends SurfaceId>(id: K, callerId?: SurfaceId) {
  const globalThemeId = useAppearanceStore((state) => state.globalThemeId)
  const overrides = useAppearanceStore((state) => state.surfaceOverrides)
  const ownScenery = useAppearanceStore((state) => state.sceneryOverrides[id])
  const themeId = resolveSurfaceTheme({ globalThemeId, surfaceOverrides: overrides, sceneryOverrides: {} }, id, callerId)
  return {
    themeId,
    scenery: ownScenery ?? SURFACES[id].defaultScenery,
    theme: THEME_FAMILIES[themeId],
    // `as` je tu nutný, ne kosmetický — appka generickou funkci typuje
    // podle `id: K`, ale TS vevnitř těla generické funkce počítá
    // `SURFACES[id]` podle celého omezení K (= SurfaceId), ne podle
    // konkrétního literálu z volajícího místa (to se vyřeší až mimo
    // tělo funkce, na volání samém) — appka proto sama potvrzuje typ,
    // o kterém `id: K` už ví, že je pravdivý za běhu.
    variant: SURFACES[id].variants[themeId] as (typeof SURFACES)[K]['variants'][BuddyThemeId],
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
      {/* Appka tu rozlišuje telefon/tablet/PC podle orientace, ne jen podle
          šířky — dřív appka brala "tablet" obrázek (landscape kompozice)
          pro cokoli ≥768px bez ohledu na to, jestli zařízení leží na výšku,
          takže tablet na výšku dostal appčin ořez stavěný pro širokou
          obrazovku a hlavní motiv scény (postava/hrad) se z velké části
          ztratil. "(orientation: portrait)" teď appka zkontroluje jako
          první — ať telefon NA VÝŠKU i tablet NA VÝŠKU dostanou stejný,
          pro výšku stavěný obrázek; cokoli na šířku (tablet i PC) teprve
          pak padá do "min-width", a appka pro oba sahá po stejném landscape
          obrázku, protože druhou, appce vlastní kompozici appka nemá — na
          skutečně širokém PC `object-fit: cover` z něj navíc stihne ukázat
          skoro celou scénu, takže appku to tam ani netlačí ke ztrátě
          motivu stejně jako u tabletu na výšku. */}
      <picture>
        <source media="(orientation: portrait)" srcSet={themeAssetUrl(mobile)} />
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
