// ==========================================
// Buddyho Trh — sdílené typy. Stejné rozdělení jako u Souboje
// (src/fighting/): tenhle soubor jen popisuje tvar dat, žádná logika.
// ==========================================

import type { PostavaId } from './postavy'

/** Souřadnice na otevřené mřížce (celá čísla, ne skutečná 3D pozice —
 *  tu si dopočítá až vykreslovací vrstva ze sirkaMrizky/vyskaMrizky). */
export interface Pole2D {
  x: number
  z: number
}

export interface Hrac {
  id: string
  jmeno: string
  postavaId: PostavaId
  pozice: Pole2D
  penize: number
  jeBot: boolean
  /** Nastaví karta "přeskoč tah" (Fáze 2, viz data/udalosti.ts) —
   *  konzumuje se až na začátku hráčova PŘÍŠTÍHO tahu (engine.ts's
   *  krokHodu), ne hned při vytažení karty, protože ji vytáhl
   *  uprostřed svého aktuálního tahu. */
  preskociTah: boolean
  /** Nastaví výsledek "bonusový hod" kola štěstí (Fáze 3, viz
   *  data/kolaStesti.ts) — na rozdíl od `preskociTah` (konzumováno v
   *  krokHodu, na ZAČÁTKU příštího tahu) se tahle vlajka konzumuje v
   *  `ukonciTah` HNED, ve stejném tahu, kdy padla: hráč tak dostane
   *  druhý hod navíc, aniž by jeho tah doopravdy skončil. */
  maBonusovyHod: boolean
}

export type Smer = 'nahoru' | 'dolu' | 'vlevo' | 'vpravo'

/** Fáze jednoho tahu — nákup/nájem (Fáze 1) neotvírá novou fázi,
 *  jen za 'konec-tahu' přibude `nabidkaKoupe` — viz níž. */
export type FazeTahu = 'hod' | 'pohyb' | 'konec-tahu'

/** Časový limit hry v minutách — appka nabízí jen tyhle čtyři
 *  hodnoty (viz mechanická diskuze v CLAUDE.md), žádný volný vstup. */
export type LimitMinut = 15 | 30 | 45 | 60

export interface TrhStav {
  hraci: Hrac[]
  /** Pořadí tahů jako pole id hráčů — samostatně od `hraci`, protože
   *  pořadí se v pozdější fázi (karty typu "přeskoč tah") může měnit
   *  nezávisle na tom, kdo ve hře vůbec je. */
  poradiHracu: string[]
  aktivniIndex: number
  faze: FazeTahu
  /** Kolik políček zbývá tenhle tah urazit — dopočítá se z hodu
   *  kostkou a ubývá s každým platným krokem. */
  zbyvaKroku: number
  posledniHod: number | null
  sirkaMrizky: number
  vyskaMrizky: number
  konec: boolean
  /** Vlastnictví obchodů — klíč je "x,z" políčka (viz obchody.ts's
   *  klicPole), hodnota id hráče. Chybějící klíč = obchod je zatím
   *  neprodaný, patří bance. */
  vlastnictvi: Record<string, string>
  /** Klíč obchodu, o jehož koupi se aktivní hráč zrovna rozhoduje —
   *  neprázdné jen mezi doběhnutím na neprodané pole a rozhodnutím
   *  (koupit/nekoupit). Dokud je nastavené, `ukonciTah` odmítá tah
   *  ukončit, ať appka nepřeskočí rozhodnutí bez povšimnutí. */
  nabidkaKoupe: string | null
  /** Jedna řádka pro poslední ekonomickou událost (koupě/nájem) —
   *  appka ji ukazuje jako prostý text, žádná historie zpráv. */
  posledniUdalost: string | null
  /** Id naposledy vytaženého výsledku kola štěstí (Fáze 3, viz
   *  data/kolaStesti.ts) — čistě UI breadcrumb pro animaci dotočení
   *  kola v Deska.tsx, engine sám tuhle hodnotu nikde zpátky nečte.
   *  Stejné chování jako `posledniUdalost`: zůstává nastavené i do
   *  dalšího tahu, dokud ho nepřepíše další vytažení. */
  posledniVysledekKolaId: string | null
  /** Kolikrát se za celou hru skutečně vytáhl výsledek kola štěstí —
   *  ROSTOUCÍ čítač, ne jen poslední id, protože appka tak v
   *  Deska.tsx pozná i opakování STEJNÉHO výsledku (dva různé tahy by
   *  jinak sdílely identické `posledniVysledekKolaId` a animace by se
   *  podruhé nespustila). */
  kolostestiPocet: number
  limitMinut: LimitMinut
  /** Absolutní čas (Date.now()), kdy hra podle časového limitu
   *  skončí — appka to porovnává periodicky v komponentě
   *  (`zkontrolujCas`), engine sám žádnou smyčku nemá, protože tahle
   *  hra je tahová, ne kolová jako Souboj. */
  konecCasuMs: number
}
