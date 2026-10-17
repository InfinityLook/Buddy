/** Elara: první příběhový milník. Bez odměny a bez změny hlavní výpravy. */
export type ElaraFaze = 'nezahajeno' | 'pátrání' | 'odhaleno'
const KEY = 'buddyworld-elara-pribeh-v1'
export function elaraFaze(zajemOHistorii: boolean, kristalovaVypravaDokoncena: boolean): ElaraFaze {
  if (!zajemOHistorii) return 'nezahajeno'
  return kristalovaVypravaDokoncena ? 'odhaleno' : 'pátrání'
}
export function elaraText(faze: ElaraFaze): string {
  switch (faze) {
    case 'nezahajeno': return 'Zeptej se Elary na historii staré osady.'
    case 'pátrání': return 'Elara: Staré záznamy ukazují na krystalovou mýtinu. Dokonči krystalovou výpravu a vrať se za mnou.'
    case 'odhaleno': return 'Elara: Světlo krystalů stále žije. Tvůj průzkum potvrdil, že se osada může znovu probudit.'
  }
}
/** Jednorázové zapsání objevu; zápis nikdy nepřidává zdroje ani XP. */
export function zapisElaraObjev(storage: Pick<Storage, 'getItem' | 'setItem'>, splneno: boolean): boolean {
  if (!splneno) return false
  try {
    if (storage.getItem(KEY) === 'odhaleno') return true
    storage.setItem(KEY, 'odhaleno')
    return storage.getItem(KEY) === 'odhaleno'
  } catch { return false }
}
export function nactiElaraObjev(storage: Pick<Storage, 'getItem'>): boolean {
  try { return storage.getItem(KEY) === 'odhaleno' } catch { return false }
}
