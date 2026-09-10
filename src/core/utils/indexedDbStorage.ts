import { StateStorage } from 'zustand/middleware'
import { decryptData, encryptData } from './secureStorage'

// ==========================================
// Zustandův Storage adaptér nad IndexedDB, ne localStorage.
//
// secureStorage.ts drží každý perzistovaný store jako jeden klíč
// v localStorage — funguje dobře pro malé věci, ale localStorage má
// praktický strop kolem 5 MB a je čistě synchronní/textový. Economy
// Room's reálná finanční historie (roky transakcí, rozpočty, cíle) je
// přesně ten případ, co může localStorage skutečně vyčerpat, stejný
// důvod, proč File Manager/Music Studio ukládají obsah souborů do
// IndexedDB, ne do localStorage (viz fileStorage.ts).
//
// Jeden sdílený IndexedDB "key-value" object store (ne jedna databáze
// na perzistovaný store) — každý Zustandův store (podle svého vlastního
// `name`, např. 'schoolbuddy-finance-storage') je jeden klíč v tomhle
// jednom object store, stejná "jeden klíč = jeden store" struktura, jakou
// secureStorage.ts už má nad localStorage, jen jiný stroj pod tím.
//
// (De)obfuskace zůstává stejná jako u secureStorage.ts — sdílené funkce
// z toho souboru, ne druhá kopie stejného klíče, co by šla omylem rozejít.
// Pořád jde jen o obfuskaci, ne o skutečné šifrování (stejné upozornění
// jako u secureStorage.ts samotného).
// ==========================================

const DB_NAME = 'schoolbuddy-store-data'
const STORE_NAME = 'kv'
const DB_VERSION = 1

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
      request.onerror = () => reject(request.error ?? new Error('Operace nad IndexedDB selhala.'))
    })
  } finally {
    db.close()
  }
}

export const indexedDbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const item = await withStore<string | undefined>('readonly', (store) => store.get(name))
    if (!item) return null
    try {
      return decryptData(item)
    } catch {
      return item
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await withStore('readwrite', (store) => store.put(encryptData(value), name))
  },
  removeItem: async (name: string): Promise<void> => {
    await withStore('readwrite', (store) => store.delete(name))
  },
}
