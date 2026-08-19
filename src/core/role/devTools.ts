import { ALL_ROLES, getRole } from './registry'
import { daysRemaining, formatValidUntil, resolveActiveRoleId } from './roleUtils'
import { useRoleStore } from './useRoleStore'
import type { RoleId } from './types'

// ==========================================
// Vrátka pro vývoj: přidělení role z konzole prohlížeče.
//
// Admin ani moderátor se nedají koupit a je to tak správně — o tom, kdo
// je smí mít, nemůže rozhodovat prohlížeč. Dokud ale role nepřiděluje
// server, není jak si je při vývoji nasadit a vyzkoušet, jak aplikace
// s nimi vypadá. Tohle je právě na to.
//
// Běží JEN ve vývojovém režimu. V produkčním buildu Vite vyhodnotí
// import.meta.env.DEV jako false a celý blok se z výsledku vyhodí, takže
// se na nasazenou aplikaci nedostane. Ověřuje se to grepem přes dist/
// (viz komentář u setupRoleDevTools).
// ==========================================

interface RoleDevTools {
  /** Přidělí roli. Dny = null nebo vynecháno znamená bez omezení platnosti. */
  grant: (roleId: RoleId, dny?: number | null) => void
  /** Vrátí zpátky na výchozího uživatele. */
  revoke: () => void
  /** Vypíše, co je právě nastavené. */
  stav: () => void
  /** Vypíše, jaké role vůbec existují. */
  seznam: () => void
}

declare global {
  interface Window {
    buddyRole?: RoleDevTools
  }
}

/**
 * Zapne vrátka. Volá se jednou z App.tsx; v produkci nedělá nic.
 *
 * Ověření, že se to opravdu nedostane do nasazené aplikace:
 *   npm run build && grep -r buddyRole dist/   # nesmí nic najít
 */
export const setupRoleDevTools = (): void => {
  if (!import.meta.env.DEV) return
  if (typeof window === 'undefined') return
  // StrictMode spouští efekty dvakrát, takže bez tohohle by se úvodní
  // hláška v konzoli objevila pokaždé dvakrát.
  if (window.buddyRole) return

  const vypis = () => {
    const { assignment } = useRoleStore.getState()
    const aktivni = getRole(resolveActiveRoleId(assignment))
    const zbyva = daysRemaining(assignment)

    console.info(
      `[role] uloženo: ${assignment.roleId} | platí: ${aktivni.id} (${aktivni.title})` +
        ` | do: ${formatValidUntil(assignment.validUntil)}` +
        (zbyva === null ? '' : ` | zbývá dní: ${zbyva}`)
    )
  }

  window.buddyRole = {
    grant: (roleId, dny = null) => {
      useRoleStore.getState().grantRole(roleId, dny ?? null)
      vypis()
    },
    revoke: () => {
      useRoleStore.getState().revokeRole()
      vypis()
    },
    stav: vypis,
    seznam: () => {
      for (const role of ALL_ROLES) {
        console.info(
          `[role] ${role.id.padEnd(10)} ${role.icon} ${role.title} —` +
            ` oprávnění: ${role.permissions.join(', ')}`
        )
      }
    },
  }

  console.info(
    '[role] Vývojářská vrátka jsou zapnutá. Zkus buddyRole.seznam() nebo' +
      " buddyRole.grant('admin')."
  )
}
