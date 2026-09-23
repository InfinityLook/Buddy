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

// Styl je vlastnost VYKRESLENÍ, ne uložené citace — appka nikdy neukládá
// zformátovaný text, jen syrová pole (autor, název, rok…), takže
// přepnutí stylu okamžitě přeformátuje úplně všechny už uložené citace,
// beze změny jediného uloženého záznamu. Stejná "vyhodnoť při čtení,
// nic odvozeného neukládej" disciplína jako resolveActiveThemeId jinde
// v appce.
export const STYLY_CITACI_ID = ['iso690', 'mla'] as const
export type TypCitacnihoStylu = (typeof STYLY_CITACI_ID)[number]

export const STYLY_CITACI: { id: TypCitacnihoStylu; nazev: string }[] = [
  { id: 'iso690', nazev: 'ISO 690 / APA' },
  { id: 'mla', nazev: 'MLA' },
]

const sestavCitaciIso690 = (c: Citace): string => {
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

// MLA má oproti ISO 690/APA výše dva skutečně rozpoznatelné rysy, oba
// zachované i v týhle zjednodušené podobě: název ČÁSTI staršího celku
// (článek, webová stránka) jde do uvozovek, kdežto název samostatného
// díla (kniha) ne — appka plain textem neumí kurzívu, kterou by MLA
// jinak použilo pro název celku, takže uvozovky zůstávají jediným
// viditelným rozlišením; a u webu jde datum návštěvy na konec citace
// jako "Přístup DATUM.", ne do hranaté závorky uprostřed jako u ISO 690.
const sestavCitaciMla = (c: Citace): string => {
  const autor = c.autor.trim() || 'Neuvedený autor'
  const nazev = c.nazev.trim() || 'Bez názvu'
  const rok = c.rok.trim() || 'b.r.'

  if (c.typ === 'kniha') {
    const vydavatel = c.vydavatelNeboWeb.trim()
    return `${autor}. ${nazev}. ${vydavatel ? `${vydavatel}, ` : ''}${rok}.`
  }

  if (c.typ === 'clanek') {
    const casopis = c.vydavatelNeboWeb.trim()
    return `${autor}. „${nazev}“ ${casopis ? `${casopis}, ` : ''}${rok}.`
  }

  // web
  const web = c.vydavatelNeboWeb.trim()
  const url = c.url.trim()
  const navstiveno = c.datumCitace.trim()
  return [
    `${autor}. „${nazev}“`,
    web ? `${web}, ${rok}.` : `${rok}.`,
    url,
    navstiveno && `Přístup ${navstiveno}.`,
  ]
    .filter(Boolean)
    .join(' ')
}

/** Sestaví hotový text citace v daném stylu — přebírá jen ta pole, co
 *  pro daný typ zdroje dávají smysl. Bez druhého argumentu appka
 *  vykreslí stejný ISO 690/APA výstup jako dřív, kdy druhý styl ještě
 *  neexistoval. */
export const sestavCitaci = (c: Citace, styl: TypCitacnihoStylu = 'iso690'): string =>
  styl === 'mla' ? sestavCitaciMla(c) : sestavCitaciIso690(c)

/** Sestaví celou bibliografii jako čistý text — jedna citace na
 *  odstavec, seřazeno abecedně podle autora (case-insensitive; bez
 *  autora podle názvu), stejné pořadí jako skutečná bibliografie na
 *  konci práce, ne pořadí přidání. */
export const sestavBibliografii = (citace: Citace[], styl: TypCitacnihoStylu = 'iso690'): string =>
  [...citace]
    .sort((a, b) => (a.autor.trim() || a.nazev).localeCompare(b.autor.trim() || b.nazev, 'cs'))
    .map((c) => sestavCitaci(c, styl))
    .join('\n\n')
