/** Buddy World: data-driven weapon balancing, no UI or Three.js dependencies. */
export type Zbran = 'mec' | 'luk' | 'hul'
export interface ZbranDef { id: Zbran; nazev: string; dosah: number; cooldownMs: number; minPoskozeni: number; maxPoskozeni: number; minLevel: number }
export const ZBRANE: Record<Zbran, ZbranDef> = {
  mec: { id: 'mec', nazev: 'Meč', dosah: 1.8, cooldownMs: 650, minPoskozeni: 8, maxPoskozeni: 14, minLevel: 1 },
  luk: { id: 'luk', nazev: 'Luk', dosah: 7, cooldownMs: 1100, minPoskozeni: 6, maxPoskozeni: 11, minLevel: 3 },
  hul: { id: 'hul', nazev: 'Magická hůl', dosah: 5, cooldownMs: 1500, minPoskozeni: 12, maxPoskozeni: 20, minLevel: 5 },
}
export const dostupneZbrane = (level: number): ZbranDef[] =>
  Object.values(ZBRANE).filter(z => Number.isFinite(level) && level >= z.minLevel)
export const zbranJeDostupna = (id: Zbran, level: number): boolean => level >= ZBRANE[id].minLevel
export const poskozeniZbrane = (id: Zbran, nahodne: number): number => {
  const z = ZBRANE[id]
  const r = Math.max(0, Math.min(1, Number.isFinite(nahodne) ? nahodne : 0))
  return Math.round(z.minPoskozeni + r * (z.maxPoskozeni - z.minPoskozeni))
}

export const muzeUtokZbrani = (id: Zbran, level: number, vzdalenost: number, posledniUtokMs: number, casMs: number): boolean =>
  zbranJeDostupna(id, level) && Number.isFinite(vzdalenost) && vzdalenost <= ZBRANE[id].dosah &&
  casMs - posledniUtokMs >= ZBRANE[id].cooldownMs
