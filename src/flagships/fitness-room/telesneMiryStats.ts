import type { ZaznamMiry } from './useTelesneMiry'

// ==========================================
// Odvozené hodnoty nad Deníkem tělesných měr (useTelesneMiry.ts) — čisté
// funkce, stejný důvod jako fitnessStats.ts vedle: testovatelné bez
// komponenty, žádné riziko, že by se zobrazená hodnota rozešla se
// skutečnou historií.
// ==========================================

export const serazenoPodleData = (zaznamy: ZaznamMiry[]): ZaznamMiry[] =>
  [...zaznamy].sort((a, b) => a.datum.localeCompare(b.datum))

export interface BodGrafuVahy {
  id: string
  datum: string
  vahaKg: number
  vyskaProcent: number
}

/** Posledních N záznamů s vyplněnou váhou jako sloupcový graf — výška
 *  sloupce je vztažená k ROZSAHU zobrazeného okna (min–max), ne k nule:
 *  váha se pohybuje v desítkách kilo, takže sloupce vztažené k nule by
 *  u malých, skutečně zajímavých změn vypadaly skoro stejně vysoké.
 *  Jediný bod (nebo úplně stejná váha pořád) dostane 50 %, ne dělení
 *  nulou; sloupec nikdy neklesne pod 10 %, ani při nejnižší váze
 *  v okně, ať zůstane vidět jako sloupec, ne jako nic. */
export const spocitejGrafVahy = (zaznamy: ZaznamMiry[], pocetZaznamu = 14): BodGrafuVahy[] => {
  const sVahou = serazenoPodleData(zaznamy).filter(
    (z): z is ZaznamMiry & { vahaKg: number } => z.vahaKg !== null
  )
  const posledni = sVahou.slice(-pocetZaznamu)
  if (posledni.length === 0) return []

  const min = Math.min(...posledni.map((z) => z.vahaKg))
  const max = Math.max(...posledni.map((z) => z.vahaKg))
  const rozsah = max - min

  return posledni.map((z) => ({
    id: z.id,
    datum: z.datum,
    vahaKg: z.vahaKg,
    vyskaProcent: rozsah === 0 ? 50 : Math.round(((z.vahaKg - min) / rozsah) * 80) + 10,
  }))
}

/** Rozdíl od PŘEDCHOZÍHO záznamu — appka nevynucuje denní vážení, takže
 *  "od včerejška" by tu nedávalo smysl, na rozdíl od formatujRozdil ve
 *  fitnessStats.ts. null, když žádný předchozí záznam neexistuje. */
export const formatujRozdilVahy = (posledni: number, predchozi: number | null): string | null => {
  if (predchozi === null) return null
  const rozdil = Math.round((posledni - predchozi) * 10) / 10
  if (rozdil === 0) return 'beze změny od posledního záznamu'
  const znamenko = rozdil > 0 ? '+' : ''
  return `${znamenko}${rozdil} kg od posledního záznamu`
}

// ==========================================
// BMI — počítá se, jen když uživatel sám zadal výšku (useTelesneMiry.ts's
// vyskaCm); bez ní appka nic nevymýšlí, stejná poctivost jako u "zatím
// nesledujeme" jinde v appce. Standardní WHO kategorie, výslovně
// označené appkou jako orientační, ne lékařská diagnóza.
// ==========================================

export const vypocitejBmi = (vahaKg: number, vyskaCm: number | null): number | null => {
  if (vyskaCm === null || vyskaCm <= 0) return null
  const vyskaM = vyskaCm / 100
  return Math.round((vahaKg / (vyskaM * vyskaM)) * 10) / 10
}

/** Čtyři obvyklé WHO pásma BMI — appka je bere jako orientační popisek,
 *  ne jako lékařské hodnocení (proto se hodnota BMI vždycky ukazuje
 *  vedle popisku, nikdy jen samotný popisek). */
export const popisBmiKategorie = (bmi: number): string => {
  if (bmi < 18.5) return 'Podváha'
  if (bmi < 25) return 'Normální váha'
  if (bmi < 30) return 'Nadváha'
  return 'Obezita'
}

// ==========================================
// Cíl váhy/obvodu pasu — appka nepředpokládá směr (hubnutí vs.
// přibírání), ten odvodí ze vztahu PRVNÍHO záznamu s vyplněnou
// hodnotou k zadanému cíli. "Výchozí" je proto první záznam v
// historii, ne hodnota v okamžiku nastavení cíle — appka datum
// nastavení cíle nikde neukládá, stejná jednoduchost jako u
// School Roomova cilPrumeru (i tam appka srovnává proti aktuálnímu
// stavu, ne proti historickému okamžiku).
// ==========================================

export interface StavCileMiry {
  aktualniHodnota: number
  cilHodnota: number
  vychoziHodnota: number
  procenta: number
}

const spocitejStavCile = (
  zaznamy: ZaznamMiry[],
  ziskejHodnotu: (z: ZaznamMiry) => number | null,
  cil: number | null
): StavCileMiry | null => {
  if (cil === null) return null
  const sHodnotou = serazenoPodleData(zaznamy).filter((z) => ziskejHodnotu(z) !== null)
  if (sHodnotou.length === 0) return null

  const vychoziHodnota = ziskejHodnotu(sHodnotou[0]) as number
  const aktualniHodnota = ziskejHodnotu(sHodnotou[sHodnotou.length - 1]) as number

  if (vychoziHodnota === cil) {
    return { aktualniHodnota, cilHodnota: cil, vychoziHodnota, procenta: aktualniHodnota === cil ? 100 : 0 }
  }

  // Cíl může být nižší (hubnutí) i vyšší (přibírání) než výchozí
  // hodnota — appka to pozná ze samotných čísel, ne z nějaké
  // uživatelem zadané volby "hubnu/přibírám".
  const celkovaVzdalenost = Math.abs(cil - vychoziHodnota)
  const ujetaVzdalenost =
    vychoziHodnota < cil ? aktualniHodnota - vychoziHodnota : vychoziHodnota - aktualniHodnota
  const procenta = Math.max(0, Math.min(100, Math.round((ujetaVzdalenost / celkovaVzdalenost) * 100)))

  return { aktualniHodnota, cilHodnota: cil, vychoziHodnota, procenta }
}

export const spocitejStavCileVahy = (zaznamy: ZaznamMiry[], cil: number | null): StavCileMiry | null =>
  spocitejStavCile(zaznamy, (z) => z.vahaKg, cil)

export const spocitejStavCileObvoduPasu = (zaznamy: ZaznamMiry[], cil: number | null): StavCileMiry | null =>
  spocitejStavCile(zaznamy, (z) => z.obvodPasuCm, cil)

/** Krátký textový souhrn jednoho záznamu — jen ty hodnoty, co má
 *  doopravdy vyplněné, spojené " · ", ať se v seznamu neukazuje
 *  "0 cm boky" pro nikdy nezadaný rozměr. */
export const castiZaznamu = (z: ZaznamMiry): string => {
  const casti: string[] = []
  if (z.vahaKg !== null) casti.push(`${z.vahaKg} kg`)
  if (z.obvodPasuCm !== null) casti.push(`${z.obvodPasuCm} cm pas`)
  if (z.hrudnikCm !== null) casti.push(`${z.hrudnikCm} cm hrudník`)
  if (z.bokyCm !== null) casti.push(`${z.bokyCm} cm boky`)
  if (z.pazeCm !== null) casti.push(`${z.pazeCm} cm paže`)
  if (z.tukProcent !== null) casti.push(`${z.tukProcent} % tuku`)
  return casti.join(' · ')
}
