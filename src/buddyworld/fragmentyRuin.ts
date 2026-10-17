/** v10.2: Jednorázová příběhová výprava, bez farmitelné měny. */
import { RUINY_POZICE } from './scene/zapomenuteRuiny3D'
export const KLIC_FRAGMENTY_RUIN = 'buddyworld:fragmenty-ruin:v1'
export const DOSAH_FRAGMENTU = 2.5
export const FRAGMENTY_RUIN = [
  { id: 'kamen', nazev: 'Kamenná pečeť', x: RUINY_POZICE.x - 5, z: RUINY_POZICE.z + 3, pribeh: 'Pečeť nese znamení prvních strážců.' },
  { id: 'list', nazev: 'List paměti', x: RUINY_POZICE.x + 5, z: RUINY_POZICE.z + 4, pribeh: 'List uchoval jejich přísahu chránit les.' },
  { id: 'svit', nazev: 'Jiskra úsvitu', x: RUINY_POZICE.x + 1, z: RUINY_POZICE.z - 6, pribeh: 'Jiskra odhaluje cestu k dalšímu tajemství.' },
] as const
export type FragmentRuinId = typeof FRAGMENTY_RUIN[number]['id']
export function validujFragmentyRuin(v: unknown): FragmentRuinId[] {
  if (!Array.isArray(v)) return []
  const allowed = new Set<string>(FRAGMENTY_RUIN.map(f => f.id))
  return [...new Set(v.filter((id): id is FragmentRuinId => typeof id === 'string' && allowed.has(id)))]
}
export function fragmentVDosahu(p: {x:number; z:number}, collected: readonly string[], unlocked: boolean) {
  if (!unlocked || !Number.isFinite(p.x) || !Number.isFinite(p.z)) return null
  return FRAGMENTY_RUIN.find(f => !collected.includes(f.id) && Math.hypot(f.x-p.x,f.z-p.z) <= DOSAH_FRAGMENTU) ?? null
}
export function nactiFragmentyRuin(): FragmentRuinId[] {
  try { return validujFragmentyRuin(JSON.parse(localStorage.getItem(KLIC_FRAGMENTY_RUIN) ?? '[]')) } catch { return [] }
}
export function ulozFragmentyRuin(ids: readonly string[]): boolean {
  try {
    const text = JSON.stringify(validujFragmentyRuin(ids))
    localStorage.setItem(KLIC_FRAGMENTY_RUIN,text)
    return localStorage.getItem(KLIC_FRAGMENTY_RUIN) === text
  } catch { return false }
}
