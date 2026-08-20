// ==========================================
// Tvary dat Admin panelu.
// ==========================================

export type AdminTab = 'prehled' | 'social-report' | 'konzole'

export const ADMIN_TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'prehled', label: 'Přehled', icon: '📊' },
  { id: 'social-report', label: 'SocialReport', icon: '🚩' },
  { id: 'konzole', label: 'Konzole', icon: '⌨️' },
]

/** Jeden řádek vrácený `admin_prehled()` — viz migrace admin_panel_prehled. */
export interface AdminPrehled {
  pocetUctu: number
  pocetHlaseniCelkem: number
  pocetNevyrizenychHlaseni: number
  pocetZprav24h: number
  pocetChatu: number
  pocetPratelstvi: number
}

/** Zdroj, ze kterého se čte zátěž/parametry v grafu Přehledu. */
export type ZdrojMetrik = 'aplikace' | 'supabase' | 'vercel'
