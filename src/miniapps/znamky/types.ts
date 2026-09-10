// ==========================================
// Známky a studijní průměr — nová miniaplikace School Roomu, druhá
// (vedle Rozvrhu) čistě vysokoškolská potřeba, co appka do teď vůbec
// neměla. Česká klasifikační stupnice 1 (výborně) až 5 (nedostatečně),
// vážený průměr počítá appka sama, uživatel jen zapisuje.
// ==========================================

export interface Znamka {
  id: string
  /** 1 (výborně) až 5 (nedostatečně) — česká klasifikační stupnice. */
  hodnota: number
  /** Váha v rámci předmětu, např. test=2, aktivita=1 — vyšší váha
   *  počítá do průměru víc. */
  vaha: number
  popis: string
  /** 'YYYY-MM-DD' */
  datum: string
}

export interface Predmet {
  id: string
  nazev: string
  /** Kredity/ECTS — 0, pokud si uživatel nechce vůbec vyplňovat. */
  kredity: number
  znamky: Znamka[]
}

export const MIN_ZNAMKA = 1
export const MAX_ZNAMKA = 5

export const ZNAMKA_SLOVY: Record<number, string> = {
  1: 'výborně',
  2: 'chvalitebně',
  3: 'dobře',
  4: 'dostatečně',
  5: 'nedostatečně',
}

export const znamkaSlovy = (hodnota: number): string => ZNAMKA_SLOVY[hodnota] ?? ''

/** Vážený průměr známek v jednom předmětu — null, když předmět ještě
 *  žádnou známku nemá (ne 0, co by se dalo splést s "samé jedničky"). */
export const vazenyPrumerPredmetu = (predmet: Predmet): number | null => {
  const soucetVah = predmet.znamky.reduce((s, z) => s + z.vaha, 0)
  if (soucetVah === 0) return null
  const soucetBodu = predmet.znamky.reduce((s, z) => s + z.hodnota * z.vaha, 0)
  return soucetBodu / soucetVah
}

/** Celkový průměr napříč předměty, vážený kredity — předmět bez kreditů
 *  (0) i tak počítá s vahou 1, ať nezmizí z průměru úplně jen proto, že
 *  si uživatel kredity nevyplnil. Předmět bez žádné známky se do
 *  průměru nepočítá vůbec (nemá co vážit). */
export const celkovyVazenyPrumer = (predmety: Predmet[]): number | null => {
  let soucetVah = 0
  let soucetBodu = 0

  for (const predmet of predmety) {
    const prumer = vazenyPrumerPredmetu(predmet)
    if (prumer === null) continue
    const vaha = predmet.kredity > 0 ? predmet.kredity : 1
    soucetVah += vaha
    soucetBodu += prumer * vaha
  }

  return soucetVah === 0 ? null : soucetBodu / soucetVah
}

export const soucetKreditu = (predmety: Predmet[]): number =>
  predmety.reduce((s, p) => s + p.kredity, 0)
