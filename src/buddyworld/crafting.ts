import type { VillageProgress } from './villageProgress'

export type PredmetId = 'prkna' | 'kamenny_blok' | 'lucerna' | 'amulet'
export type Inventar = Record<PredmetId, number>
export const PRAZDNY_INVENTAR: Inventar = { prkna: 0, kamenny_blok: 0, lucerna: 0, amulet: 0 }
export interface Recept {
  id: PredmetId
  nazev: string
  minUroven: number
  drevo: number
  kamen: number
  krystaly: number
  popis: string
}
export const RECEPTY: readonly Recept[] = [
  { id: 'prkna', nazev: 'Dřevěná prkna', minUroven: 1, drevo: 3, kamen: 0, krystaly: 0, popis: 'Základní stavební materiál' },
  { id: 'kamenny_blok', nazev: 'Kamenný blok', minUroven: 1, drevo: 0, kamen: 3, krystaly: 0, popis: 'Pevný stavební materiál' },
  { id: 'lucerna', nazev: 'Lucerna', minUroven: 2, drevo: 2, kamen: 2, krystaly: 0, popis: 'Dekorace pro osadu' },
  { id: 'amulet', nazev: 'Magický amulet', minUroven: 4, drevo: 2, kamen: 3, krystaly: 2, popis: 'Vzácný magický předmět' },
]
export const muzeVyrobit = (stav: VillageProgress, recept: Recept): boolean =>
  stav.uroven >= recept.minUroven && stav.drevo >= recept.drevo &&
  stav.kamen >= recept.kamen && stav.krystaly >= recept.krystaly

export const vyrobPredmet = <T extends VillageProgress & { inventar: Inventar }>(stav: T, recept: Recept): T => {
  if (!muzeVyrobit(stav, recept) || stav.inventar[recept.id] >= 9999) return stav
  return {
    ...stav, drevo: stav.drevo - recept.drevo, kamen: stav.kamen - recept.kamen,
    krystaly: stav.krystaly - recept.krystaly,
    inventar: { ...stav.inventar, [recept.id]: stav.inventar[recept.id] + 1 },
  }
}
export const overInventar = (data: unknown): Inventar => {
  if (!data || typeof data !== 'object') return { ...PRAZDNY_INVENTAR }
  const d = data as Record<string, unknown>
  return Object.fromEntries(Object.keys(PRAZDNY_INVENTAR).map((id) => {
    const n = d[id]
    return [id, typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= 9999 ? n : 0]
  })) as Inventar
}
