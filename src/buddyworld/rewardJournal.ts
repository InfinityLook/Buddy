/** Durable, at-most-once reward reservation journal. NOT atomic with external stores. */
export interface JournalStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
export type StavOdmeny = 'nezahajeno' | 'rezervovano' | 'dokonceno' | 'neznamy'
/** Čte pouze přes getItem — appka proto bere jen `Pick<JournalStorage, 'getItem'>`, ne
 *  celé JournalStorage (to vyžaduje i setItem, co tahle funkce nikdy nevolá); appka tím
 *  dovolí i doopravdy read-only volajícímu (viz rewardDiagnostics.ts) poslat bezpečné
 *  úložiště bez setItem, a každé reálné JournalStorage sem pořád jde poslat beze změny. */
export function stavOdmeny(storage: Pick<JournalStorage, 'getItem'>, key: string): StavOdmeny {
  try {
    const value = storage.getItem(key)
    if (value === null) return 'nezahajeno'
    if (value === 'claimed' || value === 'done:v1') return 'dokonceno'
    if (value === 'pending:v1') return 'rezervovano'
    return 'neznamy'
  } catch { return 'neznamy' }
}
/** Reserve BEFORE side effects. A pending record is never replayed automatically. */
export function rezervujOdmenu(storage: JournalStorage, key: string): boolean {
  if (stavOdmeny(storage, key) !== 'nezahajeno') return false
  try {
    storage.setItem(key, 'pending:v1')
    return storage.getItem(key) === 'pending:v1'
  } catch { return false }
}
/** Best-effort finalization after resource and XP callbacks. */
export function dokonceniOdmeny(storage: JournalStorage, key: string): boolean {
  if (stavOdmeny(storage, key) !== 'rezervovano') return false
  try {
    storage.setItem(key, 'done:v1')
    return storage.getItem(key) === 'done:v1'
  } catch { return false }
}
