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
  /** Jestli hráč tenhle tah už použil sabotáž (Fáze 4, viz
   *  data/sabotaze.ts) — na rozdíl od `preskociTah`/`maBonusovyHod`
   *  (appka je NASTAVUJE cizímu hráči jako následek karty/kola) tuhle
   *  vlajku nastavuje útočník SÁM SOBĚ, hned při použití. Resetuje se
   *  na `false`, jakmile se `aktivniIndex` doopravdy přesune na
   *  někoho jiného (engine.ts's `ukonciTah`/`krokHodu`'s "přeskoč
   *  tah" větev) — NE při bonusovém hodu kola štěstí, protože ten
   *  pořád počítá jako stejný, ne nový tah. */
  sabotazPouzita: boolean
}

export type Smer = 'nahoru' | 'dolu' | 'vlevo' | 'vpravo'

/** Fáze jednoho tahu — nákup/nájem (Fáze 1) neotvírá novou fázi,
 *  jen za 'konec-tahu' přibude `nabidkaKoupe` — viz níž. */
export type FazeTahu = 'hod' | 'pohyb' | 'konec-tahu'

/** Jedna čekající nabídka obchodu mezi dvěma hráči (Fáze 5) — appka
 *  jich dovolí jen jednu najednou (`TrhStav.nabidkaObchodu`), nikdy
 *  frontu. `odKoho` nabízí `nabizenePenize`/`nabizenaPole` výměnou za
 *  `pozadovanePenize`/`pozadovanaPole` od `komu` — obě strany mohou
 *  být nula/prázdné pole (appka dovolí obchod jen za peníze nebo jen
 *  za pole), ale nikdy obě najednou prázdné (žádný "nic za nic"
 *  obchod, viz `navrhniObchod` v engine.ts). Nabídku smí navrhnout buď
 *  aktivní hráč (lidská iniciativa), nebo kterýkoli bot cíleně NA
 *  aktivního hráče (viz ai.ts's `zvazBotuNabidkuObchodu`) — appka to
 *  vynucuje jednou společnou podmínkou v `navrhniObchod`, ne dvěma
 *  samostatnými cestami. */
export interface NabidkaObchodu {
  odKoho: string
  komu: string
  nabizenePenize: number
  nabizenaPole: string[]
  pozadovanePenize: number
  pozadovanaPole: string[]
}

/** Časový limit hry v minutách — appka nabízí jen tyhle čtyři
 *  hodnoty (viz mechanická diskuze v CLAUDE.md), žádný volný vstup. */
export type LimitMinut = 15 | 30 | 45 | 60

// ==========================================
// Fáze 6 — minihry na políčkách. Tři různé tvary stavu pod jedním
// diskriminovaným sjednocením `ProbihajiciMinihra`, stejná role jako
// `NabidkaObchodu` výš: appka jich dovolí nejvýš jednu najednou
// (`TrhStav.minihra`), nikdy frontu, a dokud běží, blokuje sabotáž,
// návrh obchodu i konec tahu (viz engine.ts's `provedSabotaz`/
// `navrhniObchod`/`ukonciTah`'s vlastní "|| stav.minihra" podmínky).
// ==========================================

export interface KartaPexesa {
  symbol: string
  nalezena: boolean
}

export interface StavPexesa {
  typ: 'pexeso'
  karty: KartaPexesa[]
  /** Indexy právě otočených karet — appka jich najednou drží nejvýš
   *  dvě. Jedna znamená "čeká se na druhou kartu", dvě buď dvojici
   *  rovnou vyřeší (shoda), nebo appka obě nechá otočené s
   *  `cekaNaPotvrzeni: true`, dokud appka nezavolá
   *  `potvrdNeshoduPexesa` (viz engine.ts). */
  otevrene: number[]
  /** `true`, pokud právě dvě otočené karty NEJSOU pár — appka appku
   *  (UI) donutí zavolat `potvrdNeshoduPexesa`, než dovolí otočit
   *  další kartu, ať hráč/bot stihne vidět, co vlastně otočil. */
  cekaNaPotvrzeni: boolean
  /** Kolikrát se zatím porovnaly dvě karty — appka z toho počítá
   *  odměnu (viz data/minihry.ts's odmenaZaPexeso), méně pokusů =
   *  víc kreditů. */
  pokusy: number
}

/** Jedno kolo dokola — appka jedná s KAŽDÝM hráčem (`poradiUcastniku`,
 *  začíná u toho, kdo na pole doběhl) přesně JEDNOU, ne v
 *  opakovaných kolech: `indexNaTahu` roste bez ohledu na to, jestli
 *  dotyčný přihodil, nebo se vzdal, a jakmile dosáhne délky pole,
 *  dražba se vyhodnotí (vede `vedeId`, pokud vůbec někdo přihodil).
 *  Tohle zjednodušení schválně vynechává víckolové přehazování —
 *  appka tak nemusí řešit, co se stane, když se vedoucí hráč na svém
 *  dalším tahu "vzdá" vlastní už vedoucí nabídky. */
export interface StavDrazby {
  typ: 'drazba'
  polozkaId: string
  /** Appka ji inicializuje na `vyvolavaciCena - PRIHOZ_DRAZBY` (viz
   *  engine.ts's otevriMinihru), takže první platné přihození vyjde
   *  přesně na vyvolávací cenu. */
  aktualniNabidka: number
  vedeId: string | null
  poradiUcastniku: string[]
  indexNaTahu: number
}

/** Appka u týhle minihry nedrží žádný vlastní stav navíc — jediná
 *  akce (`vyhodnotRychlouAukci`) bere hotovou `presnost` jako
 *  argument, appka ji sama nevypočítává (viz data/minihry.ts's
 *  vlastní komentář u ODMENY_RYCHLE_AUKCE, proč reálný čas žije jen
 *  v Deska.tsx, ne v enginu). */
export interface StavRychleAukce {
  typ: 'rychla-aukce'
}

export type ProbihajiciMinihra = StavPexesa | StavDrazby | StavRychleAukce

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
  /** Čekající nabídka obchodu (Fáze 5, viz NabidkaObchodu výš) —
   *  neprázdná jen mezi návrhem a vyřízením (přijetí/odmítnutí/zrušení/
   *  protinabídka). Dokud je nastavená, žádná jiná akce (hod, pohyb,
   *  koupě, sabotáž, ukončení tahu) neprojde — appka tím vynucuje
   *  "jedno rozhodnutí najednou", stejně jako `nabidkaKoupe` výš. */
  nabidkaObchodu: NabidkaObchodu | null
  /** Právě probíhající minihra (Fáze 6, viz ProbihajiciMinihra výš) —
   *  neprázdná jen mezi doběhnutím na "Minihra" pole a jejím
   *  vyřešením. Dokud je nastavená, žádná jiná akce (sabotáž, návrh
   *  obchodu, konec tahu) neprojde — appka tím vynucuje "jedno
   *  rozhodnutí najednou", stejně jako `nabidkaKoupe`/`nabidkaObchodu`
   *  výš. */
  minihra: ProbihajiciMinihra | null
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
