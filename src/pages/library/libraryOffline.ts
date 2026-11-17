import type { Kapitola } from './libraryTextTypes'

// ==========================================
// Library — trvalá offline kopie textu děl v IndexedDB. Text kapitol je
// veřejný obsah katalogu (ne soukromá data), proto je uložený čitelně;
// nepatří do záloh a při smazání účtu se databáze maže s ostatními.
// Kopie je odvozená: kdykoli ji jde stáhnout znovu, takže poškozená nebo
// chybějící kopie nikdy nic neblokuje.
// ==========================================

export const OFFLINE_DB_NAZEV = 'schoolbuddy-library-offline'
const STORE = 'texty'
/** Kolik děl se drží offline; nejdéle nečtené se při překročení zahodí. */
export const MAX_OFFLINE_DIL = 12

export interface OfflineZaznam {
  workId: string
  versionId: string
  kapitoly: Kapitola[]
  savedAt: number
}

/** Z kopií vybere ty, které se mají smazat, aby jich zbylo nejvýše `limit` (nejstarší pryč). */
export const vyberKeSmazani = (zaznamy: readonly Pick<OfflineZaznam, 'workId' | 'savedAt'>[], limit: number): string[] =>
  [...zaznamy]
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(Math.max(0, limit))
    .map((z) => z.workId)

/** Struktura načtená z IndexedDB nemusí být důvěryhodná — vrací jen úplný záznam. */
export const overOfflineZaznam = (raw: unknown): OfflineZaznam | null => {
  if (!raw || typeof raw !== 'object') return null
  const z = raw as Partial<OfflineZaznam>
  if (typeof z.workId !== 'string' || typeof z.versionId !== 'string' || !Array.isArray(z.kapitoly)) return null
  for (const k of z.kapitoly) {
    if (!k || typeof k.position !== 'number' || typeof k.title !== 'string' || !Array.isArray(k.bloky)) return null
  }
  return { workId: z.workId, versionId: z.versionId, kapitoly: z.kapitoly, savedAt: typeof z.savedAt === 'number' ? z.savedAt : 0 }
}

const jeDostupne = (): boolean => typeof indexedDB !== 'undefined'

const otevri = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAZEV, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'workId' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB se nepodařilo otevřít.'))
  })

const spust = async <T>(mod: IDBTransactionMode, akce: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await otevri()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = akce(db.transaction(STORE, mod).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('Operace nad IndexedDB selhala.'))
    })
  } finally {
    db.close()
  }
}

export async function nactiTextOffline(workId: string): Promise<OfflineZaznam | null> {
  if (!jeDostupne()) return null
  try {
    return overOfflineZaznam(await spust('readonly', (s) => s.get(workId)))
  } catch {
    return null
  }
}

export async function seznamOffline(): Promise<OfflineZaznam[]> {
  if (!jeDostupne()) return []
  try {
    const vse = await spust<unknown[]>('readonly', (s) => s.getAll())
    return vse.map(overOfflineZaznam).filter((z): z is OfflineZaznam => z !== null)
  } catch {
    return []
  }
}

export async function smazTextOffline(workId: string): Promise<void> {
  if (!jeDostupne()) return
  try {
    await spust('readwrite', (s) => s.delete(workId))
  } catch {
    // chybějící kopie je v pořádku
  }
}

/** Uloží (nebo obnoví) kopii a udrží limit počtu děl. Chyby se nikdy nešíří — offline kopie je bonus. */
export async function ulozTextOffline(workId: string, versionId: string, kapitoly: readonly Kapitola[]): Promise<boolean> {
  if (!jeDostupne()) return false
  try {
    const zaznam: OfflineZaznam = { workId, versionId, kapitoly: [...kapitoly], savedAt: Date.now() }
    await spust('readwrite', (s) => s.put(zaznam))
    const vse = await seznamOffline()
    for (const id of vyberKeSmazani(vse, MAX_OFFLINE_DIL)) await smazTextOffline(id)
    return true
  } catch {
    return false
  }
}
