import type { Pole2D } from './types'

// ==========================================
// Buddyho Trh — Fáze 3: jediné "Kolo štěstí" pole, přesně uprostřed
// mřížky ({3,3} na 7×7 desce). Na rozdíl od obchodů (12, roztroušených
// — viz obchody.ts) a Osudu (6, rohy + boky středu — viz osud.ts) je
// tohle pole jen jedno jediné, takže žádná "rozeseta" logika, jen
// jedna pevná souřadnice. Ověřeno (viz vlastní sanity test v
// boardgame-engine.test.ts), že se střed nekryje s žádným z 18 už
// obsazených polí (12 obchodů + 6 Osudu) ani se žádnou skutečnou
// startovní pozicí hráče (ta vždy leží na poloměru 3 od středu, nikdy
// přesně v něm — viz engine.ts's startovniPozice).
// ==========================================

export const KOLO_STESTI_POLE: Pole2D = { x: 3, z: 3 }

const klic = (p: Pole2D): string => `${p.x},${p.z}`
const KOLO_STESTI_KLIC = klic(KOLO_STESTI_POLE)

/** Je dané políčko to jediné "Kolo štěstí"? Stejná role v engine.ts's
 *  krokPohybu jako jeOsudovePole — appka mezi obchodem/Osudem/kolem
 *  štěstí rozhoduje jedním řetězcem podmínek, protože všechny tři
 *  sady políček jsou vzájemně výlučné podle konstrukce. */
export const jeKoloStestiPole = (p: Pole2D): boolean => klic(p) === KOLO_STESTI_KLIC
