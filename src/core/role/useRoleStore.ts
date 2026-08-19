import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateRoleData } from './roleValidation'
import { DEFAULT_ASSIGNMENT, extendValidity, resolveActiveRoleId } from './roleUtils'
import { getRole, isKnownRoleId } from './registry'
import type { Permission, RoleAssignment, RoleDefinition, RoleId } from './types'

// ==========================================
// Role přihlášeného uživatele.
//
// Store drží JEN uložené přiřazení. Jestli role právě platí, se
// nepočítá tady, ale až při čtení (viz useActiveRole) — kdyby se
// výsledek uložil, byl by po vypršení platnosti nepravdivý a nikdo by
// ho nepřepsal, protože aplikace mezitím vůbec nemusí běžet.
//
// POZOR: viz varování v types.ts. Tenhle stav leží v prohlížeči a nedá
// se mu věřit. Až se VIP bude prodávat za peníze, bude o něm rozhodovat
// server a tohle bude jen jeho kopie pro vykreslení.
// ==========================================

interface RoleState {
  assignment: RoleAssignment

  /** Přidělí roli. `dny = null` znamená bez omezení platnosti. */
  grantRole: (roleId: RoleId, dny: number | null) => void
  /** Prodlouží platnost té role, kterou uživatel má. */
  extendRole: (dny: number) => void
  /** Vrátí uživatele na výchozí roli. */
  revokeRole: () => void
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set, get) => ({
      assignment: DEFAULT_ASSIGNMENT,

      grantRole: (roleId, dny) => {
        if (!isKnownRoleId(roleId)) return

        set({
          assignment: {
            roleId,
            validUntil: dny === null ? null : extendValidity(DEFAULT_ASSIGNMENT, dny),
            grantedAt: new Date().toISOString(),
          },
        })
      },

      extendRole: (dny) => {
        const { assignment } = get()
        // Prodlužovat výchozí roli nedává smysl — není co prodlužovat
        if (assignment.roleId === DEFAULT_ASSIGNMENT.roleId) return

        set({
          assignment: { ...assignment, validUntil: extendValidity(assignment, dny) },
        })
      },

      revokeRole: () => set({ assignment: DEFAULT_ASSIGNMENT }),
    }),
    {
      name: 'schoolbuddy-role-storage',
      version: 1,
      storage: createJSONStorage(() => secureStorage),

      // Uložený stav se nepřebírá naslepo. Když neprojde ověřením,
      // uživatel spadne na výchozí roli — to je bezpečný směr, protože
      // poškozený stav nesmí nikomu přidělit placenou roli.
      merge: (persisted, current) => {
        const validation = validateRoleData(persisted)
        if (!validation.success) return current

        return {
          ...current,
          assignment: validation.data.assignment ?? DEFAULT_ASSIGNMENT,
        }
      },

      migrate: (persistedState, _version) => {
        const validation = validateRoleData(persistedState)
        return validation.success ? persistedState : { assignment: DEFAULT_ASSIGNMENT }
      },
    }
  )
)

// ==========================================
// Čtecí pomocníci. Přes ně se ptá celá aplikace — nikdy ne přímo na
// assignment.roleId, protože ten může být po vypršení platnosti neaktuální.
// ==========================================

/** Role, která uživateli právě teď doopravdy patří. */
export const useActiveRole = (): RoleDefinition => {
  const assignment = useRoleStore((state) => state.assignment)
  return getRole(resolveActiveRoleId(assignment))
}

/** Má uživatel dané oprávnění? Jediný správný způsob, jak se ptát. */
export const useHasPermission = (permission: Permission): boolean => {
  const role = useActiveRole()
  return role.permissions.includes(permission)
}

/** Totéž mimo React (např. v akci storu). */
export const hasPermissionNow = (permission: Permission): boolean =>
  getRole(resolveActiveRoleId(useRoleStore.getState().assignment)).permissions.includes(permission)
