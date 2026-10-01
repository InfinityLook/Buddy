import type { Pole2D } from './types'

// ==========================================
// Buddyho Trh — Fáze 6: pět "Minihra" polí rozesetých do zbývajících
// prázdných míst mřížky — stejný "rozeseté po celé ploše, ne na jedné
// smyčce" princip jako obchody.ts/osud.ts, žádné z nich nekoliduje s
// 12 obchody, 6 Osudovými poli ani s jediným polem kola štěstí (viz
// vlastní sanity test v boardgame-engine.test.ts, co to ověřuje proti
// všem třem už existujícím sadám najednou).
//
// Vlastní, místní kopie klicPole (ne import z obchody.ts) — stejná
// přijatá malá duplikace jedné řádky jako u osud.ts/kolostesti.ts,
// žádný z těchto souborů nemá důvod záviset na sobě navzájem.
// ==========================================

export const MINIHRA_POLE: Pole2D[] = [
  { x: 1, z: 2 },
  { x: 5, z: 2 },
  { x: 1, z: 4 },
  { x: 5, z: 4 },
  { x: 3, z: 5 },
]

const klic = (p: Pole2D): string => `${p.x},${p.z}`
const MINIHRA_KLICE = new Set(MINIHRA_POLE.map(klic))

/** Je na daném políčku "Minihra" pole? Stejná role v engine.ts's
 *  krokPohybu jako jeOsudovePole/jeKoloStestiPole — appka mezi
 *  obchodem/Osudem/kolem štěstí/minihrou rozhoduje jedním řetězcem
 *  podmínek, protože všechny čtyři sady políček jsou vzájemně výlučné
 *  podle konstrukce. */
export const jeMinihrovePole = (p: Pole2D): boolean => MINIHRA_KLICE.has(klic(p))
