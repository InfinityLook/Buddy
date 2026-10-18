import type { Pozice2D } from '../types'
import { OBLASTI_SVETA } from './oblasti'

/** Jednorázové odměny za první návštěvu oblasti. */
export const ODMENY_ZA_OBJEVENTI = {
  ruiny: {drevo:0,kamen:4,krystaly:2},
  chram: {drevo:0,kamen:4,krystaly:3},
  vesnice: { drevo: 3, kamen: 0, krystaly: 0 },
  'kristalova-mytina': { drevo: 0, kamen: 0, krystaly: 2 },
  'stiny-lesa': { drevo: 2, kamen: 3, krystaly: 0 },
  'haj-strazce': { drevo: 0, kamen: 3, krystaly: 2 },
} as const

export type IdOblasti = keyof typeof ODMENY_ZA_OBJEVENTI
export function overObjeveneOblasti(vstup: unknown): IdOblasti[] {
  if (!Array.isArray(vstup)) return []
  return [...new Set(vstup.filter((id): id is IdOblasti => typeof id === 'string' && Object.hasOwn(ODMENY_ZA_OBJEVENTI, id)))].slice(0, OBLASTI_SVETA.length)
}
export function noveObjevenaOblast(pozice: Pozice2D, objevene: readonly string[]): IdOblasti | null {
  const oblast = OBLASTI_SVETA.find(o =>
    Math.hypot(pozice.x - o.stred.x, pozice.z - o.stred.z) <= o.polomer && !objevene.includes(o.id))
  return oblast && Object.hasOwn(ODMENY_ZA_OBJEVENTI, oblast.id) ? oblast.id as IdOblasti : null
}
