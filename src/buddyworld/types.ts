// ==========================================
// Buddy World — sdílené typy. Appka tuhle hru staví jako NOVOU,
// samostatnou 3D RPG, nezávislou na appčině dřívější "sekci Hry"
// (Buddyheim/Souboj/Buddyho Trh/Survival Night), která zůstává
// dočasně schovaná kvůli appčině blížícímu se Google Play v1 review
// (viz komentář u GamesHubModule importu v App.tsx) — appka se na
// tohle rozhodla po AskUserQuestion s uživatelem, ne sama od sebe.
//
// Rozdělení je stejné jako jinde v appce: "popis věci" (MaskotDef,
// NepritelDef — appčina data, data/*.ts) je oddělené od "aktuálního
// stavu věci" (NepritelRuntimeStav, BuddyWorldHracStav — appčin
// skutečný postup/souboj, tady a v leveling.ts/combat/engine.ts).
// ==========================================

export type BuddyElement = 'oheň' | 'příroda' | 'magie' | 'led'

/** Plochá pozice ve světě (appka hru drží čistě na rovné zemi, osa Y
 *  appku zajímá jen vizuálně — kreslí ji přímo scéna, nikdy engine). */
export interface Pozice2D {
  x: number
  z: number
}

/** Maskot — appčin budoucí plnohodnotní Buddyho společník. Appka má
 *  od začátku připravené všechny čtyři elementální varianty jako
 *  data (data/maskoti.ts), i když appčin grafický balíček
 *  (BuddyWorld_ArtPack.zip) ještě neexistuje — jen appčin jeden,
 *  dočasný maskot je dnes doopravdy odemčený/hratelný, zbylé appka
 *  v appčinu výběru (VyberMaskota.tsx) ukazuje jako zamčené, ne
 *  skryté — appka je "vidí, nepoužije", stejná zásada jako appčiny
 *  zlaté VIP šablony jinde v kódu. */
export interface MaskotDef {
  id: string
  jmeno: string
  element: BuddyElement
  popis: string
  ikona: string
  barvaJadro: string
  barvaZar: string
  /** `null`, dokud appka nemá doopravdy hotový model — appka v tomhle
   *  stavu vždycky kreslí primitivum (appčino "jádro + záře", stejná
   *  technika jako social/scene/useAmbientScene.ts). Jakmile balíček
   *  dorazí, appka sem doplní skutečnou cestu pod public/buddyworld/
   *  (viz data/assets.ts). */
  model: string | null
  odemcenyOdZacatku: boolean
}

/** Tvar primitivní 3D siluety nepřítele — appka tím dá dvěma typům
 *  viditelně odlišný vzhled i bez hotového modelu: 'ostruha' je
 *  původní hranatá ikosahedronová silueta (appčin Stínový vlček),
 *  'kapka' appka zplošťuje do blobovitého tvaru (appčina Lesní
 *  slizena). appka tvar čte uvnitř scene/useBuddyWorldScene.ts's
 *  generické mesh-továrny — další nový typ nepřítele proto
 *  nepotřebuje nový kus appčina kódu, jen jednu novou hodnotu tady. */
export type TvarNepritele = 'ostruha' | 'kapka'

/** Jeden typ běžného nepřítele. appka ho od začátku drží jako
 *  pole/tabulku (data/nepratele.ts), ať přidání dalšího typu zůstane
 *  jen nový záznam, ne druhý systém (stejná konvence jako appčiny
 *  postavy.ts/monsters.ts jinde v appce). appčina vizuální pole
 *  (barvaTela/barvaHalo/meritko/tvar) čte appčina scéna přímo odsud,
 *  ne natvrdo zapsané appčiny barvy — žádný nový typ proto nikdy
 *  nemusí sahat do appčina 3D kódu. */
export interface NepritelDef {
  id: string
  jmeno: string
  ikona: string
  maxHp: number
  poskozeni: number
  /** Dosah útoku nepřítele (herní jednotky). */
  dosahUtoku: number
  /** Dosah, ze kterého si nepřítel hráče "všimne" a začne ho honit. */
  dosahDetekce: number
  rychlost: number
  cooldownUtokuMs: number
  odmenaXp: number
  model: string | null
  /** Barva appčina "těla" primitivní siluety. */
  barvaTela: string
  /** Barva appčina prstence/záře kolem těla. */
  barvaHalo: string
  /** Měřítko appčiny celé siluety — appčin boss appku dostane výrazně
   *  vyšší hodnotu, appka tím appku splní zadání "větší model nebo
   *  výraznější silueta", ne jen appku vyšší appčin appka HP číslo. */
  meritko: number
  tvar: TvarNepritele
}

export type FazeNepritele = 'klid' | 'honi' | 'utoci' | 'mrtvy'

/** appčin aktuální stav jednoho nepřítele ve scéně — appka ho mění
 *  jen přes combat/engine.ts's čisté funkce, scéna ho pak jen
 *  vykresluje. */
export interface NepritelRuntimeStav {
  defId: string
  hp: number
  pozice: Pozice2D
  faze: FazeNepritele
  posledniUtokMs: number
  /** Čas (ms), kdy appka smí nepřítele znovu vytvořit poté, co byl
   *  poražen — appka ho nerespawnuje okamžitě, ať má hráč čas si
   *  vítězství všimnout, ne okamžitý reset beze zpětné vazby. */
  respawnOdMs: number
}

/** Aktuální stav bosse — rozšíření běžného NepritelRuntimeStav (appka
 *  tím generické appčiny funkce — pokusUtokHrace/melByRespawnovat z
 *  combat/engine.ts — znovupoužije pro bosse beze změny, nekopíruje
 *  je), navíc tři pole, co appka potřebuje jen pro bosse: boss nikdy
 *  automaticky nehoní appku, dokud ho hráč nevzbudí (probuzen); jednou
 *  nastavená zuřivost zůstává pravdou do konce souboje (appka ji
 *  nikdy nevypne zpátky); a vlastní čas posledního útoku pro druhý,
 *  otřesový útok (posledniOtresUtokuMs), nezávislý na posledniUtokMs
 *  appčina melee útoku. */
export interface BossRuntimeStav extends NepritelRuntimeStav {
  probuzen: boolean
  zuri: boolean
  posledniOtresUtokuMs: number
}

/** appčin hráčův postup — level/XP/HP. appka ho v tomhle prototypu
 *  drží jako jedinou, appkou spravovanou sadu čísel (appčin Buddy
 *  World má jen JEDNOHO hráče, ne appčinu Buddyheimovu partu postav
 *  k výběru), appčina trvalá uložená podoba je jen level+xp (viz
 *  useBuddyWorldStore.ts — maxHp/hp appka nepersistuje, appka je
 *  počítá znovu z levelu při každém vstupu do appčiny scény). */
export interface BuddyWorldHracStav {
  level: number
  xp: number
  maxHp: number
  hp: number
}
