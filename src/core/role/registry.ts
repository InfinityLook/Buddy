import type { Permission, RoleDefinition, RoleId } from './types'
import { USER_ROLE } from './user'
import { VIP_ROLE } from './vip'
import { MODERATOR_ROLE } from './moderator'
import { ADMIN_ROLE } from './admin'

// ==========================================
// Jediné místo, kde jsou role vyjmenované. Přidání další role je zápis
// sem plus nová složka vedle user/ a vip/ — nikde jinde se seznam rolí
// neopakuje.
// ==========================================

export const ROLE_REGISTRY: Record<RoleId, RoleDefinition> = {
  user: USER_ROLE,
  vip: VIP_ROLE,
  moderator: MODERATOR_ROLE,
  admin: ADMIN_ROLE,
}

/** Výchozí role. Dostane ji každý, kdo nemá platné přiřazení. */
export const DEFAULT_ROLE_ID: RoleId = USER_ROLE.id

export const ALL_ROLES: RoleDefinition[] = Object.values(ROLE_REGISTRY).sort(
  (a, b) => a.rank - b.rank
)

/** Role, které se smí objevit v obchodě. */
export const PURCHASABLE_ROLES: RoleDefinition[] = ALL_ROLES.filter((role) => role.purchasable)

/**
 * Vrátí definici role. Neznámé id (poškozený stav, ručně upravené
 * úložiště) spadne na výchozí roli místo pádu aplikace.
 */
export const getRole = (roleId: string | null | undefined): RoleDefinition =>
  ROLE_REGISTRY[roleId as RoleId] ?? USER_ROLE

export const isKnownRoleId = (value: unknown): value is RoleId =>
  typeof value === 'string' && value in ROLE_REGISTRY

export const roleHasPermission = (roleId: RoleId, permission: Permission): boolean =>
  getRole(roleId).permissions.includes(permission)

/**
 * Přepínač zamykání funkcí. Dokud je vypnutý, jsou všechny miniaplikace
 * a funkce dostupné každému bez ohledu na roli — oprávnění
 * 'features.premium' existuje, ale nic se podle něj neschovává.
 *
 * Je to vědomé rozhodnutí, ne nedodělek: obsah, který uživatel dneska
 * má, mu placená verze nesmí vzít. Zamykat půjde až to, co přibude nově.
 */
export const FEATURE_GATING_ENABLED = false
