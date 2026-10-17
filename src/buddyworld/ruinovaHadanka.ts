/** v10.1: Hádanka ruin; žádné externí assety, žádná opakovatelná odměna. */
import { RUINY_POZICE } from './scene/zapomenuteRuiny3D'
export const KLIC_RUINY = 'buddyworld:ruiny-hadanka:v1'
export const DOSAH_RUIN = 3.4
export const RUNY = ['koreny', 'svetlo', 'pamet'] as const
export type RunaId = typeof RUNY[number]
export type StavRuin = { poradi: RunaId[]; dokonceno: boolean }
export const NOVY_STAV_RUIN: StavRuin = { poradi: [], dokonceno: false }
export const RUNOVE_NAZVY: Record<RunaId, string> = { koreny: '🌿 Kořeny', svetlo: '✨ Světlo', pamet: '💠 Paměť' }
export function vDosahuRuin(p: {x:number; z:number}): boolean {
  return Number.isFinite(p.x) && Number.isFinite(p.z) && Math.hypot(p.x-RUINY_POZICE.x,p.z-RUINY_POZICE.z) <= DOSAH_RUIN
}
export function overStavRuin(value: unknown): StavRuin {
  if (!value || typeof value !== 'object') return { ...NOVY_STAV_RUIN }
  const v = value as Record<string, unknown>
  if (v.dokonceno === true) return { poradi: [...RUNY], dokonceno: true }
  if (!Array.isArray(v.poradi) || v.poradi.length >= RUNY.length || !v.poradi.every((id,i) => id === RUNY[i])) return { ...NOVY_STAV_RUIN }
  return { poradi: [...v.poradi], dokonceno: false }
}
export function stiskniRunu(stav: StavRuin, id: RunaId): StavRuin {
  if (stav.dokonceno) return stav
  const poradi = id === RUNY[stav.poradi.length] ? [...stav.poradi, id] : []
  return { poradi, dokonceno: poradi.length === RUNY.length }
}
export function nactiRuiny(): StavRuin {
  try { return overStavRuin(JSON.parse(localStorage.getItem(KLIC_RUINY) ?? 'null')) } catch { return { ...NOVY_STAV_RUIN } }
}
export function ulozRuiny(stav: StavRuin): boolean {
  try {
    const text = JSON.stringify(overStavRuin(stav))
    localStorage.setItem(KLIC_RUINY,text)
    return localStorage.getItem(KLIC_RUINY) === text
  } catch { return false }
}
