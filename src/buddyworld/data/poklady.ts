/** Jednorázové objevitelské truhly. Odměny jsou deterministické a uložené. */
export interface Poklad { id: string; x: number; z: number; drevo: number; kamen: number; krystaly: number }
export const POKLADY: readonly Poklad[] = [
  { id: 'vesnice-studna', x: 7, z: 9, drevo: 5, kamen: 2, krystaly: 0 },
  { id: 'lesni-koren', x: -16, z: -9, drevo: 4, kamen: 7, krystaly: 1 },
  { id: 'krystalovy-oltář', x: 5, z: 3, drevo: 0, kamen: 3, krystaly: 4 },
  { id: 'haj-strážce', x: 13, z: -13, drevo: 3, kamen: 5, krystaly: 5 },
]
export const overOtevrenePoklady = (data: unknown): string[] =>
  Array.isArray(data) ? [...new Set(data.filter((id): id is string =>
    typeof id === 'string' && POKLADY.some((poklad) => poklad.id === id)))] : []
export const lzeOtevritPoklad = (id: string, otevrene: readonly string[]): boolean =>
  POKLADY.some((poklad) => poklad.id === id) && !otevrene.includes(id)
