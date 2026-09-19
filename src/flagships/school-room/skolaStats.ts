import { Predmet } from '@/miniapps/znamky/types'
import { NAZVY_MESICU } from '@/miniapps/kalendar/useKalendar'

// ==========================================
// Trend známek — malý sloupcový graf bez knihovny, stejný "no charting
// library for a handful of bars" idiom jako Fitness Roomova Aktivita
// za 14 dní / Writer Roomova aktivita za psaní. Žije ve vlastním
// souboru vedle skolaCilStats.ts, protože skolaCilStats.ts je
// vyhrazený pro "cíl" (studijní minuty/průměr), tohle je obecnější
// dashboardová statistika.
// ==========================================

export interface MesicniTrendZnamek {
  /** 'YYYY-MM', pro řazení a jako stabilní klíč seznamu. */
  klic: string
  /** Zkrácený český název měsíce ("Led", "Úno"…) pro popisek pod sloupcem. */
  popisek: string
  /** Vážený průměr VŠECH známek napříč předměty za daný měsíc — null,
   *  když ten měsíc nemá jedinou zapsanou známku (ne 0, co by
   *  vypadalo jako "same jedničky"). */
  prumer: number | null
}

/** Vážený průměr NAPŘÍČ VŠEMI PŘEDMĚTY za posledních `pocetMesicu`
 *  (výchozí 6, včetně aktuálního) — na rozdíl od
 *  vazenyPrumerPredmetu/celkovyVazenyPrumer (co váží PŘEDMĚTY kredity
 *  a odpovídají na "jak jsem na tom právě teď"), tohle odpovídá na
 *  "jak šly známky v čase", takže váží jen podle vlastní váhy známky
 *  (test/aktivita), ne podle kreditů předmětu. Řadí se od nejstaršího
 *  k nejnovějšímu, ať graf čte zleva doprava jako čas. */
export const spocitejTrendZnamek = (
  predmety: Predmet[],
  ted: Date = new Date(),
  pocetMesicu: number = 6
): MesicniTrendZnamek[] => {
  const vsechnyZnamky = predmety.flatMap((p) => p.znamky).filter((z) => z.datum)

  const mesice: MesicniTrendZnamek[] = []
  for (let i = pocetMesicu - 1; i >= 0; i--) {
    const d = new Date(ted.getFullYear(), ted.getMonth() - i, 1)
    const klic = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const zaMesic = vsechnyZnamky.filter((z) => z.datum.slice(0, 7) === klic)
    const soucetVah = zaMesic.reduce((s, z) => s + z.vaha, 0)
    const prumer = soucetVah > 0 ? zaMesic.reduce((s, z) => s + z.hodnota * z.vaha, 0) / soucetVah : null
    mesice.push({ klic, popisek: NAZVY_MESICU[d.getMonth()].slice(0, 3), prumer })
  }
  return mesice
}
