// Jediný vstupní bod do systému rolí. Zbytek aplikace importuje odsud,
// ne z jednotlivých souborů uvnitř.
export type { Permission, RoleAssignment, RoleDefinition, RoleId } from './types'
export {
  ROLE_REGISTRY,
  ALL_ROLES,
  PURCHASABLE_ROLES,
  DEFAULT_ROLE_ID,
  FEATURE_GATING_ENABLED,
  getRole,
  isKnownRoleId,
  roleHasPermission,
} from './registry'
export {
  DEFAULT_ASSIGNMENT,
  daysRemaining,
  extendValidity,
  formatValidUntil,
  isAssignmentExpired,
  resolveActiveRoleId,
} from './roleUtils'
export { useRoleStore, useActiveRole, useHasPermission, hasPermissionNow } from './useRoleStore'
export { setupRoleDevTools } from './devTools'
export { USER_ROLE } from './user'
export { VIP_ROLE, VIP_DURATIONS } from './vip'
export type { VipDuration } from './vip'
export { MODERATOR_ROLE } from './moderator'
export { ADMIN_ROLE } from './admin'
