import { isSurfaceId, ROOM_BY_ROUTE, SURFACES, type SurfaceId } from './themeCatalog'

export interface ModuleViewState {
  activeAppId?: string | null
  socialTab?: string | null
  chatOpen?: boolean
  secretChatOpen?: boolean
  settingsSection?: string | null
  adminSection?: string | null
  supportDetail?: boolean
  worldView?: 'entry' | 'hud' | 'panel'
}

/** Selection only. Existing route/auth/role gates remain authoritative. No navigation is performed. */
export function resolveModuleSurface(pathname: string, view: ModuleViewState = {}): SurfaceId | null {
  if (Object.prototype.hasOwnProperty.call(ROOM_BY_ROUTE,pathname)) return ROOM_BY_ROUTE[pathname]
  switch (pathname) {
    case '/': return 'login'
    case '/apps': return isSurfaceId(view.activeAppId) && SURFACES[view.activeAppId].kind === 'app' ? view.activeAppId : 'apps-launcher'
    case '/profil': return 'profile'
    case '/odmeny': return 'achievements'
    case '/obchod': return 'shop'
    case '/feed': return 'feed'
    case '/navod': return 'help'
    case '/podpora': return view.supportDetail ? 'support-conversation' : 'support'
    case '/skola/statistiky': return 'school-stats'
    case '/skola/upozorneni': return 'school-alerts'
    case '/social':
      if (view.chatOpen) return 'chat-conversation'
      if (view.secretChatOpen) return 'secret-chat'
      return view.socialTab === 'chaty' ? 'chat-list' : view.socialTab === 'vyhledavac' ? 'people-search' : 'social-home'
    case '/nastaveni': {
      const sections: Record<string, SurfaceId> = { osobni:'settings-personal',zvuk:'settings-sound',vzhled:'settings-appearance',zabezpeceni:'settings-security',soukromi:'settings-privacy',jazyk:'settings-language',tutorial:'settings-tutorial',zaloha:'settings-backup' }
      return Object.prototype.hasOwnProperty.call(sections,view.settingsSection ?? '') ? sections[view.settingsSection as string] : 'settings'
    }
    case '/admin': {
      const sections: Record<string, SurfaceId> = { prehled:'admin-overview','social-report':'admin-reports',notifikace:'admin-notifications','audit-log':'admin-audit',uzivatele:'admin-users',system:'admin-system',konzole:'admin-console' }
      return Object.prototype.hasOwnProperty.call(sections,view.adminSection ?? '') ? sections[view.adminSection as string] : 'admin'
    }
    case '/buddy-world': return view.worldView === 'hud' ? 'buddyworld-hud' : view.worldView === 'panel' ? 'buddyworld-panel' : 'buddyworld-entry'
    // Hub keeps its approved original assets and reads the same globalThemeId.
    // Legacy /hra* routes keep their redirects; unknown routes keep the existing fallback.
    default: return null
  }
}
