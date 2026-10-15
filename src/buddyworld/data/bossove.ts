import { NepritelDef } from '../types'

// ==========================================
// Appčin boss — Lesní strážce. Žije v odděleném souboru od
// data/nepratele.ts, protože boss nemá být "běžný nepřítel s větším
// HP" (zadání to výslovně zakazuje): rozšiřuje BossDef o pole, co
// běžný nepřítel vůbec nemá — dormanci (boss nikdy automaticky
// nehoní, dokud ho hráč sám nevzbudí "Vyzvat" akcí ve scéně), zuřivou
// fázi po poklesu HP a druhý, odlišný útok (plošný otřes země, ne jen
// melee). Boss stojí trvale na jednom pevném místě arény (jeho
// "háj"), ne nahodile jako běžní nepřátelé — appka ho tím dělá
// rozpoznatelným herním místem, ne jen dalším nepřítelem v davu.
// ==========================================

export interface BossDef extends NepritelDef {
  jeBoss: true
  /** Frakce maxHp, pod kterou boss vstoupí do zuřivé fáze. */
  zuriPodHp: number
  /** Násobič poškození obou bossových útoků ve zuřivé fázi. */
  zuriNasobicPoskozeni: number
  /** Dosah druhého útoku — plošný otřes země, appka ho spouští podle
   *  téhle vlastní hodnoty, bez ohledu na dosahUtoku prvního (melee)
   *  útoku. */
  dosahUtokuOtresu: number
  poskozeniOtresu: number
  cooldownUtokuOtresuMs: number
  /** Dosah, ze kterého appka hráči ve scéně ukáže tlačítko "Vyzvat" —
   *  boss nikdy nehoní sám od sebe, dokud ho hráč touhle akcí
   *  nevzbudí. */
  dosahProbuzeni: number
}

export const FOREST_GUARDIAN: BossDef = {
  id: 'lesni-strazce-boss',
  jmeno: 'Lesní strážce',
  ikona: '🌲',
  maxHp: 260,
  poskozeni: 16,
  dosahUtoku: 2.2,
  // combat/bossEngine.ts's krokAiBosse appku vůbec nečte — bosse
  // appka honí, jen jakmile ho hráč vzbudí (probuzen), ne podle téhle
  // vzdálenosti; appka ji drží jen proto, že BossDef dědí z
  // NepritelDef, kde je pole povinné.
  dosahDetekce: 9999,
  rychlost: 1.8,
  cooldownUtokuMs: 1800,
  odmenaXp: 150,
  model: null,
  barvaTela: '#4a3b2a',
  barvaHalo: '#ffd27a',
  meritko: 2.4,
  tvar: 'ostruha',
  jeBoss: true,
  zuriPodHp: 0.45,
  zuriNasobicPoskozeni: 1.5,
  dosahUtokuOtresu: 4.5,
  poskozeniOtresu: 14,
  cooldownUtokuOtresuMs: 4200,
  dosahProbuzeni: 3.6,
}

// Appka bosse drží jako pole, stejná konvence jako NEPRATELE/MASKOTI
// jinde v appce, i když tu dnes stojí jen jeden — další boss později
// bude jen nový záznam v téhle tabulce.
export const BOSSOVE: BossDef[] = [FOREST_GUARDIAN]

export const VYCHOZI_BOSS_ID = FOREST_GUARDIAN.id

export const bossPodleId = (id: string): BossDef => BOSSOVE.find((b) => b.id === id) ?? BOSSOVE[0]
