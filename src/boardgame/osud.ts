import type { Pole2D } from './types'

// ==========================================
// Buddyho Trh — Fáze 2: šest "Osud" polí rozesetých do prázdných
// míst mřížky (čtyři rohy + dvě pole po stranách středu) — stejný
// "rozeseté po celé ploše, ne na jedné smyčce" princip jako
// obchody.ts, žádné z nich nekoliduje se 12 existujícími obchody
// (viz obchody.ts's vlastní seznam pozic).
//
// Vlastní, místní kopie klicPole (ne import z obchody.ts) — dvě
// sesterské datové sady nemají důvod záviset jedna na druhé kvůli
// jednořádkové funkci, stejná přijatá malá duplikace jako BARVY_UZLU
// jinde v appce.
// ==========================================

export const OSUD_POLE: Pole2D[] = [
  { x: 0, z: 0 },
  { x: 6, z: 0 },
  { x: 0, z: 6 },
  { x: 6, z: 6 },
  { x: 1, z: 3 },
  { x: 5, z: 3 },
]

const klic = (p: Pole2D): string => `${p.x},${p.z}`
const OSUD_KLICE = new Set(OSUD_POLE.map(klic))

/** Je na daném políčku "Osud" pole? Appka tím v engine.ts rozhoduje,
 *  jestli doběhnutí na poslední krok tahu vytáhne kartu místo
 *  nabídky koupě (viz obchody.ts's najdiObchodNaPoli) — obě sady
 *  políček jsou vzájemně výlučné podle konstrukce. */
export const jeOsudovePole = (p: Pole2D): boolean => OSUD_KLICE.has(klic(p))
