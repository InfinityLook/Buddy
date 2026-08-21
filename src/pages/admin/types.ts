// ==========================================
// Tvary dat Admin panelu.
// ==========================================

export type AdminTab = 'prehled' | 'social-report' | 'notifikace' | 'audit-log' | 'konzole'

export const ADMIN_TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'prehled', label: 'Přehled', icon: '📊' },
  { id: 'social-report', label: 'SocialReport', icon: '🚩' },
  { id: 'notifikace', label: 'Notifikace', icon: '📣' },
  { id: 'audit-log', label: 'Audit log', icon: '📜' },
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

/** Jeden řádek vrácený `nacti_audit_log()` — viz migrace audit_log_admin_akci. */
export interface AuditLogRadek {
  id: string
  adminId: string | null
  adminJmeno: string | null
  akce: string
  cilId: string | null
  cilJmeno: string | null
  detail: Record<string, unknown> | null
  vytvorenoV: string
}
