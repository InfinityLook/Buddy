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
