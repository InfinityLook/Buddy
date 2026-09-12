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
  hrac: HracStav
  xpZaBeh: number
  goldZaBeh: number
  krystalZaBeh: number
  zabitiCelkem: number
  bossPorazenoZaBeh: number
  konec: boolean
  duvodKonce: DuvodKonceBehu
  log: ZaznamUdalosti[]
}
