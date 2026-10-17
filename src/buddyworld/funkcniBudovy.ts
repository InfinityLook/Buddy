import type { VillageProgress } from './villageProgress'

export type FunkcniBudovaId = 'dilna' | 'sklad' | 'vez'
export const FUNKCNI_BUDOVY = [
  { id: 'dilna', nazev: '🔨 Dílna', uroven: 2, drevo: 12, kamen: 8, krystaly: 0, popis: 'Snižuje cenu dřevěných receptů o 1 dřevo.' },
  { id: 'sklad', nazev: '📦 Sklad', uroven: 2, drevo: 10, kamen: 12, krystaly: 0, popis: 'Přidává 1 dřevo za každý vyzvednutý výrobní cyklus.' },
  { id: 'vez', nazev: '🛡️ Strážní věž', uroven: 3, drevo: 15, kamen: 15, krystaly: 2, popis: 'Přidává 1 kámen za vyhraný souboj.' },
] as const
export function overFunkcniBudovy(data: unknown): FunkcniBudovaId[] {
  return Array.isArray(data) ? FUNKCNI_BUDOVY.map(b => b.id).filter(id => data.includes(id)) : []
}
export function muzePostavitFunkcni(stav: VillageProgress, postavene: readonly FunkcniBudovaId[], id: FunkcniBudovaId): boolean {
  const b = FUNKCNI_BUDOVY.find(x => x.id === id)
  return !!b && !postavene.includes(id) && stav.uroven >= b.uroven && stav.drevo >= b.drevo && stav.kamen >= b.kamen && stav.krystaly >= b.krystaly
}
