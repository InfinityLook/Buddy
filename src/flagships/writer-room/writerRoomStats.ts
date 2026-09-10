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

export interface DenTvorby {
  // YYYY-MM-DD, stabilní klíč pro graf (na rozdíl od `label` níž se
  // nemění podle jazyka/formátu zobrazení).
  datumIso: string
  // Krátké zobrazení pro popisek pod sloupcem grafu, např. "12. 6.".
  label: string
  pocet: number
}

/** Kolik kapitol/scén/panelů vzniklo za posledních `pocetDni` dní
 *  (včetně dneška) napříč všemi knihami/scénáři/komiksy najednou —
 *  jedno číslo na den, ne rozdělené podle appky, protože grafu jde o
 *  "kolik jsem toho psal(a)", ne o to, ve které appce zrovna. Stejný
 *  toDateString()-based "je to tenhle den" test jako spocitejDnesniTvorbu
 *  výš, jen spuštěný pro víc dnů najednou místo jenom pro dnešek. */
export const spocitejTvorbuPodleDne = (
  knihy: Kniha[],
  scenare: Scenar[],
  komiksy: Komiks[],
  pocetDni = 14,
  ted: Date = new Date()
): DenTvorby[] => {
  const vsechnyCasy: string[] = [
    ...knihy.flatMap((k) => k.kapitoly.map((kap) => kap.createdAt)),
    ...scenare.flatMap((s) => s.sceny.map((sc) => sc.createdAt)),
    ...komiksy.flatMap((k) => k.strany.flatMap((s) => s.panely.map((p) => p.createdAt))),
  ]

  const dny: DenTvorby[] = []
  for (let i = pocetDni - 1; i >= 0; i--) {
    const den = new Date(ted)
    den.setDate(den.getDate() - i)
    const pocet = vsechnyCasy.filter((iso) => new Date(iso).toDateString() === den.toDateString()).length
    dny.push({
      datumIso: `${den.getFullYear()}-${String(den.getMonth() + 1).padStart(2, '0')}-${String(den.getDate()).padStart(2, '0')}`,
      label: den.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
      pocet,
    })
  }
  return dny
}
