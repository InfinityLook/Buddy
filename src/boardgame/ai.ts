import { platneSmery } from './engine'
import type { DefiniceObchodu } from './obchody'
import type { Hrac, Smer, TrhStav } from './types'

// ==========================================
// Buddyho Trh — jednoduchý bot, stejná "reaktivní, žádná paměť"
// disciplína jako Souboj's combat/ai.ts: každé rozhodnutí se dělá
// znovu z aktuálního TrhStav, žádné plánování dopředu. Fáze 0 dala
// botovi jen výběr směru; Fáze 1 (ekonomika) přidává jediné další
// rozhodnutí, "koupit, nebo ne" — pořád jedno pravidlo, žádný chytrý
// nákupní model.
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

/** Kolik peněz si bot vždycky nechá stranou, i kdyby si mohl koupit
 *  ještě dražší obchod — ne chytrá strategie, jen pojistka proti
 *  utracení úplně do nuly na první nabídce. */
const BOT_MINIMALNI_REZERVA = 100

/** Koupí bot nabízený obchod? Ano, pokud mu po zaplacení zbyde aspoň
 *  rezerva výš — žádné vážení výhodnosti ceny/nájmu, stejná
 *  jednoduchost jako Souboj's vlastní reaktivní bot. */
export const melByBotKoupit = (hrac: Hrac, obchod: DefiniceObchodu): boolean =>
  hrac.penize - obchod.cena >= BOT_MINIMALNI_REZERVA
