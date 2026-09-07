import { platneSmery } from './engine'
import type { Hrac, Smer, TrhStav } from './types'

// ==========================================
// Buddyho Trh — jednoduchý bot pro Fázi 0, stejná "reaktivní, žádná
// paměť" disciplína jako Souboj's combat/ai.ts: každé rozhodnutí se
// dělá znovu z aktuálního TrhStav, žádné plánování dopředu. Fáze 0
// nemá žádnou ekonomiku, takže bot zatím jen vybírá platný směr
// pohybu — jakmile přibude Fáze 1 (nákup/poplatky), přibude sem i
// rozhodnutí "koupit, nebo ne".
//
// `nahodne` injektovatelné kvůli testovatelnosti, stejný důvod jako
// u Souboj's `nahodnaPostava`/`pripravAkciAi` — tenhle bot běží jen
// lokálně, nikdy se s ničím nesynchronizuje, takže na determinismus
// enginu samotného to nemá vliv.
// ==========================================

/** Vybere směr dalšího kroku pro bota — rovnoměrně náhodně mezi
 *  směry, které doopravdy vedou na mřížku. Nikdy nevrátí `null`,
 *  protože mřížka 7×7 vždycky nabízí aspoň jeden platný směr. */
export const pripravSmerBota = (hrac: Hrac, stav: TrhStav, nahodne: () => number = Math.random): Smer => {
  const platne = platneSmery(hrac.pozice, stav)
  const index = Math.floor(nahodne() * platne.length)
  return platne[Math.min(index, platne.length - 1)]
}
