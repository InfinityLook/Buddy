// ==========================================
// Tvary dat Admin panelu.
// ==========================================

export type AdminTab = 'prehled' | 'social-report' | 'notifikace' | 'audit-log' | 'uzivatele' | 'konzole'

export const ADMIN_TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'prehled', label: 'Přehled', icon: '📊' },
  { id: 'social-report', label: 'SocialReport', icon: '🚩' },
  { id: 'notifikace', label: 'Notifikace', icon: '📣' },
  { id: 'audit-log', label: 'Audit log', icon: '📜' },
  { id: 'uzivatele', label: 'Uživatelé', icon: '👥' },
  { id: 'konzole', label: 'Konzole', icon: '⌨️' },
]

/** Role, které jde nastavit z Uživatelů — stejná čtveřice jako
 *  core/role/registry.ts, duplikovaná jako string literal ne import,
 *  protože admin panel řeší jen text pro user_roles.role, ne
 *  RoleDefinition objekty samotné. */
export const NASTAVITELNE_ROLE = ['user', 'vip', 'moderator', 'admin'] as const
export type NastavitelnaRole = (typeof NASTAVITELNE_ROLE)[number]

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

/** Jeden den vrácený `admin_rustovy_graf()` — viz migrace admin_detailni_analytika. */
export interface RustovyDen {
  den: string
  novychUctu: number
  novychZprav: number
}

/** Jeden řádek vrácený `admin_aktivita_podle_druhu()`. */
export interface AktivitaPodleDruhu {
  kind: string
  celkem: number
}

/** Jeden řádek vrácený `admin_top_odznaky()`. */
export interface TopOdznak {
  badgeId: string
  celkem: number
}

/** Jeden řádek vrácený `admin_seznam_uctu()` — viz migrace admin_sprava_uzivatelu. */
export interface UcetRadek {
  id: string
  displayName: string
  friendCode: string
  xp: number
  level: number
  streakDays: number
  role: NastavitelnaRole
  validUntil: string | null
}
