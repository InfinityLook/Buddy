// ==========================================
// Citace — nová miniaplikace School Roomu, genuinně nová (appka do
// teď žádný nástroj na citace vůbec neměla), škálovaná na seminárky
// a odborné práce, kde se citace zdroje dokola přepisuje ručně.
// Sestavuje jednoduchou citaci v duchu ISO 690/APA — orientační
// pomůcka, ne bibliografický nástroj s normou na milimetr přesně.
// ==========================================

export type TypZdroje = 'kniha' | 'web' | 'clanek'

export const TYPY_ZDROJE: { id: TypZdroje; nazev: string }[] = [
  { id: 'kniha', nazev: 'Kniha' },
  { id: 'web', nazev: 'Webová stránka' },
  { id: 'clanek', nazev: 'Odborný článek / časopis' },
]

export interface Citace {
  id: string
  typ: TypZdroje
  autor: string
  nazev: string
  rok: string
  /** Nakladatelství (kniha) / název webu nebo časopisu (web, článek). */
  vydavatelNeboWeb: string
  /** Jen u webu — url adresa. */
  url: string
  /** Jen u webu — 'YYYY-MM-DD', kdy byla stránka navštívena. */
  datumCitace: string
  createdAt: string
}

/** Sestaví hotový text citace ve stylu blízkém ISO 690/APA — přebírá
 *  jen ta pole, co pro daný typ zdroje dávají smysl. */
export const sestavCitaci = (c: Citace): string => {
  const autor = c.autor.trim() || 'Neuvedený autor'
  const nazev = c.nazev.trim() || 'Bez názvu'
  const rok = c.rok.trim() || 'b.r.'

  if (c.typ === 'kniha') {
    const vydavatel = c.vydavatelNeboWeb.trim()
    return `${autor}. ${nazev}. ${vydavatel ? `${vydavatel}, ` : ''}${rok}.`
  }

  if (c.typ === 'clanek') {
    const casopis = c.vydavatelNeboWeb.trim()
    return `${autor}. ${nazev}. ${casopis ? `${casopis}, ` : ''}${rok}.`
  }

  // web
  const web = c.vydavatelNeboWeb.trim()
  const url = c.url.trim()
  const navstiveno = c.datumCitace.trim()
  return [
    `${autor}. ${nazev}.`,
    web ? `${web}, ${rok}.` : `${rok}.`,
    url && `Dostupné z: ${url}`,
    navstiveno && `[cit. ${navstiveno}]`,
  ]
    .filter(Boolean)
    .join(' ')
}
