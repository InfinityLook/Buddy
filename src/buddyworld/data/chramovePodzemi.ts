import type { Pozice2D } from '../types'
import { vzdalenostOdChramu } from './chramStrazcu'

/** Tři chrámové zkoušky; hráč musí aktivovat runy ve správném pořadí. */
export const CHRAMOVE_RUNY = [
  { id: 'svetlo', nazev: 'Runa světla', symbol: '✦', pozice: { x: 9.5, z: -13.5 } },
  { id: 'odvaha', nazev: 'Runa odvahy', symbol: '⚔', pozice: { x: 12, z: -15 } },
  { id: 'pamet', nazev: 'Runa paměti', symbol: '◈', pozice: { x: 14.5, z: -13.5 } },
] as const
export type ChramovaRunaId = typeof CHRAMOVE_RUNY[number]['id']
export const DOSAH_RUNY = 2.1
export const ODMENA_PODZEMI = { drevo: 0, kamen: 20, krystaly: 25 } as const
export const PODZEMI_PRIBEH = [
  'Kamenná podlaha se otevřela a pod oltářem se rozsvítila stará síň.',
  'Tři runy obnovily ochranný kruh. Ze tmy se však ozval hlas: „Pečeť slábne.“',
  'Buddy rozpoznal stopu bytosti uvězněné pod chrámem. Další cesta povede hlouběji.',
] as const

export function dalsiRuna(aktivovane: readonly string[]) {
  return CHRAMOVE_RUNY[aktivovane.length] ?? null
}
export function lzeAktivovatRunu(id: string, aktivovane: readonly string[], pozice: Pozice2D, chramHotov: boolean): boolean {
  const runa = dalsiRuna(aktivovane)
  return chramHotov && !!runa && runa.id === id && Math.hypot(pozice.x - runa.pozice.x, pozice.z - runa.pozice.z) <= DOSAH_RUNY
}
export function lzeDokoncitPodzemi(aktivovane: readonly string[], dokonceno: boolean, pozice: Pozice2D): boolean {
  return !dokonceno && aktivovane.length === CHRAMOVE_RUNY.length && vzdalenostOdChramu(pozice) <= 3.5
}
export function overRuny(hodnota: unknown): ChramovaRunaId[] {
  if (!Array.isArray(hodnota)) return []
  const platne: ChramovaRunaId[] = []
  for (const id of CHRAMOVE_RUNY.map(r => r.id)) {
    if (!hodnota.includes(id)) break
    platne.push(id)
  }
  return platne
}
export const overDokoncenePodzemi = (hodnota: unknown): boolean => hodnota === true
