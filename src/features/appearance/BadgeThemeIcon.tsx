import { BADGE_ARTWORK, type BadgeArtId } from './badgeCatalog'
import { type BuddyThemeId } from './themeCatalog'
import { themeAssetUrl } from './SurfaceAppearance'

/** Artwork is never an entitlement check: pass the real unlockedAt state from gamification. */
export function getBadgeArtwork(badgeId: string, themeId: BuddyThemeId, unlocked = false): string {
  if (!unlocked || !Object.prototype.hasOwnProperty.call(BADGE_ARTWORK, badgeId)) {
    return `/buddy-themes/badges/${themeId}/locked.svg`
  }
  return BADGE_ARTWORK[badgeId as BadgeArtId].variants[themeId].svg
}

export function BadgeThemeIcon({ badgeId, themeId, unlocked = false, size = 56, label = '' }: {
  badgeId: string; themeId: BuddyThemeId; unlocked?: boolean; size?: number; label?: string
}) {
  return <img className="buddy-themed-icon" src={themeAssetUrl(getBadgeArtwork(badgeId,themeId,unlocked))}
    width={size} height={size} alt={label} aria-hidden={label ? undefined : true} />
}
