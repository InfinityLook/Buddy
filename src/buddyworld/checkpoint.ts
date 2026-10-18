import type { Pozice2D } from './types'
export const WORLD_RADIUS = 38
const KEY = 'buddyworld:checkpoint:v1'
export interface Checkpoint { pozice: Pozice2D; hp: number }
export function validCheckpoint(input: unknown): input is Checkpoint {
  if (!input || typeof input !== 'object') return false
  const c = input as Checkpoint
  return !!c.pozice && [c.pozice.x, c.pozice.z, c.hp].every(Number.isFinite)
    && Math.hypot(c.pozice.x, c.pozice.z) <= WORLD_RADIUS && c.hp > 0 && c.hp <= 1000
}
export function nactiCheckpoint(): Checkpoint | null {
  try { const c: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return validCheckpoint(c) ? c : null } catch {return null}
}
export function ulozCheckpoint(pozice: Pozice2D, hp: number): boolean {
  const c = {pozice, hp}
  if (!validCheckpoint(c)) return false
  try {localStorage.setItem(KEY, JSON.stringify(c)); return true} catch {return false}
}
