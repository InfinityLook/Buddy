// ==========================================
// Kniha — appka Writer's Roomu na psaní knih po kapitolách.
// ==========================================

import { StavPolozky } from '@/flagships/writer-room/writerRoomStav'

export interface Kapitola {
  id: string
  nazev: string
  text: string
  createdAt: string
  // Ruční štítek postupu, přepínaný jedním klepnutím (Nápad →
  // Rozepsáno → Hotovo) — nezávislý na tom, jestli kapitola má text,
  // ať jde odlišit "ještě jsem to nezačal" od "mám odstavec, ale
  // rozhodně to není hotové".
  stav: StavPolozky
  // Autorova soukromá poznámka ke kapitole (např. "potřebuje revizi"),
  // oddělená od samotného textu kapitoly — nikdy se neexportuje do
  // .txt ani nezobrazuje v Náhledu, je jen pro appku samotnou.
  poznamka: string
}

export interface Kniha {
  id: string
  nazev: string
  // null = žádný cíl nenastaven, appka jen počítá, kolik slov už je hotovo.
  cilSlov: number | null
  kapitoly: Kapitola[]
  createdAt: string
  // Kdy byla kniha naposledy skutečně upravena (nová/upravená/smazaná
  // kapitola, změna cíle) — ne kdy byla založena. Bez tohohle dashboard
  // Writer's Roomu i seznam knih ukazovaly vždycky nejnověji ZALOŽENOU
  // knihu, ne tu, na které se doopravdy pracuje.
  upravenoAt: string
}

// Prostý rozdělovač podle bílých znaků — appka nepotřebuje přesné
// typografické počítadlo, jen orientační číslo pro cíl a přehled.
export const pocetSlov = (text: string): number => {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export const celkovyPocetSlov = (kniha: Kniha): number =>
  kniha.kapitoly.reduce((soucet, k) => soucet + pocetSlov(k.text), 0)

// Stejný hrubý filmařský/čtenářský odhad jako Scénářovo odhadStopazeMinut
// vedle, jen v jednotkách "čtenář", ne "promítání" — běžná orientační
// rychlost čtení je kolem 200 slov za minutu. Appka žádné skutečné
// stránkování/typografii nedělá, takže jde jen o orientační číslo pro
// autora, ne o přesný přepočet.
const SLOV_ZA_MINUTU_CTENI = 200

export const odhadCteniMinut = (kniha: Kniha): number => Math.round(celkovyPocetSlov(kniha) / SLOV_ZA_MINUTU_CTENI)

// Seřadí knihy podle poslední úpravy, ne podle pořadí v poli (to je
// pořadí založení) — použito jak seznamem knih v appce samotné, tak
// Writer's Roomovým náhledem, ať obojí ukazuje totéž.
export const serazenoPodleUpravy = <T extends { upravenoAt: string }>(polozky: T[]): T[] =>
  [...polozky].sort((a, b) => b.upravenoAt.localeCompare(a.upravenoAt))

// Rychlé šablony struktury kapitol — místo prázdné kapitoly pokaždé
// znovu autor může jedním klepnutím založit celou hotovou kostru
// (názvy kapitol), do které pak jen píše. Pevná, malá sada — appka
// nenabízí vlastní/upravitelné šablony, stejná "pevná sada, ne
// libovolný vstup" zásada jako fixní barevné palety jinde v appce.
export interface SablonaKapitol {
  id: string
  nazev: string
  kapitoly: string[]
}

export const SABLONY_KAPITOL: SablonaKapitol[] = [
  {
    id: 'tri-akty',
    nazev: 'Tři akty',
    kapitoly: ['Akt I: Úvod', 'Akt II: Konflikt', 'Akt III: Rozuzlení'],
  },
  {
    id: 'hrdinova-cesta',
    nazev: 'Hrdinova cesta (zkráceně)',
    kapitoly: ['Obyčejný svět', 'Volání k dobrodružství', 'Zkoušky a spojenci', 'Nejtemnější hodina', 'Návrat proměněný'],
  },
]

// Poskládá celou knihu do jednoho čitelného textu pro export — nadpisy
// kapitol jako řádky navíc, jinak čistý text tak, jak ho autor napsal.
export const sestavTextKnihy = (kniha: Kniha): string =>
  [
    kniha.nazev.toUpperCase(),
    '',
    ...kniha.kapitoly.map((k, i) => `${i + 1}. ${k.nazev}\n\n${k.text.trim() || '(prázdná kapitola)'}`),
  ].join('\n\n')
