import * as v from 'valibot'
import { ROLE_REGISTRY } from './registry'
import type { RoleAssignment, RoleId } from './types'

// ==========================================
// Ověření přiřazení role načteného z úložiště.
//
// Stejné pravidlo jako u ostatních perzistentních storů: cokoli, co do
// uloženého tvaru přibude, musí být volitelné (v.optional), jinak starší
// uložený stav neprojde a uživatel o přiřazení přijde.
// ==========================================

// Seznam se bere z registru, aby nová role nevyžadovala úpravu i tady.
// Přetypování jen říká TypeScriptu, že registr není prázdný — picklist
// potřebuje aspoň jednu hodnotu.
const ROLE_IDS = Object.keys(ROLE_REGISTRY) as [RoleId, ...RoleId[]]

const RoleIdSchema = v.picklist(ROLE_IDS, 'Neznámá role')

export const RoleAssignmentSchema = v.object({
  roleId: RoleIdSchema,
  // null = bez omezení platnosti
  validUntil: v.nullable(v.string()),
  grantedAt: v.optional(v.string(), new Date(0).toISOString()),
})

export const RoleStateSchema = v.object({
  assignment: v.optional(RoleAssignmentSchema),
})

export const validateRoleData = (data: unknown) => {
  const result = v.safeParse(RoleStateSchema, data)
  if (result.success) {
    return { success: true as const, data: result.output }
  }
  console.warn('Data role neodpovídají schématu (byla poškozena nebo změněna):', result.issues)
  return { success: false as const, issues: result.issues }
}

/** Ověří jedno přiřazení. Používá se i na hodnotu přicházející zvenčí. */
export const parseAssignment = (data: unknown): RoleAssignment | null => {
  const result = v.safeParse(RoleAssignmentSchema, data)
  return result.success ? (result.output as RoleAssignment) : null
}
