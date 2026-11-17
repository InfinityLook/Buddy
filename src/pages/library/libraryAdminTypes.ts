import type { DruhDila, VekovaHranice } from './libraryTypes'

// ==========================================
// Library — správa katalogu (admin). Čisté typy a validace bez Supabase,
// ať jdou testovat samostatně. Stejná pravidla hlídá v databázi CHECK
// (library_works), tohle je rychlá zpětná vazba ve formuláři.
// ==========================================

export type StavDila = 'koncept' | 'ke_schvaleni' | 'zverejneno' | 'odmitnuto' | 'skryto'

export const STAVY_DILA: readonly StavDila[] = ['koncept', 'ke_schvaleni', 'zverejneno', 'odmitnuto', 'skryto']

export const POPIS_STAVU: Record<StavDila, string> = {
  koncept: 'Koncept',
  ke_schvaleni: 'Ke schválení',
  zverejneno: 'Zveřejněno',
  odmitnuto: 'Odmítnuto',
  skryto: 'Skryto',
}

export const DRUHY_DILA: readonly DruhDila[] = ['kniha', 'komiks', 'scenar']

export const POPIS_DRUHU: Record<DruhDila, string> = {
  kniha: 'Kniha',
  komiks: 'Komiks',
  scenar: 'Scénář',
}

export const VEKOVE_HRANICE: readonly VekovaHranice[] = ['vsichni', '12', '16']

export const POPIS_VEKU: Record<VekovaHranice, string> = {
  vsichni: 'Pro všechny',
  '12': 'Od 12 let',
  '16': 'Od 16 let',
}

/** Licence, které dovoluje CHECK v databázi. */
export const LICENCE = [
  'public-domain', 'cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nd', 'cc-by-nc-sa', 'cc-by-nc-nd',
  'vlastni', 'smluvni',
] as const
export type Licence = (typeof LICENCE)[number]

export const POPIS_LICENCE: Record<Licence, string> = {
  'public-domain': 'Volné dílo (public domain)',
  cc0: 'CC0',
  'cc-by': 'CC BY',
  'cc-by-sa': 'CC BY-SA',
  'cc-by-nc': 'CC BY-NC',
  'cc-by-nd': 'CC BY-ND',
  'cc-by-nc-sa': 'CC BY-NC-SA',
  'cc-by-nc-nd': 'CC BY-NC-ND',
  vlastni: 'Vlastní dílo autora',
  smluvni: 'Smluvní (se svolením)',
}

export interface DiloVstup {
  kind: DruhDila
  title: string
  summary: string
  language: string
  genres: string[]
  ageRating: VekovaHranice
  license: Licence
  licenseUrl: string
  sourceUrl: string
  attribution: string
  /** Jen u překladů volných děl: je i překlad volný? null = originál. */
  translationFree: boolean | null
  authorName: string
}

export const PRAZDNE_DILO: DiloVstup = {
  kind: 'kniha',
  title: '',
  summary: '',
  language: 'cs',
  genres: [],
  ageRating: 'vsichni',
  license: 'public-domain',
  licenseUrl: '',
  sourceUrl: '',
  attribution: '',
  translationFree: null,
  authorName: '',
}

export const MAX_ZANRU = 5

/** "sci-fi, dobrodružné" → ['sci-fi', 'dobrodružné'] (bez duplicit a prázdných, max 5). */
export const rozdelZanry = (text: string): string[] => {
  const videno = new Set<string>()
  const vysledek: string[] = []
  for (const kus of text.split(',')) {
    const z = kus.trim().slice(0, 40)
    const klic = z.toLowerCase()
    if (!z || videno.has(klic)) continue
    videno.add(klic)
    vysledek.push(z)
  }
  return vysledek.slice(0, MAX_ZANRU)
}

const jeHttp = (u: string) => /^https?:\/\/\S+$/i.test(u)

/** Vrací českou chybu pro formulář, nebo null když je vše v pořádku. */
export const validujDilo = (v: DiloVstup): string | null => {
  const titul = v.title.trim()
  if (titul.length < 1 || titul.length > 160) return 'Název musí mít 1 až 160 znaků.'
  const autor = v.authorName.trim()
  if (autor.length < 1 || autor.length > 120) return 'Jméno autora musí mít 1 až 120 znaků.'
  if (v.summary.length > 2000) return 'Anotace může mít nejvýše 2000 znaků.'
  if (!/^[a-z]{2,3}$/.test(v.language)) return 'Jazyk zadej jako dvou- nebo tříznakový kód (cs, en, de…).'
  if (v.genres.length > MAX_ZANRU) return `Žánrů může být nejvýše ${MAX_ZANRU}.`
  for (const [nazev, url] of [['URL licence', v.licenseUrl], ['URL zdroje', v.sourceUrl]] as const) {
    if (url && (!jeHttp(url) || url.length > 500)) return `${nazev} musí začínat http:// nebo https:// (max. 500 znaků).`
  }
  if (v.attribution.length > 500) return 'Uvedení autorství může mít nejvýše 500 znaků.'
  if (v.license === 'smluvni' && !v.attribution.trim()) {
    return 'U smluvního obsahu uveď, od koho a za jakých podmínek ho máš (pole Uvedení autorství).'
  }
  return null
}

/** Dá se dílo zveřejnit? Potřebuje alespoň jednu verzi s obsahem. */
export const lzeZverejnit = (maVerzi: boolean): string | null =>
  maVerzi ? null : 'Dílo nemá žádný obsah — nejdřív nahraj EPUB.'

export interface AdminDilo extends DiloVstup {
  id: string
  status: StavDila
  coverPath: string | null
  publishedVersionId: string | null
  featuredAt: string | null
  publishedAt: string | null
  ownerId: string | null
  readersCount: number
  ratingCount: number
  ratingSum: number
  updatedAt: string
}

export interface RadekAdminDila {
  id: string
  kind: DruhDila
  title: string
  summary: string
  language: string
  genres: string[] | null
  age_rating: VekovaHranice
  license: Licence
  license_url: string | null
  source_url: string | null
  attribution: string | null
  translation_free: boolean | null
  author_name: string
  cover_path: string | null
  status: StavDila
  published_version_id: string | null
  featured_at: string | null
  published_at: string | null
  owner_id: string | null
  readers_count: number
  rating_count: number
  rating_sum: number
  updated_at: string
}

export const adminDiloZRadku = (r: RadekAdminDila): AdminDilo => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  summary: r.summary,
  language: r.language,
  genres: r.genres ?? [],
  ageRating: r.age_rating,
  license: r.license,
  licenseUrl: r.license_url ?? '',
  sourceUrl: r.source_url ?? '',
  attribution: r.attribution ?? '',
  translationFree: r.translation_free,
  authorName: r.author_name,
  status: r.status,
  coverPath: r.cover_path,
  publishedVersionId: r.published_version_id,
  featuredAt: r.featured_at,
  publishedAt: r.published_at,
  ownerId: r.owner_id,
  readersCount: r.readers_count,
  ratingCount: r.rating_count,
  ratingSum: r.rating_sum,
  updatedAt: r.updated_at,
})

/** Sloupce pro INSERT/UPDATE z formuláře (prázdná pole = null). */
export const radekZVstupu = (v: DiloVstup) => ({
  kind: v.kind,
  title: v.title.trim(),
  summary: v.summary.trim(),
  language: v.language,
  genres: v.genres,
  age_rating: v.ageRating,
  license: v.license,
  license_url: v.licenseUrl.trim() || null,
  source_url: v.sourceUrl.trim() || null,
  attribution: v.attribution.trim() || null,
  translation_free: v.license === 'public-domain' ? v.translationFree : null,
  author_name: v.authorName.trim(),
})

/** Průměrné hodnocení nebo null, když nikdo neohodnotil. */
export const prumerHodnoceni = (d: Pick<AdminDilo, 'ratingCount' | 'ratingSum'>): number | null =>
  d.ratingCount > 0 ? Math.round((d.ratingSum / d.ratingCount) * 10) / 10 : null

/**
 * Rozdělí kapitoly do dávek pro vložení — jeden požadavek nesmí být příliš
 * velký (limit těla požadavku) ani mít desítky řádků.
 */
export const rozdelDoDavek = <T extends { blocks: unknown }>(
  radky: readonly T[],
  maxZnaku = 1_200_000,
  maxRadku = 20,
): T[][] => {
  const davky: T[][] = []
  let aktualni: T[] = []
  let velikost = 0
  for (const r of radky) {
    const v = JSON.stringify(r.blocks).length
    if (aktualni.length > 0 && (velikost + v > maxZnaku || aktualni.length >= maxRadku)) {
      davky.push(aktualni)
      aktualni = []
      velikost = 0
    }
    aktualni.push(r)
    velikost += v
  }
  if (aktualni.length > 0) davky.push(aktualni)
  return davky
}
