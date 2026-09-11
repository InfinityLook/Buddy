import type { Sezeni } from '@/miniapps/form-check/types'
import { KCAL_ZA_OPAKOVANI } from '@/miniapps/form-check/types'

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
// sezení, přesné) a "Kalorie" (KCAL_ZA_OPAKOVANI[cvik] × počet
// opakování daného cviku — hrubý, výslovně označený odhad, ne měření).
// ==========================================

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
  const kcal = dnesni.reduce((soucet, s) => soucet + s.pocetOpakovani * KCAL_ZA_OPAKOVANI[s.cvik], 0)
  return {
    minutTreninku: Math.round(sekund / 60),
    opakovani,
    odhadKcal: Math.round(kcal),
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

// ==========================================
// Osobní rekordy a série — počítané vždycky nad celou historií znovu,
// nikdy neukládané jako vlastní číslo (stejná "vyhodnoť při čtení,
// nedůvěřuj tomu, co je uloženo" disciplína jako u resolveActiveRoleId/
// resolveActiveThemeId jinde v týhle appce) — díky tomu se rekord nemůže
// rozejít se skutečnou historií sezení.
// ==========================================

export interface OsobniRekordyFitness {
  nejdelsiSezeniSekund: number
  nejvicOpakovaniZaDen: number
}

/** Nejdelší jedno sezení a nejvíc opakování napočítaných v jednom dni
 *  (víc sezení stejný den se sčítá) — obojí ze skutečné historie, ne
 *  vymyšlené maximum. */
export const spocitejOsobniRekordy = (sezeni: Sezeni[]): OsobniRekordyFitness => {
  const nejdelsiSezeniSekund = sezeni.reduce((max, s) => Math.max(max, s.trvaniSekund), 0)

  const opakovaniPodleDne = new Map<string, number>()
  sezeni.forEach((s) => {
    const den = new Date(s.createdAt).toDateString()
    opakovaniPodleDne.set(den, (opakovaniPodleDne.get(den) ?? 0) + s.pocetOpakovani)
  })
  const nejvicOpakovaniZaDen = Math.max(0, ...opakovaniPodleDne.values())

  return { nejdelsiSezeniSekund, nejvicOpakovaniZaDen }
}

/** Aktuální série po sobě jdoucích dní se sezením — počítá od včerejška,
 *  pokud dnes ještě žádné sezení nebylo, aby rozdělaný, ale ještě
 *  nedokončený dnešek sérii nevynuloval (stejná úvaha jako u
 *  spocitejSeriiNavyku v Goal Trackeru/streaků jinde v appce). */
export const spocitejSeriiTreninku = (sezeni: Sezeni[], dnes = new Date()): number => {
  const dny = new Set(sezeni.map((s) => new Date(s.createdAt).toDateString()))
  const kurzor = new Date(dnes)
  if (!dny.has(kurzor.toDateString())) kurzor.setDate(kurzor.getDate() - 1)

  let serie = 0
  while (dny.has(kurzor.toDateString())) {
    serie++
    kurzor.setDate(kurzor.getDate() - 1)
  }
  return serie
}

/** Kolik různých dní za posledních 7 dní (včetně dneška) mělo aspoň
 *  jedno sezení — základ pro týdenní cíl "kolikrát týdně chci trénovat"
 *  (viz useFitnessCil.ts). Víc sezení stejný den počítá jako jeden
 *  tréninkový den, ne dva. */
export const spocitejTreninkovychDniZaTyden = (sezeni: Sezeni[], ted = Date.now()): number => {
  const hranice = ted - 7 * 24 * 60 * 60 * 1000
  const dny = new Set<string>()
  sezeni.forEach((s) => {
    const cas = new Date(s.createdAt).getTime()
    if (cas > hranice && cas <= ted) dny.add(new Date(s.createdAt).toDateString())
  })
  return dny.size
}

// ==========================================
// Aktivita za posledních N dní — malý sloupcový graf v dashboardu, žádná
// knihovna, stejný "no charting library for a handful of bars" vzorec
// jako Writer's Roomova spocitejTvorbuPodleDne.
// ==========================================

export interface DenAktivityFitness {
  datum: string
  minutTreninku: number
}

export const spocitejAktivituPodleDne = (sezeni: Sezeni[], pocetDni = 14): DenAktivityFitness[] => {
  const dny: DenAktivityFitness[] = []
  for (let i = pocetDni - 1; i >= 0; i--) {
    const den = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    dny.push({ datum: den.toDateString(), minutTreninku: shrnoutDen(sezeni, den).minutTreninku })
  }
  return dny
}
