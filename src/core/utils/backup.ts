import { secureStorage } from './secureStorage'
import { validateBackupEnvelope, BackupEnvelope } from './backupValidation'
import { validateAppsData } from './validation'

// ==========================================
// Záloha a obnova VŠECH dat aplikace.
//
// SchoolBuddy nemá backend, takže tenhle soubor je jediná cesta, jak si
// uživatel data odnese na jiné zařízení nebo je zachrání před vymazáním
// úložiště prohlížeče. Dřív se exportoval jen seznam dlaždic (`apps`),
// takže záloha ve skutečnosti neobsahovala nic z toho, co uživatel
// vytvořil — úkoly, poznámky, kartičky ani XP.
// ==========================================

export const BACKUP_FORMAT = 'schoolbuddy-backup'
export const BACKUP_VERSION = 1

type StorageKind = 'secure' | 'raw'

interface BackupStore {
  key: string
  storage: StorageKind
  label: string
  // false = do souboru se store zabalí, ale zpátky se nikdy nezapíše.
  // Výchozí je true.
  restorable?: boolean
}

// Katalog všeho, co se zálohuje. Když přibude miniaplikace s vlastním
// persist storem, musí se její klíč přidat i sem — jinak její data
// ze zálohy tiše vypadnou.
//
// Záměrně tu NENÍ 'schoolbuddy-auth-storage': obnova zálohy nemá uživatele
// přihlašovat ani odhlašovat, to je stav zařízení, ne jeho data.
export const BACKUP_STORES: BackupStore[] = [
  { key: 'schoolbuddy-app-storage', storage: 'secure', label: 'Aplikace' },
  // XP, úroveň, série a odznaky jsou vydřený postup, ne nastavení. Obnova
  // ze starší zálohy by ho vrátila zpátky a uživatel by o rozdíl přišel,
  // takže se sice zálohují (soubor má být věrný snímek), ale nikdy se
  // nezapisují zpět.
  { key: 'schoolbuddy-gamification-storage', storage: 'secure', label: 'XP a odznaky', restorable: false },
  { key: 'schoolbuddy-study-planner-storage', storage: 'secure', label: 'Planer' },
  { key: 'schoolbuddy-quick-notes-storage', storage: 'secure', label: 'Quick Notes' },
  { key: 'schoolbuddy-flashcards-storage', storage: 'secure', label: 'Flashcards' },
  { key: 'schoolbuddy-goal-tracker-storage', storage: 'secure', label: 'Goal Tracker' },
  { key: 'schoolbuddy-mind-map-storage', storage: 'secure', label: 'Mind Map' },
  { key: 'schoolbuddy-file-manager-storage', storage: 'secure', label: 'File Manager' },
  { key: 'schoolbuddy-document-editor-storage', storage: 'secure', label: 'Textový editor' },
  { key: 'schoolbuddy-finance-storage', storage: 'secure', label: 'Finance' },
  { key: 'schoolbuddy-form-check-storage', storage: 'secure', label: 'Form Check' },
  { key: 'schoolbuddy-examprep-storage', storage: 'secure', label: 'Maturitní centrum' },
  { key: 'schoolbuddy-pomodoro-storage', storage: 'secure', label: 'Pomodoro' },
  { key: 'schoolbuddy-math-solver-storage', storage: 'secure', label: 'Math Solver' },
  { key: 'schoolbuddy-game-character-storage', storage: 'secure', label: 'Herní postavy' },
  { key: 'schoolbuddy-quest-storage', storage: 'secure', label: 'Herní questy' },
  { key: 'schoolbuddy-inventar-storage', storage: 'secure', label: 'Herní batoh' },
  { key: 'schoolbuddy-vybaveni-storage', storage: 'secure', label: 'Herní vybavení' },
  { key: 'schoolbuddy-profile-storage', storage: 'secure', label: 'Profil' },
  // Na rozdíl od role/kreditů níž je restorable: true bezpečné i pro
  // VIP vzhled — resolveActiveThemeId (core/theme/themes.ts) ověřuje
  // oprávnění znovu při každém použití, takže obnovená volba VIP
  // vzhledu bez skutečného VIP prostě zůstane nepoužitá, ne aplikovaná.
  { key: 'schoolbuddy-theme-storage', storage: 'secure', label: 'Vzhled aplikace' },
  // Role a kredity stojí (nebo budou stát) peníze. Do zálohy patří, aby
  // byla věrným snímkem, ale zpátky se nikdy nezapisují — jinak by stačilo
  // upravit si vyexportovaný JSON a naimportovat si VIP zadarmo. Rozhodovat
  // o nich stejně musí server, tohle je jen kopie pro vykreslení.
  { key: 'schoolbuddy-role-storage', storage: 'secure', label: 'Role účtu', restorable: false },
  { key: 'schoolbuddy-wallet-storage', storage: 'secure', label: 'Kredity', restorable: false },
  // Klíč, pod kterým profil ležel dřív. V katalogu zůstává kvůli zálohám
  // vytvořeným před převodem profilu na Zustand — po obnově se aplikace
  // načte znovu a useProfileData si data ze starého klíče přenese samo.
  { key: 'buddy_profile_v1', storage: 'raw', label: 'Profil (starší záloha)' },
]

// Pozor: u File Manageru se zálohují jen metadata souborů. Samotný obsah
// leží v IndexedDB (viz core/utils/fileStorage.ts) a do JSON zálohy se
// nedává — pár fotek by v base64 udělalo ze zálohy soubor, se kterým se
// nedá pracovat. Po obnově na jiném zařízení proto záznamy existují,
// ale File Manager u nich poctivě hlásí, že obsah chybí.

const readStore = (store: BackupStore): string | null =>
  store.storage === 'secure' ? secureStorage.getItem(store.key) as string | null : localStorage.getItem(store.key)

const writeStore = (store: BackupStore, value: string): void => {
  if (store.storage === 'secure') secureStorage.setItem(store.key, value)
  else localStorage.setItem(store.key, value)
}

// Posbírá aktuální stav všech storů do jedné obálky.
// Hodnoty ukládáme rozparsované, aby výsledný JSON byl čitelný a nebyl
// to jen jeden dlouhý zaescapovaný řetězec.
export const collectFullBackup = (): BackupEnvelope => {
  const data: Record<string, unknown> = {}

  for (const store of BACKUP_STORES) {
    const raw = readStore(store)
    if (raw === null) continue // store, do kterého uživatel ještě nesáhl

    try {
      data[store.key] = JSON.parse(raw)
    } catch {
      console.warn(`Store ${store.key} nešel rozparsovat, do zálohy ho nedávám.`)
    }
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: __APP_VERSION__,
    data,
  }
}

// Exportuje data ze storu do JSON souboru a spustí stažení
export const exportDataToJson = (data: unknown, filename = 'schoolbuddy-backup.json') => {
  try {
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return true
  } catch (error) {
    console.error('Chyba při exportu dat:', error)
    return false
  }
}

// Stáhne kompletní zálohu (všechny story) jako jeden soubor
export const exportFullBackup = (): boolean =>
  exportDataToJson(
    collectFullBackup(),
    `schoolbuddy-zaloha-${new Date().toISOString().slice(0, 10)}.json`
  )

// Načte JSON soubor vybraný uživatelem
export const importDataFromJson = <T>(file: File): Promise<T> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const parsed = JSON.parse(content) as T
        resolve(parsed)
      } catch {
        reject(new Error('Soubor není platný JSON.'))
      }
    }

    reader.onerror = () => reject(new Error('Chyba při čtení souboru.'))
    reader.readAsText(file)
  })
}

// Popisky částí, které se z principu neobnovují — pro hlášku uživateli
export const NON_RESTORABLE_LABELS = BACKUP_STORES.filter((s) => s.restorable === false).map(
  (s) => s.label
)

export interface RestoreResult {
  success: boolean
  // Starý formát zálohy obsahoval jen seznam dlaždic — načteme ho dál,
  // ať uživatelům dřívější zálohy nepřestanou fungovat.
  legacy: boolean
  restored: string[]
  error?: string
}

// Zapíše zálohu zpátky do úložiště. Volající pak musí aplikaci znovu
// načíst — Zustand story už jsou v paměti zrehydratované a samy by si
// nových hodnot nevšimly.
export const restoreFullBackup = (incoming: unknown): RestoreResult => {
  const envelope = validateBackupEnvelope(incoming)

  if (envelope.success) {
    const restored: string[] = []

    for (const store of BACKUP_STORES) {
      if (store.restorable === false) continue

      const value = envelope.data.data[store.key]
      if (value === undefined) continue

      try {
        writeStore(store, JSON.stringify(value))
        restored.push(store.label)
      } catch (error) {
        console.error(`Store ${store.key} se nepodařilo obnovit:`, error)
      }
    }

    if (restored.length === 0) {
      return { success: false, legacy: false, restored: [], error: 'Záloha neobsahuje žádná data.' }
    }

    return { success: true, legacy: false, restored }
  }

  // Fallback na starý formát { apps: [...] }
  const rawApps =
    typeof incoming === 'object' && incoming !== null && 'apps' in incoming
      ? (incoming as { apps: unknown }).apps
      : incoming

  const appsValidation = validateAppsData(rawApps)
  if (!appsValidation.success || !appsValidation.data) {
    return {
      success: false,
      legacy: false,
      restored: [],
      error: 'Soubor není platná záloha SchoolBuddy.',
    }
  }

  // Starou zálohu zapíšeme do stejné obálky, jakou používá Zustand persist.
  const appStore = BACKUP_STORES[0]
  writeStore(
    appStore,
    JSON.stringify({ state: { apps: appsValidation.data, activeAppId: null, returnPath: null }, version: 1 })
  )

  return { success: true, legacy: true, restored: [appStore.label] }
}
