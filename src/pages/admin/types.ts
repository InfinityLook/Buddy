import type { Permission } from '@/core/role'

// ==========================================
// Tvary dat Admin panelu.
// ==========================================

export type AdminTab = 'prehled' | 'social-report' | 'notifikace' | 'audit-log' | 'uzivatele' | 'system' | 'konzole'

export interface AdminTabDef {
  id: AdminTab
  label: string
  icon: string
  /** Krátký popis pro řádek v menu (AdminModule.tsx) — co sekce dělá. */
  popis: string
  /** Nejnižší oprávnění, co sekci otevře — 'moderation.content' (má ho
   *  i moderátor) nebo 'admin.panel' (jen správce). Řídí zároveň
   *  filtrování menu (viz AdminModule.tsx) i štítek požadované role
   *  vedle položky, žádný zdvojený seznam. */
  permission: Extract<Permission, 'moderation.content' | 'admin.panel'>
}

export const ADMIN_TABS: AdminTabDef[] = [
  {
    id: 'prehled',
    label: 'Přehled',
    icon: '📊',
    popis: 'Stav aplikace, růst za 14 dní a živé parametry.',
    permission: 'admin.panel',
  },
  {
    id: 'social-report',
    label: 'SocialReport',
    icon: '🚩',
    popis: 'Hlášení ze Social — vyřešit, zamítnout, zabanovat.',
    permission: 'moderation.content',
  },
  {
    id: 'notifikace',
    label: 'Notifikace',
    icon: '📣',
    popis: 'Rozeslat oznámení, co uvidí každý přihlášený uživatel.',
    permission: 'admin.panel',
  },
  {
    id: 'audit-log',
    label: 'Audit log',
    icon: '📜',
    popis: 'Kdo, co a kdy udělal jako správce nebo moderátor.',
    permission: 'admin.panel',
  },
  {
    id: 'uzivatele',
    label: 'Uživatelé',
    icon: '👥',
    popis: 'Hledat účty a měnit jejich role.',
    permission: 'admin.panel',
  },
  {
    id: 'system',
    label: 'Systém',
    icon: '🩺',
    popis: 'Chyby zachycené appkou přímo u uživatelů.',
    permission: 'admin.panel',
  },
  {
    id: 'konzole',
    label: 'Konzole',
    icon: '⌨️',
    popis: 'Příkazový řádek appky — appinfo a další.',
    permission: 'admin.panel',
  },
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

/** Jeden řádek vrácený `nacti_client_errors()` — viz migrace client_errors_monitoring. */
export interface ChybaAplikace {
  id: string
  userId: string | null
  uzivatelJmeno: string | null
  message: string
  stack: string | null
  url: string | null
  buildId: string | null
  createdAt: string
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
