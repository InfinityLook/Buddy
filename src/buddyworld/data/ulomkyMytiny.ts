import type { Pozice2D } from '../types'
import { OBLASTI_SVETA } from './oblasti'

/** Jednorázové sběratelské úlomky Křišťálové mýtiny (prototyp Season 1). */
const stred = OBLASTI_SVETA.find(o => o.id === 'kristalova-mytina')!.stred
export const ULOMKY_MYTINY = [
  { id: 'mytina-ulomek-1', pozice: { x: stred.x - 1.8, z: stred.z - 1.2 } },
  { id: 'mytina-ulomek-2', pozice: { x: stred.x + 1.7, z: stred.z - 0.8 } },
  { id: 'mytina-ulomek-3', pozice: { x: stred.x + 0.3, z: stred.z + 1.9 } },
] as const
export const DOSAH_ULOMKU = 2.1
export const ODMENA_ULOMKU = 1
export const KLIC_ULOMKU = 'buddyworld-mytina-ulomky-v1'
export function nejblizsiUlomek(pozice: Pozice2D, sebrane: readonly string[]) {
  return ULOMKY_MYTINY.find(u => !sebrane.includes(u.id) && Math.hypot(pozice.x-u.pozice.x, pozice.z-u.pozice.z) <= DOSAH_ULOMKU) ?? null
}
export function validujSebraneUlomky(hodnota: unknown): string[] {
  if (!Array.isArray(hodnota)) return []
  const povolene = new Set<string>(ULOMKY_MYTINY.map(u => u.id))
  return [...new Set(hodnota.filter((v): v is string => typeof v === 'string' && povolene.has(v)))]
}
export function nactiSebraneUlomky(): string[] {
  try { return validujSebraneUlomky(JSON.parse(localStorage.getItem(KLIC_ULOMKU) ?? '[]')) } catch { return [] }
}
export function ulozSebraneUlomky(sebrane: readonly string[]) {
  try { localStorage.setItem(KLIC_ULOMKU, JSON.stringify(validujSebraneUlomky(sebrane))) } catch { /* soukromý režim */ }
}
