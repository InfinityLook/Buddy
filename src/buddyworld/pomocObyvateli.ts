/** Vedlejší úkol: doručit zprávu obyvateli poblíž vesnice a vrátit se k nástěnce. */
export type StavPomoci = 'nenabran' | 'aktivni' | 'navstiven' | 'hotovo'
export const KLIC_POMOCI = 'buddyworld-pomoc-obyvateli-v1'
export const CIL_POMOCI = { x: -4, z: 14 } as const
export const ODMENA_POMOCI = { drevo: 5, kamen: 4 } as const
export const DOSAH_POMOCI = 2.8
export function nactiPomoc(storage: Pick<Storage, 'getItem'>): StavPomoci {
  try { const s = storage.getItem(KLIC_POMOCI); return s === 'aktivni' || s === 'navstiven' || s === 'hotovo' ? s : 'nenabran' } catch { return 'nenabran' }
}
export function ulozPomoc(storage: Pick<Storage, 'setItem'>, stav: StavPomoci): boolean {
  try { storage.setItem(KLIC_POMOCI, stav); return true } catch { return false }
}
export function prijmiPomoc(stav: StavPomoci): StavPomoci { return stav === 'nenabran' ? 'aktivni' : stav }
export function navstivObyvatele(stav: StavPomoci, pozice: {x:number;z:number}): StavPomoci {
  return stav === 'aktivni' && Number.isFinite(pozice.x) && Number.isFinite(pozice.z) && Math.hypot(pozice.x-CIL_POMOCI.x, pozice.z-CIL_POMOCI.z) <= DOSAH_POMOCI ? 'navstiven' : stav
}
export function odevzdejPomoc(stav: StavPomoci, uNastenky: boolean): StavPomoci { return stav === 'navstiven' && uNastenky ? 'hotovo' : stav }
