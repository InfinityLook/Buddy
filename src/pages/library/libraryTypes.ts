// ==========================================
// Library — tvary katalogu. `KatalogDilo` je to, co umí vykreslit police
// i detail, ať už dílo přišlo z databáze (library_works), nebo je to
// ukázkový titul zabudovaný v appce (viz libraryCatalog.ts).
// ==========================================

export type DruhDila = 'kniha' | 'komiks' | 'scenar'
export type VekovaHranice = 'vsichni' | '12' | '16'

export interface KatalogDilo {
  /** uuid díla z databáze, nebo stabilní textové id ukázky. */
  id: string
  zdroj: 'katalog' | 'ukazka'
  druh: DruhDila
  title: string
  summary: string
  autor: string
  /** Úplná URL obálky; null = dílo obálku nemá a police nakreslí barevnou. */
  coverUrl: string | null
  /** Barva ozdobného rámečku obálky. */
  foil: string
  vek: VekovaHranice
  licence: string
  zanry: readonly string[]
  /** Jen ukázkové tituly: krátký text, který jde přelistovat hned. */
  ukazka?: readonly [string, ...string[]]
}

export type FiltrKatalogu = 'vse' | 'kniha' | 'komiks' | 'scenar' | 'police'

export const druhDilaNazev = (druh: DruhDila): string =>
  druh === 'komiks' ? 'Komiks' : druh === 'scenar' ? 'Scénář' : 'Kniha'

export const vekNazev = (vek: VekovaHranice): string => (vek === 'vsichni' ? 'Pro všechny' : `Od ${vek} let`)

const LICENCE_NAZVY: Record<string, string> = {
  'public-domain': 'Volné dílo',
  cc0: 'CC0',
  'cc-by': 'CC BY',
  'cc-by-sa': 'CC BY-SA',
  'cc-by-nc': 'CC BY-NC',
  'cc-by-nd': 'CC BY-ND',
  'cc-by-nc-sa': 'CC BY-NC-SA',
  'cc-by-nc-nd': 'CC BY-NC-ND',
  vlastni: 'Vlastní tvorba',
  smluvni: 'Se souhlasem autora',
}
export const licenceNazev = (licence: string): string => LICENCE_NAZVY[licence] ?? licence

const FOILY = ['#FFD5A0', '#B4F6DF', '#D9E8AA', '#F4B7FF', '#D9D8FF'] as const

/** Stabilní barva rámečku podle id — stejné dílo má na každém zařízení
 *  stejnou obálku, nic se neukládá. */
export const foilPodleId = (id: string): string => {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return FOILY[hash % FOILY.length]
}

export const filtrovatKatalog = (
  dila: readonly KatalogDilo[],
  filtr: FiltrKatalogu,
  police: ReadonlySet<string>,
): KatalogDilo[] => {
  if (filtr === 'vse') return [...dila]
  if (filtr === 'police') return dila.filter((d) => police.has(d.id))
  return dila.filter((d) => d.druh === filtr)
}

/** Dá se dílo číst přímo v appce? Ukázky vždy; z katalogu zatím jen knihy (komiks a scénář mají čtečku později). */
export const jeCitelne = (dilo: KatalogDilo): boolean =>
  Boolean(dilo.ukazka) || (dilo.zdroj === 'katalog' && dilo.druh === 'kniha')
