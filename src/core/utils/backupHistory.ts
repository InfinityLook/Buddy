import { BackupEnvelope } from './backupValidation'
import { collectFullBackup } from './backup'

// ==========================================
// Historie záloh přímo v aplikaci.
//
// Stažený soubor je fajn, ale uživatel ho typicky nikdy neudělá — a když
// si omylem smaže poznámky, nemá se kam vrátit. Aplikace si proto sama
// drží posledních pár snímků a nabídne je k obnově.
//
// Snímky žijí v IndexedDB, ne v localStorage: jedna záloha obsahuje
// všechna data aplikace, takže by se pět kopií do pětimegabajtového
// limitu localStorage nevešlo.
// ==========================================

const DB_NAME = 'schoolbuddy-backups'
const STORE_NAME = 'snapshots'
const DB_VERSION = 1

// Kolik snímků si držíme. Víc už jen zabírá místo — starší záloha
// bývá stejně nepoužitelně stará.
export const MAX_SNAPSHOTS = 5

// Jak často se pořizuje automatický snímek
const AUTO_SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1000

export type SnapshotSource = 'auto' | 'manual' | 'file' | 'before-restore'

export interface BackupSnapshot {
  id: string
  createdAt: string
  appVersion: string
  sizeBytes: number
  source: SnapshotSource
  payload: BackupEnvelope
}

// Metadata bez samotných dat — do seznamu v UI netahá celé zálohy
export type SnapshotInfo = Omit<BackupSnapshot, 'payload'>

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
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
      request.onerror = () => reject(request.error ?? new Error('Operace se zálohou selhala.'))
    })
  } finally {
    db.close()
  }
}

const allSnapshots = async (): Promise<BackupSnapshot[]> => {
  const rows = await withStore<BackupSnapshot[]>('readonly', (store) => store.getAll())
  // Nejnovější nahoře
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** Seznam snímků pro UI — bez dat, jen metadata. */
export const listSnapshots = async (): Promise<SnapshotInfo[]> => {
  try {
    return (await allSnapshots()).map(({ payload: _payload, ...info }) => info)
  } catch (error) {
    console.warn('[backup] Historii záloh se nepodařilo načíst:', error)
    return []
  }
}

/** Vytáhne konkrétní snímek i s daty. */
export const getSnapshot = async (id: string): Promise<BackupSnapshot | null> => {
  try {
    const row = await withStore<BackupSnapshot | undefined>('readonly', (store) => store.get(id))
    return row ?? null
  } catch {
    return null
  }
}

export const deleteSnapshot = (id: string): Promise<unknown> =>
  withStore('readwrite', (store) => store.delete(id))

// Nechá jen MAX_SNAPSHOTS nejnovějších
const prune = async () => {
  const rows = await allSnapshots()
  const navic = rows.slice(MAX_SNAPSHOTS)
  await Promise.all(navic.map((row) => deleteSnapshot(row.id)))
}

/**
 * Uloží snímek do historie. `payload` se dá předat (u zálohy nahrané ze
 * souboru), jinak se sebere aktuální stav aplikace.
 */
export const saveSnapshot = async (
  source: SnapshotSource,
  payload?: BackupEnvelope
): Promise<SnapshotInfo | null> => {
  try {
    const envelope = payload ?? collectFullBackup()
    const serialized = JSON.stringify(envelope)

    const snapshot: BackupSnapshot = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      appVersion: envelope.appVersion,
      sizeBytes: new Blob([serialized]).size,
      source,
      payload: envelope,
    }

    await withStore('readwrite', (store) => store.put(snapshot))
    await prune()

    const { payload: _payload, ...info } = snapshot
    return info
  } catch (error) {
    console.warn('[backup] Snímek se nepodařilo uložit:', error)
    return null
  }
}

// Hlídá, že souběžná volání nevyrobí dva snímky naráz. React ve
// StrictMode spustí efekt dvakrát a obě volání by stihla projít kontrolou
// dřív, než kterékoli z nich zapíše.
let autoSnapshotRunning: Promise<void> | null = null

/**
 * Pořídí automatický snímek, pokud od posledního uplynul den.
 * Volá se při otevření Hubu — bez toho by historie u většiny uživatelů
 * zůstala prázdná, protože zálohu ručně nikdo nedělá.
 */
export const autoSnapshotIfDue = (): Promise<void> => {
  if (!autoSnapshotRunning) {
    autoSnapshotRunning = runAutoSnapshot().finally(() => {
      autoSnapshotRunning = null
    })
  }
  return autoSnapshotRunning
}

const runAutoSnapshot = async (): Promise<void> => {
  try {
    const rows = await allSnapshots()
    const posledniAuto = rows.find((row) => row.source === 'auto')
    const jeCas =
      !posledniAuto ||
      Date.now() - new Date(posledniAuto.createdAt).getTime() >= AUTO_SNAPSHOT_INTERVAL_MS

    if (jeCas) {
      await saveSnapshot('auto')
      return // saveSnapshot prořezává sám
    }

    // I když se nový snímek nepořizuje, zkontrolujeme limit — jinak by
    // se počet nikdy nesrovnal, kdyby ho něco obešlo nebo kdyby se
    // MAX_SNAPSHOTS časem snížilo.
    await prune()
  } catch (error) {
    console.warn('[backup] Automatický snímek se nepovedl:', error)
  }
}

// --- Pomocníci pro zobrazení ---

export const formatSnapshotSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const SNAPSHOT_SOURCE_LABEL: Record<SnapshotSource, string> = {
  auto: 'Automatická',
  manual: 'Ruční záloha',
  file: 'Ze souboru',
  'before-restore': 'Před obnovou',
}

export const formatSnapshotDate = (iso: string): string =>
  new Date(iso).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })
