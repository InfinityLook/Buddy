import type { Sezeni } from '@/miniapps/form-check/types'
import { KCAL_ZA_OPAKOVANI } from '@/miniapps/form-check/types'
import { plural } from '@/core/utils/pluralCZ'

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

/** "vs minulý měsíc" verze formatujRozdil výš — VIP měsíční trend
 *  srovnává jiné období, potřebuje jinou větu, stejná "vs minulý
 *  měsíc" distinktní funkce, jako to Economy Room už jednou udělal se
 *  svou vlastní formatujRozdilMesic. */
export const formatujRozdilMesic = (tento: number, minuly: number): string => {
  const rozdil = tento - minuly
  if (rozdil === 0) return 'stejně jako minulý měsíc'
  const znamenko = rozdil > 0 ? '+' : ''
  return `${znamenko}${rozdil} vs minulý měsíc`
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

/** ISO týdenní klíč (např. "2024-W37") — jediný účel je stabilně
 *  odlišit "tenhle kalendářní týden" od "minulý/příští", ať appka umí
 *  poznat, že splnění týdenního tréninkového cíle ještě neoslavila v
 *  TOMHLE týdnu (viz useFitnessCil.ts's posledniOslavenyTydenKlic).
 *  Standardní ISO 8601 algoritmus (týden obsahující první čtvrtek
 *  roku je týden 1, pondělí je první den). */
export const tydenniKlic = (datum: Date): string => {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()))
  const denOdPondeli = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - denOdPondeli + 3)
  const prvniCtvrtek = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const cislo =
    1 +
    Math.round(
      ((d.getTime() - prvniCtvrtek.getTime()) / 86_400_000 - 3 + ((prvniCtvrtek.getUTCDay() + 6) % 7)) / 7
    )
  return `${d.getUTCFullYear()}-W${String(cislo).padStart(2, '0')}`
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

/** Součet odhadu kcal za posledních N dní (výchozí týden) — jediný účel
 *  je krátká věta pro sdílení týdenního shrnutí níž, appka to jinde
 *  nepočítá (dashboard má svůj vlastní "dnes"/"14 dní" pohled). */
export const soucetOdhadKcalZaPosledniDni = (sezeni: Sezeni[], pocetDni = 7, ted = Date.now()): number => {
  const hranice = ted - pocetDni * 24 * 60 * 60 * 1000
  return Math.round(
    sezeni
      .filter((s) => {
        const cas = new Date(s.createdAt).getTime()
        return cas > hranice && cas <= ted
      })
      .reduce((soucet, s) => soucet + s.pocetOpakovani * KCAL_ZA_OPAKOVANI[s.cvik], 0)
  )
}

// ==========================================
// Sdílení týdenního shrnutí — reuse core/utils/sdileni.ts's
// sdilejText(), stejný "sdílej text, appka nic sama neuploaduje" tvar
// jako Form Checkovo vlastní sdílení výsledku o pár kroků výš v appce.
// ==========================================
export const sestavTydenniShrnutiText = (
  treninkovychDniZaTyden: number,
  serieDni: number,
  odhadKcalTydne: number
): string => {
  const casti = [`Tento týden jsem ve Fitness Roomu trénoval(a) ${treninkovychDniZaTyden}×`]
  if (serieDni > 0) casti.push(`série ${serieDni} ${plural(serieDni, 'den', 'dny', 'dní')} v řadě`)
  casti.push(`odhadem ${odhadKcalTydne} kcal`)
  return `${casti.join(', ')}! 💪`
}

// ==========================================
// Stažitelný report — obyčejný text, ne CSV: appka ho staví jako pár
// čitelných řádků na přečtení, ne jako tabulku k dalšímu zpracování
// (na to už existuje sestavCsvSezeni ve Form Checkových types.ts).
// ==========================================
const formatSekundyNaText = (sekund: number): string => {
  if (sekund === 0) return '0 s'
  if (sekund < 60) return `${sekund} s`
  return `${Math.floor(sekund / 60)} min ${sekund % 60} s`
}

export interface FitnessReportData {
  dnesniKcal: number
  dnesniMin: number
  tydenniTreninkovychDni: number
  cilTreninkuTydne: number | null
  serieDni: number
  nejdelsiSezeniSekund: number
  nejvicOpakovaniZaDen: number
  posledniVahaKg: number | null
}

export const sestavFitnessReport = (data: FitnessReportData): string => {
  const radky = [
    'FITNESS ROOM — SHRNUTÍ',
    '========================',
    '',
    `Vygenerováno: ${new Date().toLocaleString('cs-CZ')}`,
    '',
    `Dnešní odhad kalorií: ${data.dnesniKcal} kcal`,
    `Dnešní trénink: ${data.dnesniMin} min`,
    `Tréninkové dny tento týden: ${data.tydenniTreninkovychDni}${
      data.cilTreninkuTydne !== null ? ` z cíle ${data.cilTreninkuTydne}` : ''
    }`,
    `Aktuální tréninková série: ${data.serieDni} ${plural(data.serieDni, 'den', 'dny', 'dní')} v řadě`,
    `Nejdelší sezení: ${formatSekundyNaText(data.nejdelsiSezeniSekund)}`,
    `Nejvíc opakování za den: ${data.nejvicOpakovaniZaDen}`,
    data.posledniVahaKg !== null ? `Poslední zaznamenaná váha: ${data.posledniVahaKg} kg` : 'Váha zatím nezaznamenána',
  ]
  return radky.join('\n')
}

// ==========================================
// VIP: měsíční srovnání — tento měsíc vs. minulý (kcal/min/tréninkové
// dny), stejná "od–do bez ohledu na aktuální den v měsíci" logika jako
// Economy Roomovo vlastní měsíční srovnání transakcí, jen nad Form
// Checkovou historií sezení místo transakcí.
// ==========================================
export interface MesicniSrovnaniFitness {
  tentoMesicKcal: number
  minulyMesicKcal: number
  tentoMesicMin: number
  minulyMesicMin: number
  tentoMesicDni: number
  minulyMesicDni: number
}

const patriDoMesice = (createdAt: string, rok: number, mesic: number): boolean => {
  const d = new Date(createdAt)
  return d.getFullYear() === rok && d.getMonth() === mesic
}

export const spocitatMesicniSrovnaniFitness = (sezeni: Sezeni[], ted = new Date()): MesicniSrovnaniFitness => {
  const tentoRok = ted.getFullYear()
  const tentoMesic = ted.getMonth()
  const minulyKotva = new Date(tentoRok, tentoMesic - 1, 1)
  const minulyRok = minulyKotva.getFullYear()
  const minulyMesic = minulyKotva.getMonth()

  const secti = (pole: Sezeni[]) => ({
    kcal: Math.round(pole.reduce((s, z) => s + z.pocetOpakovani * KCAL_ZA_OPAKOVANI[z.cvik], 0)),
    min: Math.round(pole.reduce((s, z) => s + z.trvaniSekund, 0) / 60),
    dni: new Set(pole.map((z) => new Date(z.createdAt).toDateString())).size,
  })

  const t = secti(sezeni.filter((s) => patriDoMesice(s.createdAt, tentoRok, tentoMesic)))
  const m = secti(sezeni.filter((s) => patriDoMesice(s.createdAt, minulyRok, minulyMesic)))

  return {
    tentoMesicKcal: t.kcal,
    minulyMesicKcal: m.kcal,
    tentoMesicMin: t.min,
    minulyMesicMin: m.min,
    tentoMesicDni: t.dni,
    minulyMesicDni: m.dni,
  }
}
