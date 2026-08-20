import { supabase } from '@/core/supabase/client'
import { useAccount } from '@/core/supabase/auth'
import { useRoleStore } from './useRoleStore'
import { isKnownRoleId } from './registry'
import { DEFAULT_ASSIGNMENT } from './roleUtils'

// ==========================================
// Role ze serveru.
//
// Dosud žila role jen v prohlížeči, kde si ji uživatel mohl přepsat.
// Od chvíle, kdy se podle ní řídí moderace, to nestačí: o tom, kdo smí
// číst cizí hlášení, musí rozhodovat databáze.
//
// Tenhle soubor je ta změna vlastnictví — místní store se stává KOPIÍ
// toho, co říká server, ne zdrojem pravdy. Kdo si stav v prohlížeči
// přepíše, uvidí sice v aplikaci jinou nálepku, ale k ničemu cizímu se
// nedostane: pravidla v databázi ho zastaví.
// ==========================================

/** Načte roli přihlášeného ze serveru a zapíše ji do místního storu. */
export const nactiRoliZeServeru = async (): Promise<void> => {
  if (!supabase) return

  const { userId } = useAccount.getState()
  if (!userId) {
    useRoleStore.setState({ assignment: DEFAULT_ASSIGNMENT })
    return
  }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role, valid_until, granted_at')
    .eq('user_id', userId)
    .maybeSingle()

  // Chyba sítě NENÍ důvod někomu sebrat roli, kterou už má uloženou —
  // offline by se z VIP rázem stal běžný uživatel. Necháváme, co je.
  if (error) return

  if (!data || !isKnownRoleId(data.role)) {
    useRoleStore.setState({ assignment: DEFAULT_ASSIGNMENT })
    return
  }

  useRoleStore.setState({
    assignment: {
      roleId: data.role,
      validUntil: data.valid_until,
      grantedAt: data.granted_at,
    },
  })
}

let sleduje = false

/**
 * Zapne udržování role podle serveru. Volá se jednou ze startu aplikace.
 *
 * Načítá se při každé změně přihlášení: po odhlášení musí role spadnout
 * na výchozí, jinak by po přihlášení jiného uživatele zůstala viset ta
 * předchozí.
 */
export const startRoleSync = (): void => {
  if (sleduje || !supabase) return
  sleduje = true

  let posledni: string | null = null

  useAccount.subscribe((stav) => {
    if (stav.userId === posledni) return
    posledni = stav.userId
    void nactiRoliZeServeru()
  })

  void nactiRoliZeServeru()
}
