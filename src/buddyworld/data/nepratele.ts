import { NepritelDef } from '../types'

// ==========================================
// Appčini běžní nepřátelé v prototypu — appka je drží jako pole, ne
// jeden natvrdo zapsaný objekt, ať je přidání dalšího typu později
// jen nový záznam, stejná konvence jako appčiny postavy.ts/monsters.ts
// jinde v appce. Appčin boss (Lesní strážce) žije záměrně v
// odděleném souboru data/bossove.ts, ne tady — boss má jinou
// kvalitu chování (dormance, dva útoky, zuřivost), ne jen vyšší HP
// stejného typu, a sdílení jedné appčiny tabulky by tenhle rozdíl
// zastíralo.
// ==========================================

export const NEPRATELE: NepritelDef[] = [
  {
    id: 'stinovy-vlcek',
    jmeno: 'Stínový vlček',
    ikona: '🐺',
    maxHp: 40,
    poskozeni: 6,
    dosahUtoku: 1.5,
    dosahDetekce: 7,
    rychlost: 2.6,
    cooldownUtokuMs: 1200,
    odmenaXp: 25,
    model: null,
    barvaTela: '#2d1f3f',
    barvaHalo: '#8b5cf6',
    meritko: 1,
    tvar: 'ostruha',
  },
  // Lesní slizena — druhý typ, úmyslně jiný archetyp: pomalá a málo
  // ostražitá (krátký dosahDetekce, nízká rychlost), ale vyšší maxHp
  // — appka ji přechytří oťukáním, ne přemůže rychlostí, opačný pocit
  // než vlček. Jejím reálným koncept-artem z BuddyWorld_ArtPack.zip
  // appka teď vykresluje HUD portrét (viz data/koncept.ts's klíč
  // nepritel.lesni-slizena) — 3D silueta ve scéně zůstává primitivní,
  // jen plošší "kapka" tvar, ne hotový model.
  {
    id: 'lesni-slizena',
    jmeno: 'Lesní slizena',
    ikona: '🟢',
    maxHp: 70,
    poskozeni: 4,
    dosahUtoku: 1.3,
    dosahDetekce: 5,
    rychlost: 1.1,
    cooldownUtokuMs: 1600,
    odmenaXp: 20,
    model: null,
    barvaTela: '#2f5d3a',
    barvaHalo: '#9bffa0',
    meritko: 0.9,
    tvar: 'kapka',
  },
  // Krystalový brouk: pomalý obrněný protivník, který udeří tvrdě,
  // ale hráč má čas před úderem ustoupit.
  {
    id: 'krystalovy-brouk', jmeno: 'Krystalový brouk', ikona: '💎',
    maxHp: 105, poskozeni: 12, dosahUtoku: 1.6, dosahDetekce: 5.5,
    rychlost: 0.9, cooldownUtokuMs: 2400, odmenaXp: 42, model: null,
    barvaTela: '#315a73', barvaHalo: '#4ee7ff', meritko: 1.25, tvar: 'ostruha',
  },
  // Lesní bludička: křehká a rychlá, všimne si hráče na velkou vzdálenost.
  {
    id: 'lesni-bludicka', jmeno: 'Lesní bludička', ikona: '✨',
    maxHp: 28, poskozeni: 5, dosahUtoku: 1.2, dosahDetekce: 9,
    rychlost: 3.5, cooldownUtokuMs: 950, odmenaXp: 30, model: null,
    barvaTela: '#663e86', barvaHalo: '#f2a7ff', meritko: 0.72, tvar: 'kapka',
  },
  // Season 1 – obyvatelé Křišťálové mýtiny. Zatím procedurální 3D siluety.
  {
    id: 'krystalovy-sliz', jmeno: 'Krystalový sliz', ikona: '💠',
    maxHp: 35, poskozeni: 4, dosahUtoku: 1.3, dosahDetekce: 4.5,
    rychlost: 1.3, cooldownUtokuMs: 1700, odmenaXp: 18, model: null,
    barvaTela: '#4ac6c4', barvaHalo: '#a8fff2', meritko: 0.75, tvar: 'kapka',
  },
  {
    id: 'magicka-mura', jmeno: 'Magická můra', ikona: '🦋',
    maxHp: 25, poskozeni: 5, dosahUtoku: 1.25, dosahDetekce: 6.5,
    rychlost: 3.0, cooldownUtokuMs: 1150, odmenaXp: 26, model: null,
    barvaTela: '#8763c8', barvaHalo: '#e5b7ff', meritko: 0.68, tvar: 'ostruha',
  },
  {
    id: 'krystalovy-skorpion', jmeno: 'Krystalový škorpion', ikona: '🦂',
    maxHp: 95, poskozeni: 11, dosahUtoku: 1.55, dosahDetekce: 5,
    rychlost: 1.0, cooldownUtokuMs: 2300, odmenaXp: 48, model: null,
    barvaTela: '#315b88', barvaHalo: '#80e9ff', meritko: 1.12, tvar: 'ostruha',
  },
]

export const VYCHOZI_NEPRITEL_ID = 'stinovy-vlcek'

export const nepritelPodleId = (id: string): NepritelDef => NEPRATELE.find((n) => n.id === id) ?? NEPRATELE[0]

/** Vybere nahodilý běžný typ nepřítele — appka ji volá při každém
 *  vytvoření/respawnu jednoho slotu v aréně (viz
 *  scene/useBuddyWorldScene.ts), ať žádný appčin slot nikdy natvrdo
 *  nevázne na jeden typ. Injektovatelný `nahodne` appku dělá
 *  testovatelnou bez skutečně nahodilého zdroje, stejná zásada jako
 *  appčin pokusUtokHrace v combat/engine.ts. */
export const nahodnyNepritel = (nahodne: () => number = Math.random): NepritelDef =>
  NEPRATELE[Math.floor(nahodne() * NEPRATELE.length) % NEPRATELE.length]

/** Vybere různé typy do současně viditelných slotů (bez duplicit).
 * Fisher–Yates shuffle; `nahodne` umožňuje deterministické testy. */
export function vyberRuzneNepratele(pocet: number, nahodne: () => number = Math.random): NepritelDef[] {
  const kandidati = [...NEPRATELE]
  for (let i = kandidati.length - 1; i > 0; i--) {
    const n = nahodne()
    const j = Math.max(0, Math.min(i, Math.floor((Number.isFinite(n) ? n : 0) * (i + 1))))
    ;[kandidati[i], kandidati[j]] = [kandidati[j], kandidati[i]]
  }
  return kandidati.slice(0, Math.max(0, Math.floor(pocet)))
}
