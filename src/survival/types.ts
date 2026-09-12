// ==========================================
// Survival Night — sdílené typy. Čistá data, žádný React ani Three.js
// import — stejná zásada jako combat/types.ts u Souboje: engine i
// scéna čtou tenhle soubor, nikdy naopak.
// ==========================================

export type Rarita = 'bezna' | 'neobvykla' | 'vzacna' | 'epicka' | 'legendarni' | 'mytiky'

export const RARITA_BARVA: Record<Rarita, string> = {
  bezna: '#9aa5c0',
  neobvykla: '#35c4f0',
  vzacna: '#8a5cf6',
  epicka: '#ec4899',
  legendarni: '#f59e0b',
  mytiky: '#ef4444',
}

export const RARITA_NAZEV: Record<Rarita, string> = {
  bezna: 'Běžná',
  neobvykla: 'Neobvyklá',
  vzacna: 'Vzácná',
  epicka: 'Epická',
  legendarni: 'Legendární',
  mytiky: 'Mýtická',
}

/** Pozice ve 2D — appka řeší pohyb/kolize na jedné rovině, výška je jen
 *  kosmetická věc scény (viz scene/useSurvivalScene.ts). */
export interface Pozice2D {
  x: number
  z: number
}

export type TypNepritele = 'pozemni' | 'letajici' | 'strelec'

export type MonstrumId = 'crawler' | 'wolf' | 'shambler' | 'bat' | 'demon' | 'mage' | 'hunter' | 'eater'

export interface MonstrumDef {
  id: MonstrumId
  jmeno: string
  emoji: string
  hp: number
  damage: number
  /** Jednotky světa za sekundu. */
  rychlost: number
  typ: TypNepritele
  rarita: Rarita
  xp: number
  gold: number
  /** 0..1 — šance na drop krystalu při zabití. */
  sanceKrystal: number
  /** 0..1 — šance na drop lootu (potion/zbraň/truhla) při zabití. */
  sanceLoot: number
  /** Barva primitivní 3D reprezentace (dokud appka nemá skutečné modely). */
  barva: string
  /** Poloměr kolize/vykreslení. */
  polomer: number
  /** Od které vlny se monstrum vůbec může objevit. */
  dostupnaOdVlny: number
  /** Jen 'strelec' — vzdálenost, ze které útočí, místo aby došel k hráči. */
  dosahUtoku?: number
}

export interface ZbranDef {
  id: string
  jmeno: string
  rarita: Rarita
  damage: number
  /** Kolik útoků za sekundu. */
  utokyZaSekundu: number
  dosah: number
  efekt: string
  ikona: string
}

export interface SchopnostDef {
  id: string
  jmeno: string
  popis: string
  ikona: string
  cooldownMs: number
}

export interface BossFaze {
  /** 0..1 — práh podílu HP, od kterého fáze platí (sestupně seřazené). */
  podHp: number
  nazev: string
  nasobicRychlosti: number
  nasobicPoskozeni: number
  specialita: 'zadna' | 'teleport'
}

export interface BossDef {
  id: string
  jmeno: string
  emoji: string
  hp: number
  damage: number
  rychlost: number
  xp: number
  gold: number
  polomer: number
  /** Seřazené sestupně podle podHp — první fáze musí mít podHp: 1. */
  faze: BossFaze[]
  /** Interval teleportu ve fázi se specialitou 'teleport'. */
  teleportCooldownMs: number
}

/** Běžící instance nepřítele v jednom konkrétním běhu — na rozdíl od
 *  MonstrumDef/BossDef (statická data) tohle je stav, co se mění tick
 *  po ticku. */
export interface NepritelInstance {
  id: string
  /** Id z MonstrumDef, nebo id bosse (BossDef) když jeBoss === true —
   *  obojí jsou prostě řetězce, appka je rozlišuje přes `jeBoss`. */
  defId: string
  jeBoss: boolean
  pozice: Pozice2D
  hp: number
  maxHp: number
  damage: number
  rychlost: number
  polomer: number
  typ: TypNepritele
  dosahUtoku: number
  barva: string
  emoji: string
  /** Kdy (stav.cas) mohl naposledy udeřit — cooldown kontaktního/ranged útoku. */
  posledniUtokMs: number
  /** Jen boss — index aktuální fáze do BossDef.faze. */
  fazeIndex: number
  /** Jen boss ve fázi 'teleport' — kdy naposledy teleportoval. */
  posledniTeleportMs: number
  /** Frost Aura (schopnost) — do kdy (stav.cas) tenhle konkrétní
   *  nepřítel platí za zpomaleného. -Infinity = nikdy nezasažen. Appka
   *  to čte KAŽDÝ tik v AI smyčce (engine.ts), stejný "vyhodnoť při
   *  čtení, nic si neukládej navíc" vzor jako boss's vlastní faze
   *  přepočítávaná z hp/maxHp. */
  zpomalenoDoMs: number
}

export interface HracStav {
  pozice: Pozice2D
  hp: number
  maxHp: number
  rychlost: number
  damage: number
  dosahUtoku: number
  utokyZaSekundu: number
  polomer: number
  /** 0..1 — Ranger má podle zadání 5 %. */
  kritickaSance: number
  kritickyNasobic: number
  /** Kdy naposledy vystřelil/sekl — cooldown auto-útoku. */
  posledniUtokMs: number
  /** Bod 11 zadání — úroveň PRO TENHLE BĚH, ne appčin účtový level
   *  (useGamificationStore). Roste podle stav.xpZaBeh přes
   *  data/uroven.ts's prahXpProUroven, viz engine.ts's zkontrolujLevelUp. */
  uroven: number
  /** Bod 11/12 zadání (krok 4/4, aktivní používání schopností) — kdy
   *  (stav.cas) byla naposledy použitá která SchopnostDef.id — appka
   *  na to potřebuje jen jeden záznam na schopnost, cooldown se počítá
   *  porovnáním proti stav.cas, stejný vzor jako posledniUtokMs výš. */
  posledniPouzitiSchopnosti: Record<string, number>
  /** Jen 'energy_shield' — kolik poškození dokáže štít ještě pohltit,
   *  než zmizí (viz engine.ts's zpusobPoskozeniHraci). 0 = štít
   *  neaktivní. */
  stitAbsorpce: number
  /** Jen 'energy_shield' — do kdy (stav.cas) štít vůbec platí, i kdyby
   *  stitAbsorpce ještě neklesla na 0 — "Dočasný štít" (temporary) a
   *  "pohlcující poškození" (absorbing damage) appka bere jako DVĚ
   *  nezávislé podmínky konce, ne jednu: appka ho zruší tím, co
   *  nastane dřív, stejná "lapsed OR consumed" logika jako Souboj's
   *  vlastní stitAktivni (jednorázový blok), jen s reálnou kapacitou
   *  místo jednoho úderu. */
  stitVyprsiMs: number
}

/** Playable postava (bod 9 zadání) — v první verzi jen Ranger, ale
 *  tvar dovoluje přidat další (Tank/Warrior/Mage/Hunter/Cyber) jako
 *  další záznamy, stejný vzor jako MonstrumDef. */
export interface PostavaDef {
  id: string
  jmeno: string
  emoji: string
  hp: number
  damage: number
  rychlost: number
  kritickaSance: number
}

export interface VlnaKonfigurace {
  cislo: number
  jeBoss: boolean
  pocetNepratel: number
  intervalSpawnuMs: number
  /** Násobič HP/damage nepřátel v týhle vlně. */
  statMultiplikator: number
  dostupneTypy: MonstrumId[]
}

export interface ZaznamUdalosti {
  id: string
  text: string
  cas: number
}

/** Health Orb / Potion — appčino "co nám ještě zbývá" ze seznamu
 *  CLAUDE.md ("Health Orb/Potion pickups on the map"). Na rozdíl od
 *  kořisti ze zabití (loot.ts, jen čísla — XP/Gold/Crystal) je tohle
 *  SKUTEČNÝ objekt v aréně, co appka periodicky spawnuje (viz
 *  engine.ts's vlastní konstanty), a hráč ho sebere prostým průchodem
 *  přes jeho pozici — žádné tlačítko, žádný inventář, stejná
 *  "sebráno = spotřebováno okamžitě" jednoduchost jako appčiny
 *  ostatní pickupy jinde (Buddyho Trh nemá obdobu, tohle je appčina
 *  první). */
export type TypPickupu = 'orb' | 'lektvar'

export interface PickupInstance {
  id: string
  typ: TypPickupu
  pozice: Pozice2D
}

export type DuvodKonceBehu = 'smrt' | 'extrakce' | null

export interface SurvivalHerniStav {
  cas: number
  vlna: number
  /** 'extrakce' — bod 18 zadání ("continue or extract"): vlna je
   *  hotová, appka čeká na hráčovo rozhodnutí (engine/engine.ts's
   *  `extrahovat`/`pokracovatVeVlne`), žádní noví nepřátelé se
   *  nespawnují, dokud appka nedostane odpověď. */
  faceVlny: 'spawnuje' | 'boss-spawnuje' | 'boss-boj' | 'extrakce'
  zbyvaSpawnovat: number
  posledniSpawnMs: number
  aktivniNepratele: NepritelInstance[]
  /** Health Orb/Potion na zemi — viz PickupInstance's vlastní komentář. */
  pickupy: PickupInstance[]
  posledniPickupSpawnMs: number
  hrac: HracStav
  xpZaBeh: number
  goldZaBeh: number
  krystalZaBeh: number
  zabitiCelkem: number
  bossPorazenoZaBeh: number
  konec: boolean
  duvodKonce: DuvodKonceBehu
  log: ZaznamUdalosti[]
  /** Bod 11 zadání (level-up) — pole 3 nabídnutých perk id, dokud appka
   *  čeká na hráčovo rozhodnutí (viz engine.ts's vyberPerk); `null`,
   *  když žádná volba neběží. Dokud je nenulové, `krokHry` CELOU hru
   *  pozastaví — appka nechce, aby nepřátelé dál chodili/útočili,
   *  zatímco hráč čte tři karty a vybírá, stejná "žádné noví nepřátelé
   *  ani pohyb, dokud neproběhne rozhodnutí" zásada jako u faceVlny
   *  'extrakce', jen širší (tam appka pořád nechává souboj doběhnout,
   *  tady ne — level-up může nastat i uprostřed vlny, ne jen na jejím
   *  konci). */
  levelUpNabidka: string[] | null
  /** Bod 12 zadání (build/synergy systém) — perkId → kolikrát byl
   *  vybraný (perky se dají stackovat). Appka to sleduje od začátku
   *  kroku 1, i než existovalo UI, co by to čtenářsky využilo — stejná
   *  "data existují dřív než jejich spotřebitel" věc jako zbraně/
   *  schopnosti v první verzi appky. */
  ziskanePerky: Record<string, number>
  /** Bod 12 zadání (krok 3/4) — id synergií (data/synergie.ts), co
   *  appka UŽ tenhle běh udělila (viz engine.ts's zkontrolujSynergie).
   *  Bez týhle evidence by appka nemohla poznat, jestli má bonus
   *  přičíst poprvé, nebo jestli ho hráč už jednou dostal a podmínka
   *  (např. 'stack' se stejným perkem) prostě pořád platí. */
  aplikovaneSynergie: string[]
}
