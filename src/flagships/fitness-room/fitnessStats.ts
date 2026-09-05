import type { Sezeni } from '@/miniapps/form-check/types'

// ==========================================
// Odvozené statistiky Fitness Roomu ze skutečných sezení Form Checku
// (src/miniapps/form-check/useFormCheck.ts) — čisté funkce, žádný
// vlastní store, stejný důvod jako combat/leveling.ts: testovatelné bez
// komponenty, žádné riziko rozjetí počítadla a zobrazené hodnoty.
//
// Appka nemá krokoměr ani sledování spánku nikde jinde v kódu — "Kroky"
// a "Spánek" v Moje přehled/Dnešní cíl proto zůstávají v
// FitnessRoomModule.tsx natvrdo označené "zatím nesledujeme", ne
// vymyšlené číslo, co by vypadalo jako reálná naměřená hodnota. Jediné
// dva skutečné zdroje dat jsou "Trénink" (součet trvaniSekund dnešních
// sezení, přesné) a "Kalorie" (KCAL_NA_OPAKOVANI × počet opakování —
// hrubý, výslovně označený odhad, ne měření).
// ==========================================

// Hrubý odhad energetického výdeje na jeden dřep v podřepu s vlastní
// vahou — běžně citovaná hodnota se pohybuje kolem 0,3–0,5 kcal/opakování
// pro průměrnou dospělou osobu. Appka to ukazuje jako "odhad", ne jako
// přesné měření (na to by potřebovala váhu/tep uživatele, což nemá).
export const KCAL_NA_OPAKOVANI = 0.32

const jeStejnyDen = (isoDatum: string, referencni: Date): boolean =>
  new Date(isoDatum).toDateString() === referencni.toDateString()

export interface DenniShrnutiFitness {
  minutTreninku: number
  opakovani: number
  odhadKcal: number
}

const shrnoutDen = (sezeni: Sezeni[], den: Date): DenniShrnutiFitness => {
  const dnesni = sezeni.filter((s) => jeStejnyDen(s.createdAt, den))
  const sekund = dnesni.reduce((soucet, s) => soucet + s.trvaniSekund, 0)
  const opakovani = dnesni.reduce((soucet, s) => soucet + s.pocetOpakovani, 0)
  return {
    minutTreninku: Math.round(sekund / 60),
    opakovani,
    odhadKcal: Math.round(opakovani * KCAL_NA_OPAKOVANI),
  }
}

/** Dnešní a včerejší shrnutí v jednom volání, ať appka nepočítá dvakrát
 *  přes stejné pole. */
export const spocitatFitnessPrehled = (sezeni: Sezeni[]) => {
  const dnes = shrnoutDen(sezeni, new Date())
  const vcera = shrnoutDen(sezeni, new Date(Date.now() - 24 * 60 * 60 * 1000))
  return { dnes, vcera }
}

/** Formátovaný rozdíl "+N vs včera" / "−N vs včera" — appka schválně
 *  neukazuje procenta (na rozdíl od referenčního screenshotu): u malých
 *  čísel (typicky pár minut/dřepů) by procentuální rozdíl působil
 *  přehnaně dramaticky (0 → 5 min je "nekonečno %", ne "+12 %"), zatímco
 *  absolutní rozdíl zůstává čitelný a poctivý za všech okolností. */
export const formatujRozdil = (dnes: number, vcera: number): string => {
  const rozdil = dnes - vcera
  if (rozdil === 0) return 'stejně jako včera'
  const znamenko = rozdil > 0 ? '+' : ''
  return `${znamenko}${rozdil} vs včera`
}
