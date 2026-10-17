/** Redundant local quest saves. Primary format stays compatible with v7.1.
 * Backup is checksum-verified; not a transaction or cloud synchronization. */
export interface QuestStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
interface Backup { version: 1; payload: string; checksum: number }
export function checksumQuest(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619) }
  return hash >>> 0
}
export function saveQuest(key: string, value: unknown, storage: QuestStorage): boolean {
  try {
    const payload = JSON.stringify(value)
    // Primary must be committed first. A backup must never contain a newer
    // quest state when the primary write has failed (e.g. quota or permissions).
    storage.setItem(key, payload)
    if (storage.getItem(key) !== payload) return false
    const backup: Backup = { version: 1, payload, checksum: checksumQuest(payload) }
    // Backup is best effort; primary is already durable at this point.
    try { storage.setItem(`${key}:backup-v1`, JSON.stringify(backup)) } catch { /* primary is valid */ }
    return true
  } catch { return false }
}
export function loadQuest<T>(key: string, validate: (raw: unknown) => T, storage: QuestStorage, isValid: (raw: unknown) => boolean): T {
  try {
    const primary = storage.getItem(key)
    if (primary !== null) {
      const raw: unknown = JSON.parse(primary)
      if (isValid(raw)) return validate(raw)
    }
  } catch { /* corrupted primary; attempt backup */ }
  try {
    const backupRaw = storage.getItem(`${key}:backup-v1`)
    if (backupRaw !== null) {
      const backup: unknown = JSON.parse(backupRaw)
      if (backup && typeof backup === 'object') {
        const b = backup as Partial<Backup>
        if (b.version === 1 && typeof b.payload === 'string' && typeof b.checksum === 'number' && checksumQuest(b.payload) === b.checksum) {
          const raw: unknown = JSON.parse(b.payload)
          if (isValid(raw)) {
            // Repair primary best-effort; return recovered state even if repair fails.
            try { storage.setItem(key, b.payload) } catch { /* read-only storage */ }
            return validate(raw)
          }
        }
      }
    }
  } catch { /* backup missing/corrupted */ }
  return validate(null)
}
export function validQuestShape(raw: unknown): boolean {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw) && typeof (raw as { faze?: unknown }).faze === 'string'
}
