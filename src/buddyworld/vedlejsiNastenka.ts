/** První samostatný vedlejší úkol: prozkoumat dva body a vrátit se k nástěnce. */
export type StavStezky = { verze: 1; faze: 'nenabran' | 'aktivni' | 'kOdevzdani' | 'hotovo'; navstiveno: string[] }
export const KLIC_STEZKY = 'buddyworld-vedlejsi-stezka-v1'
export const ODMENA_STEZKY = { drevo: 12, kamen: 6 } as const
export const BODY_STEZKY = [
  { id: 'lucerna', nazev: 'Starý rozcestník', x: 8, z: 12 },
  { id: 'vyhlidka', nazev: 'Vyhlídka za vesnicí', x: -6, z: 12 },
] as const
export const DOSAH_BODU = 3
export function novyStavStezky(): StavStezky { return { verze: 1, faze: 'nenabran', navstiveno: [] } }
export function nactiStezku(storage: Pick<Storage, 'getItem'>): StavStezky {
  try {
    const raw = storage.getItem(KLIC_STEZKY)
    if (!raw) return novyStavStezky()
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object') return novyStavStezky()
    const s = data as Partial<StavStezky>
    if (s.verze !== 1 || !['nenabran','aktivni','kOdevzdani','hotovo'].includes(s.faze ?? '') || !Array.isArray(s.navstiveno)) return novyStavStezky()
    if (!s.navstiveno.every(id => typeof id === 'string' && BODY_STEZKY.some(b => b.id === id))) return novyStavStezky()
    return { verze: 1, faze: s.faze!, navstiveno: [...new Set(s.navstiveno)] }
  } catch { return novyStavStezky() }
}
export function ulozStezku(storage: Pick<Storage, 'setItem'>, stav: StavStezky): boolean {
  try { storage.setItem(KLIC_STEZKY, JSON.stringify(stav)); return true } catch { return false }
}
export function prijmiStezku(stav: StavStezky): StavStezky {
  return stav.faze === 'nenabran' ? { ...stav, faze: 'aktivni' } : stav
}
export function navstivBod(stav: StavStezky, pozice: {x:number;z:number}): StavStezky {
  if (stav.faze !== 'aktivni' || !Number.isFinite(pozice.x) || !Number.isFinite(pozice.z)) return stav
  const nove = BODY_STEZKY.filter(b => !stav.navstiveno.includes(b.id) && Math.hypot(pozice.x-b.x,pozice.z-b.z) <= DOSAH_BODU).map(b=>b.id)
  if (!nove.length) return stav
  const navstiveno = [...stav.navstiveno,...nove]
  return { ...stav, navstiveno, faze: navstiveno.length === BODY_STEZKY.length ? 'kOdevzdani' : 'aktivni' }
}
export function odevzdejStezku(stav: StavStezky, uNastenky: boolean): StavStezky {
  return stav.faze === 'kOdevzdani' && uNastenky ? { ...stav, faze: 'hotovo' } : stav
}
