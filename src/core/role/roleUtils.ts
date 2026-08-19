import type { RoleAssignment, RoleId } from './types'
import { DEFAULT_ROLE_ID } from './registry'

// ==========================================
// Výpočty nad platností role. Čisté funkce bez vazby na store, aby se
// daly ověřit samostatně a volat i mimo React.
// ==========================================

const DEN_MS = 24 * 60 * 60 * 1000

/** Přiřazení bez omezení platnosti — výchozí uživatel, správce, moderátor. */
export const trvaleProrideni = (roleId: RoleId, grantedAt = new Date()): RoleAssignment => ({
  roleId,
  validUntil: null,
  grantedAt: grantedAt.toISOString(),
})

/** Výchozí stav: běžný uživatel bez omezení. */
export const DEFAULT_ASSIGNMENT: RoleAssignment = {
  roleId: DEFAULT_ROLE_ID,
  validUntil: null,
  grantedAt: new Date(0).toISOString(),
}

/**
 * Vypršela už platnost?
 *
 * `validUntil: null` znamená bez omezení, takže nikdy nevyprší.
 * Nečitelné datum bereme jako vypršené — raději uživatele vrátit na
 * základní roli než mu na poškozeném stavu nechat placenou.
 */
export const isAssignmentExpired = (
  assignment: RoleAssignment,
  now: Date = new Date()
): boolean => {
  if (assignment.validUntil === null) return false

  const konec = Date.parse(assignment.validUntil)
  if (Number.isNaN(konec)) return true

  return konec <= now.getTime()
}

/** Role, která uživateli právě teď doopravdy patří. */
export const resolveActiveRoleId = (
  assignment: RoleAssignment,
  now: Date = new Date()
): RoleId => (isAssignmentExpired(assignment, now) ? DEFAULT_ROLE_ID : assignment.roleId)

/**
 * Kolik celých dní platnosti zbývá. Vrací null u přiřazení bez omezení,
 * 0 u toho, co už vypršelo. Zaokrouhluje se nahoru, protože "zbývá půl
 * dne" má uživateli říct 1, ne 0.
 */
export const daysRemaining = (
  assignment: RoleAssignment,
  now: Date = new Date()
): number | null => {
  if (assignment.validUntil === null) return null

  const konec = Date.parse(assignment.validUntil)
  if (Number.isNaN(konec)) return 0

  return Math.max(0, Math.ceil((konec - now.getTime()) / DEN_MS))
}

/** Datum konce platnosti po přikoupení dalších dní. */
export const extendValidity = (
  assignment: RoleAssignment,
  dny: number,
  now: Date = new Date()
): string => {
  // Prodloužení nesmí zkrátit to, co uživatel už zaplatil: počítá se od
  // konce běžící platnosti, ne ode dneška. Vypršelé nebo nečitelné
  // přiřazení začíná znovu od teď.
  const stavajici = assignment.validUntil ? Date.parse(assignment.validUntil) : NaN
  const zaklad =
    !Number.isNaN(stavajici) && stavajici > now.getTime() ? stavajici : now.getTime()

  return new Date(zaklad + dny * DEN_MS).toISOString()
}

/** Formát data konce platnosti pro výpis v UI. */
export const formatValidUntil = (validUntil: string | null): string => {
  if (validUntil === null) return 'bez omezení'

  const datum = new Date(validUntil)
  if (Number.isNaN(datum.getTime())) return 'neznámo'

  return datum.toLocaleDateString('cs-CZ')
}
