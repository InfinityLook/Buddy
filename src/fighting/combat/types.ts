import type { Smer } from '../types'
import type { PostavaId } from './postavy'

// ==========================================
// Fáze 1 — jádro soubojového enginu jako čisté funkce, žádný React,
// žádný store, žádná síť (stejný "engine.ts drží celý systém jako
// čisté funkce/konstanty" vzor jako game/leveling.ts). Vstupem je
// aktuální stav + čerstvý vstup obou hráčů + uplynulý čas, výstupem
// je nový stav — engine.ts umí posunout souboj o jeden krok dopředu
// bez ohledu na to, odkud vstup přišel (skutečný ovladač přes síť je
// až Fáze 3, sem se dostane jen jako HracVstup).
// ==========================================

/** Tři útočné akce z referenčního obrázku — "blok" je držený stav,
 *  ne jednorázová akce, proto tu není. */
export type UtocnaAkce = 'udar' | 'kop' | 'specialni'

export interface AkceData {
  /** Poškození při zásahu — pevné číslo, ne rozsah, aby byl engine
   *  deterministický a šlo ho testovat bez mockování Math.random(). */
  poskozeni: number
  /** Dosah v logických jednotkách arény (viz ARENA_SIRKA v engine.ts). */
  dosah: number
  /** Jak dlouho akce zaměstná útočníka (startup+recovery v jednom) —
   *  po tuhle dobu ignoruje další vstupy. */
  trvaniMs: number
  /** Kolik many akce stojí — 0 u úderu/kopu, speciální ji vyžaduje. */
  cenaMany: number
  /** Vylepšení — jak moc zásah odstrčí cíl podél osy arény (logické
   *  jednotky, stejná škála jako pozice/ARENA_SIRKA). Na blokovaný
   *  zásah se stejně jako poškození zeslabí přes BLOK_REDUKCE. */
  knockback: number
}

/** Živý stav jednoho bojovníka během souboje. */
export interface BojovnikStav {
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  /** Pozice na ose 0..ARENA_SIRKA. */
  pozice: number
  /** Která postava (Fáze 2) — určuje efektivní čísla akcí, viz
   *  engine.ts's efektivniAkceData(). */
  postavaId: PostavaId
  /** Drží se blok právě teď (jen informativní — o snížení poškození
   *  rozhoduje engine v okamžiku zásahu). */
  blokuje: boolean
  /** Kolik ms zbývá z hitstunu po přijatém (neblokovaném) zásahu —
   *  po tu dobu bojovník ignoruje vstupy. */
  zranitelnostKonci: number
  /** Kolik ms zbývá z probíhající akce (startup+recovery) — po tu
   *  dobu bojovník taky ignoruje vstupy, ať útok trefil, nebo ne. */
  utokKonci: number
  posledniAkce: UtocnaAkce | null
  /** Vylepšení — Bulwarkův speciál ("stit" typ, viz postavy.ts's
   *  TypSpecialu) nastaví tohle na true, když se speciál zahájí, a
   *  engine ho spotřebuje (zpátky na false) na PRVNÍM dalším
   *  neblokovaném zásahu, který by jinak dopadl — ten zásah pak dá
   *  nulové poškození a žádný hitstun, bez ohledu na to, jestli
   *  bojovník zrovna drží blok. Přežívá i přes útoky samotného
   *  bojovníka mezitím (na rozdíl od utokKonci/zranitelnostKonci se
   *  nuluje jen skutečným spotřebováním, ne časem). */
  stitAktivni: boolean
  /** Vylepšení — kombo. Kolik neblokovaných zásahů za sebou tenhle
   *  bojovník JAKO ÚTOČNÍK právě navázal — čte se, jen pokud
   *  komboKonci > 0 (viz engine.ts's aplikujJedenZasah), jinak je
   *  série promlčená a appka ji bere jako 0 bez ohledu na starou
   *  hodnotu tady. */
  komboPocet: number
  /** Kolik ms zbývá, než se rozjetá série promlčí — počítá se dolů
   *  každý tik stejně jako zranitelnostKonci/utokKonci, prodlužuje se
   *  na KOMBO_OKNO_MS zpátky každým dalším neblokovaným zásahem. */
  komboKonci: number
  /** Vylepšení — parry. Jak dlouho bojovník BEZ PŘERUŠENÍ drží blok —
   *  roste každý tik, co blokuje, jinak spadne na 0. Zásah, co dopadne,
   *  dokud je tohle číslo pod PARRY_OKNO_MS (engine.ts), je "perfektní
   *  blok", ne obyčejný — cíl nedostane žádné poškození ani odražení a
   *  útočník je navíc omráčen (viz engine.ts's aplikujJedenZasah). */
  blokDrzenMs: number
  /** Vylepšení — parry. Kolik ms zbývá z vizuálního záblesku "právě
   *  jsem perfektně zablokoval" (Bojiste.tsx) — čistě UI, engine se na
   *  ni jinde neptá, počítá se dolů stejně jako komboKonci výš. */
  parryZablesk: number
}

/** Vstup jednoho hráče pro jeden krok simulace. `akce` je jednorázová
 *  událost (hrana stisku), ne držený stav — kdo engine volá, sám
 *  rozhoduje, kdy z "drženo" udělat "právě zmáčknuto". `smer` a `blok`
 *  naopak jsou držený stav, přesně jak je posílá ovladač. */
export interface HracVstup {
  /** Jen vlevo/vpravo se v Fázi 1 skutečně hýbe; nahoru/dolu (skok/
   *  podřep) jsou z d-padu vyhrazené na později a engine je ignoruje. */
  smer: Smer | null
  blok: boolean
  akce: UtocnaAkce | null
}

/** Osmé kolo vylepšení — volby zápasu, zvolené na obrazovce PŘED tím,
 *  než jsou oba sloty připravené (stejné místo jako výběr arény,
 *  viz arena/areny.ts's vlastní komentář, proč tenhle druh volby
 *  nepatří na síť) — a odsud dál po celý zápas neměnné. */
export interface SoubojMoznosti {
  /** Trénink — kolo nikdy neskončí (HP nikdy nespadne na 0, časový
   *  limit se vůbec nepočítá), viz engine.ts's krokSouboje. */
  treninkovyRezim: boolean
  /** Násobič regenerace many pro hráče 0/1 — handicap pro slabšího
   *  hráče znamená rychlejší nabíjení speciálu, ne změnu poškození
   *  (to by zasahovalo přímo do soubojové matematiky, tohle jen do
   *  tempa). 1 = žádný handicap. */
  handicapManaRegen: [number, number]
  /** Jestli aktuální aréna trestá odražení až ke kraji — vlastnost
   *  ZVOLENÉ arény (arena/areny.ts's Arena.nebezpeciOkraje), appka ji
   *  jen kopíruje sem v okamžiku vytvorSoubojStav(), engine sám o
   *  arénách nic neví. */
  hazardOkraju: boolean
}

/** Stav celého souboje (jednoho kola) — dva bojovníci, uplynulý čas
 *  a výsledek. Skóre/rundy/restart mezi koly je až věc obrazovky
 *  (Fáze 3), engine sám umí simulovat jen jedno kolo od začátku do KO.
 *  Osmé kolo vylepšení přidalo `moznosti` (výš) a `suddenDeath`/
 *  `suddenDeathOd` — druhá dvojice se PODOBÁ vitez/stavKola, ale je to
 *  vnitřní stav enginu (kdy náhlá smrt začala), ne výsledek pro
 *  obrazovku, proto zůstává na SoubojStav, ne v samostatném typu. */
export interface SoubojStav {
  hraci: [BojovnikStav, BojovnikStav]
  cas: number
  vitez: 0 | 1 | null
  stavKola: 'probiha' | 'konec'
  moznosti: SoubojMoznosti
  /** Jestli právě běží náhlá smrt (viz engine.ts's SUDDEN_DEATH_*) —
   *  nastartuje se přesnou shodou HP při vypršení časového limitu
   *  místo remízy, a od tohohle okamžiku dá KAŽDÝ další zásah násobně
   *  víc poškození, dokud se HP nerozejdou. */
  suddenDeath: boolean
  /** Hodnota `cas`, kdy suddenDeath začala — null, dokud nezačala.
   *  Slouží jen k odvození toho, jak dlouho už náhlá smrt běží (pro
   *  narůstající násobič poškození, viz engine.ts). */
  suddenDeathOd: number | null
  /** Deváté kolo vylepšení — jeden bonusový předmět za kolo, spadlý
   *  doprostřed arény (viz engine.ts's PICKUP_*). Pozice/typ se
   *  losují jednou při vytvorSoubojStav() a dál se nemění — jen
   *  `pickupSebran` se přepne na true, jakmile ho někdo sebere. Žádné
   *  respawnování v rámci jednoho kola, ani v tréninku. */
  pickupPozice: number
  pickupTyp: 'mana' | 'stit'
  pickupSebran: boolean
}
