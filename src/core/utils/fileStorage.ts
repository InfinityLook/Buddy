// ==========================================
// Úložiště obsahu souborů v IndexedDB.
//
// Metadata (název, velikost, datum) zůstávají v Zustand storu vedle
// zbytku aplikace, ale samotná data souboru tam patřit nemůžou —
// localStorage má limit kolem 5 MB a všechno v něm je text, takže by
// se pár fotek vešlo sotva. IndexedDB umí ukládat Bloby přímo
// a bez převodu na base64.
// ==========================================

const DB_NAME = 'schoolbuddy-files'
const STORE_NAME = 'blobs'
const DB_VERSION = 1

// Nad tímhle už soubor nebereme — ať jeden sken skript nezaplní celé
// úložiště zařízení a prohlížeč nezačne mazat data appky sám.
export const MAX_FILE_BYTES = 25 * 1024 * 1024

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB se nepodařilo otevřít.'))
  })

const withStore = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode)
      const request = action(tx.objectStore(STORE_NAME))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Operace se souborem selhala.'))
    })
  } finally {
    db.close()
  }
}

export const putFileBlob = (id: string, blob: Blob): Promise<unknown> =>
  withStore('readwrite', (store) => store.put(blob, id))

export const getFileBlob = async (id: string): Promise<Blob | null> => {
  const result = await withStore<Blob | undefined>('readonly', (store) => store.get(id))
  return result ?? null
}

export const deleteFileBlob = (id: string): Promise<unknown> =>
  withStore('readwrite', (store) => store.delete(id))

// Id souborů, ke kterým je obsah skutečně k dispozici. Používá se po
// obnově ze zálohy: metadata se zálohují, obsah souborů ne (JSON by
// s desítkami megabajtů v base64 přestal být použitelný), takže se
// může stát, že záznam existuje, ale obsah k němu chybí.
export const listStoredFileIds = async (): Promise<string[]> => {
  const keys = await withStore<IDBValidKey[]>('readonly', (store) => store.getAllKeys())
  return keys.map(String)
}
