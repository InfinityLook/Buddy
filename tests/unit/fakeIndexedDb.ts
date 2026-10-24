// ==========================================
// Ruční, minimální náhražka window.indexedDB — jen pro testy, nikdy pro
// appku samotnou. jsdom (tests/setup.ts) žádné reálné IndexedDB
// nenabízí, a core/utils/fileStorage.ts i core/utils/backupHistory.ts
// volají indexedDB.open(...) přímo (ne přes appčin vlastní obal jako
// core/utils/indexedDbStorage.ts) — appka proto nemůže test postavit
// na mockování appčina modulu, musí napodobit tenhle jeden chybějící
// globál, ať appčin skutečný openDb()/withStore() kód doopravdy běží
// a test ověřuje JEHO, ne náhražku.
//
// Rozsah API je úzce omezený na to, co oba soubory doopravdy používají:
// open/onupgradeneeded/transaction/objectStore a na něm get/put/delete/
// getAll/getAllKeys. Žádná verze/upgrade logika, žádné indexy — appka
// je nikde nepotřebuje.
// ==========================================

interface FalesnyStoreData {
  keyPath?: string
  radky: Map<unknown, unknown>
}

interface FalesnaDatabaze {
  stores: Map<string, FalesnyStoreData>
}

type FalesnyRequest = {
  onsuccess: (() => void) | null
  onerror: (() => void) | null
  result: unknown
  error: unknown
}

// Výsledek se musí doplnit AŽ PO téhle synchronní funkci — appčin
// skutečný kód nastavuje request.onsuccess/.onerror hned po tom, co
// mu open()/get()/put()/... vrátí request objekt, ve stejném
// synchronním bloku. queueMicrotask zaručí, že se to stihne dřív, než
// náhražka výsledek doopravdy nastaví a handler zavolá — přesně to,
// co i skutečné IndexedDB (vždycky asynchronní) appce zaručuje.
const vytvorFalesnyRequest = (ziskejVysledek: () => unknown): FalesnyRequest => {
  const request: FalesnyRequest = { onsuccess: null, onerror: null, result: undefined, error: undefined }
  queueMicrotask(() => {
    try {
      request.result = ziskejVysledek()
      request.onsuccess?.()
    } catch (chyba) {
      request.error = chyba
      request.onerror?.()
    }
  })
  return request
}

const vytvorFalesnyStore = (data: FalesnyStoreData) => ({
  get: (klic: unknown) => vytvorFalesnyRequest(() => data.radky.get(klic)),
  put: (hodnota: unknown, klic?: unknown) =>
    vytvorFalesnyRequest(() => {
      // Store s keyPath (backupHistory.ts) čte klíč z hodnoty samé;
      // store bez keyPath (fileStorage.ts) ho dostává zvlášť jako
      // druhý argument — stejné rozlišení, jaké dělá i skutečné
      // IndexedDB.
      const skutecnyKlic = data.keyPath ? (hodnota as Record<string, unknown>)[data.keyPath] : klic
      data.radky.set(skutecnyKlic, hodnota)
      return skutecnyKlic
    }),
  delete: (klic: unknown) =>
    vytvorFalesnyRequest(() => {
      data.radky.delete(klic)
      return undefined
    }),
  getAll: () => vytvorFalesnyRequest(() => [...data.radky.values()]),
  getAllKeys: () => vytvorFalesnyRequest(() => [...data.radky.keys()]),
})

const vytvorFalesnouDb = (databaze: FalesnaDatabaze) => ({
  objectStoreNames: { contains: (nazev: string) => databaze.stores.has(nazev) },
  createObjectStore: (nazev: string, volby?: { keyPath?: string }) => {
    databaze.stores.set(nazev, { keyPath: volby?.keyPath, radky: new Map() })
  },
  transaction: (_nazevStoru: string, _mod: string) => ({
    objectStore: (nazev: string) => {
      const data = databaze.stores.get(nazev)
      if (!data) throw new Error(`Falešný object store "${nazev}" ještě neexistuje.`)
      return vytvorFalesnyStore(data)
    },
  }),
  close: () => {},
})

/**
 * Vytvoří novou, prázdnou náhražku indexedDB — appka ji dosadí do
 * globalThis.indexedDB v beforeEach, ať každý test začíná od čisté
 * tabule a data jednoho testu nikdy neprotečou do druhého.
 */
export const vytvorFalesneIndexedDB = () => {
  const vsechnyDatabaze = new Map<string, FalesnaDatabaze>()

  return {
    open: (nazev: string, _verze?: number) => {
      const request: FalesnyRequest & { onupgradeneeded: (() => void) | null } = {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        result: undefined,
        error: undefined,
      }
      queueMicrotask(() => {
        if (!vsechnyDatabaze.has(nazev)) vsechnyDatabaze.set(nazev, { stores: new Map() })
        request.result = vytvorFalesnouDb(vsechnyDatabaze.get(nazev)!)
        // Appčin vlastní createObjectStore() uvnitř obou souborů je
        // chráněný "if (!contains(...))", takže zavolat onupgradeneeded
        // při každém open() je bezpečné — nikdy nepřepíše už existující
        // store, jen při prvním otevření vytvoří ten, co ještě chybí.
        request.onupgradeneeded?.()
        request.onsuccess?.()
      })
      return request
    },
  }
}
