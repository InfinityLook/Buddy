// ==========================================
// E2E šifrování Tajného chatu — čistá kryptografie, žádné volání na
// Supabase (to zůstává v api.ts, viz jeho hlavičkový komentář).
//
// ECDH (P-256) + AES-GCM, Web Crypto API. Server nikdy neuvidí ani
// soukromý klíč, ani odvozený symetrický klíč — jen veřejné klíče
// (tajne_klice) a šifrovaný text. Obě strany si stejný AES klíč odvodí
// nezávisle z vlastního soukromého + cizího veřejného klíče (vlastnost
// ECDH), takže se klíč k šifře nikdy nepřenáší po síti a admin, jediný
// s databázovým dohledem na tenhle chat, uvidí jen hatmatilku.
//
// Soukromý klíč žije v IndexedDB stejným způsobem jako obsah souborů
// ve fileStorage.ts — CryptoKey je strukturovaně klonovatelný typ,
// takže se dá uložit přímo, bez převodu na string. Jedna dvojice klíčů
// na zařízení, ne na účet: kdo appku smaže nebo přepne zařízení, ztratí
// přístup k šifře starých zpráv i schopnost číst nové, dokud si druhá
// strana nevšimne a chat nezaloží znovu — přijatelná ztráta, protože
// zprávy stejně samy mizí nejpozději za 12 h (viz CASOVACE_TAJNEHO_CHATU
// v types.ts), ne trvalá historie jako běžný chat.
// ==========================================

const DB_NAZEV = 'buddy-tajny-chat-klice'
const STORE_NAZEV = 'klice'
const DB_VERZE = 1
const KLIC_ID = 'muj-par'

interface UlozenyPar {
  soukromy: CryptoKey
  verejny: CryptoKey
}

const otevriDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const pozadavek = indexedDB.open(DB_NAZEV, DB_VERZE)

    pozadavek.onupgradeneeded = () => {
      const db = pozadavek.result
      if (!db.objectStoreNames.contains(STORE_NAZEV)) db.createObjectStore(STORE_NAZEV)
    }

    pozadavek.onsuccess = () => resolve(pozadavek.result)
    pozadavek.onerror = () => reject(pozadavek.error ?? new Error('IndexedDB se nepodařilo otevřít.'))
  })

const sKlicem = async <T>(
  mode: IDBTransactionMode,
  akce: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await otevriDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAZEV, mode)
      const pozadavek = akce(tx.objectStore(STORE_NAZEV))
      pozadavek.onsuccess = () => resolve(pozadavek.result)
      pozadavek.onerror = () => reject(pozadavek.error ?? new Error('Operace s klíčem selhala.'))
    })
  } finally {
    db.close()
  }
}

const bufferNaBase64 = (buf: ArrayBuffer): string => {
  const bajty = new Uint8Array(buf)
  let binarni = ''
  for (const b of bajty) binarni += String.fromCharCode(b)
  return btoa(binarni)
}

const base64NaBuffer = (base64: string): ArrayBuffer => {
  const binarni = atob(base64)
  const bajty = new Uint8Array(binarni.length)
  for (let i = 0; i < binarni.length; i++) bajty[i] = binarni.charCodeAt(i)
  return bajty.buffer
}

/**
 * Vrátí klíčový pár tohoto zařízení — z IndexedDB, nebo nově vygenerovaný
 * napoprvé. `extractable: true` platí pro OBĚ poloviny páru (Web Crypto
 * nemá způsob, jak nastavit exportovatelnost jen jedné z nich) — veřejnou
 * půlku to musí umožnit, ať jde nahrát na server; soukromá se z appky
 * exportuje jen tady, nikdy nikam neodchází.
 */
export const zajistiKlicovyPar = async (): Promise<UlozenyPar> => {
  const existujici = await sKlicem<UlozenyPar | undefined>('readonly', (store) => store.get(KLIC_ID))
  if (existujici) return existujici

  const par = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
  const ulozeny: UlozenyPar = { soukromy: par.privateKey, verejny: par.publicKey }
  await sKlicem('readwrite', (store) => store.put(ulozeny, KLIC_ID))
  return ulozeny
}

export const exportujVerejnyKlic = (verejny: CryptoKey): Promise<string> =>
  crypto.subtle.exportKey('spki', verejny).then(bufferNaBase64)

export const naimportujVerejnyKlic = (base64: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('spki', base64NaBuffer(base64), { name: 'ECDH', namedCurve: 'P-256' }, true, [])

/** Sdílený AES klíč pro tuhle dvojici — obě strany dostanou stejný,
 *  aniž by si ho kdy poslaly. */
export const odvodSdilenyKlic = (soukromy: CryptoKey, druhyVerejny: CryptoKey): Promise<CryptoKey> =>
  crypto.subtle.deriveKey(
    { name: 'ECDH', public: druhyVerejny },
    soukromy,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

export const zasifrujZpravu = async (
  klic: CryptoKey,
  text: string
): Promise<{ cifra: string; iv: string }> => {
  // 12 bajtů je doporučená délka IV pro AES-GCM — náhodné pokaždé znovu,
  // ať se stejný otevřený text nikdy nezašifruje na stejnou hatmatilku.
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(text)
  const sifra = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, klic, data)
  return { cifra: bufferNaBase64(sifra), iv: bufferNaBase64(iv.buffer) }
}

/** `null` znamená "nejde dešifrovat" — špatný/chybějící klíč, poškozená
 *  data. Volající to má zobrazit jako chybu, ne appku shodit. */
export const odsifrujZpravu = async (
  klic: CryptoKey,
  cifra: string,
  iv: string
): Promise<string | null> => {
  try {
    const otevrena = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64NaBuffer(iv) },
      klic,
      base64NaBuffer(cifra)
    )
    return new TextDecoder().decode(otevrena)
  } catch {
    return null
  }
}
