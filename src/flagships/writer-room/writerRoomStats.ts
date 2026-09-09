import type { Kniha } from '@/miniapps/book-writer/types'
import type { Scenar } from '@/miniapps/screenplay-writer/types'
import type { Komiks } from '@/miniapps/comic-writer/types'

// ==========================================
// Odvozené statistiky Writer's Roomu napříč všemi třemi appkami — čisté
// funkce, stejný důvod jako fitnessStats.ts/economyStats.ts/
// growthStats.ts vedle: testovatelné bez komponenty, jedno místo, co
// nemůže rozjet zobrazenou hodnotu od skutečných dat.
// ==========================================

const jeDnes = (isoDatum: string, referencni: Date): boolean =>
  new Date(isoDatum).toDateString() === referencni.toDateString()

export interface DnesniTvorba {
  kapitol: number
  scen: number
  panelu: number
}

/** Kolik kapitol/scén/panelů vzniklo dnes napříč všemi knihami/
 *  scénáři/komiksy — appka nesleduje "psací streak" zvlášť (to už
 *  dělá gamifikační store pro celý účet), jen "kolik jsi dneska
 *  doopravdy napsal(a)", stejná role jako Fitness Roomovo "Trénink". */
export const spocitejDnesniTvorbu = (knihy: Kniha[], scenare: Scenar[], komiksy: Komiks[], ted: Date = new Date()): DnesniTvorba => ({
  kapitol: knihy.reduce((soucet, k) => soucet + k.kapitoly.filter((kap) => jeDnes(kap.createdAt, ted)).length, 0),
  scen: scenare.reduce((soucet, s) => soucet + s.sceny.filter((sc) => jeDnes(sc.createdAt, ted)).length, 0),
  panelu: komiksy.reduce(
    (soucet, k) => soucet + k.strany.reduce((s2, str) => s2 + str.panely.filter((p) => jeDnes(p.createdAt, ted)).length, 0),
    0
  ),
})
