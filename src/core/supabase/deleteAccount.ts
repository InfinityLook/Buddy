import { supabase } from './client'
import { useAccount } from './auth'
import { useAuthStore } from '@/core/store/useAuthStore'

// ==========================================
// Smazání účtu — klientská půlka. Serverovou půlku (soubory ve Storage,
// anonymizace, samotné smazání v auth.users) dělá api/delete-account.ts;
// klient jen pošle svůj token a po úspěchu uklidí, co zbylo v zařízení.
// ==========================================

export interface SmazaniVysledek {
  ok: boolean
  chyba?: string
}

/** Soukromé databáze v IndexedDB, které appka zakládá (obsah souborů, velké
 *  úložiště, historie záloh, offline kopie textů Library). */
const INDEXED_DB_NAZVY = ['schoolbuddy-store-data', 'schoolbuddy-files', 'schoolbuddy-backups', 'schoolbuddy-library-offline']

const smazIndexedDb = (nazev: string): Promise<void> =>
  new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(nazev)
      // I zablokované/neúspěšné smazání nesmí zadržet odhlášení.
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    } catch {
      resolve()
    }
  })

/** Po smazání účtu nemá na zařízení zůstat nic, co patřilo jemu — ani lokální
 *  kopie dat (na sdíleném zařízení by si je jinak mohl prohlédnout další). */
export const smazMistniData = async (): Promise<void> => {
  try {
    const klice: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const klic = localStorage.key(i)
      // schoolbuddy-* = všechny persistované stavy, sb-* = relace Supabase
      if (klic && (klic.startsWith('schoolbuddy-') || klic.startsWith('sb-'))) klice.push(klic)
    }
    klice.forEach((k) => localStorage.removeItem(k))
    sessionStorage.clear()
  } catch {
    /* úložiště nemusí být dostupné — zbytek úklidu pokračuje */
  }
  await Promise.all(INDEXED_DB_NAZVY.map(smazIndexedDb))
}

/**
 * Smaže účet přihlášeného uživatele. `email` je potvrzení — server ho
 * porovná s e-mailem účtu (u anonymního účtu bez e-mailu se nepoužije).
 */
export const smazatUcet = async (email: string): Promise<SmazaniVysledek> => {
  if (!supabase) return { ok: false, chyba: 'Účty nejsou v téhle verzi nastavené.' }

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, chyba: 'Nejdřív se přihlas.' }

  let odpoved: Response
  try {
    odpoved = await fetch('/api/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email }),
    })
  } catch {
    return { ok: false, chyba: 'Nepovedlo se spojit se serverem. Jsi online?' }
  }

  if (!odpoved.ok) {
    const telo = (await odpoved.json().catch(() => null)) as { chyba?: string } | null
    return { ok: false, chyba: telo?.chyba ?? 'Smazání se nepovedlo.' }
  }

  // Účet už neexistuje; signOut proto smí selhat (token je neplatný).
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
  useAuthStore.getState().logout()
  await smazMistniData()
  useAccount.setState({ status: 'anonymous', userId: null, email: null })
  return { ok: true }
}
