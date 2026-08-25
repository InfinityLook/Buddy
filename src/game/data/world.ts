// ==========================================
// Konfigurace 3D průzkumného světa pro jednotlivé lokace — data pro
// game/explorace/usePlayerWorld.ts, žádná geometrie ani barva natvrdo
// v komponentě. Svět samotný nemá stažené modely ani textury (offline-
// first, žádná závislost na cizím CDN, stejná zásada jako u
// mediapipe/mapa-sveta.jpg) — je poskládaný z jednoduchých Three.js
// primitiv (kvádry, kužely, koule) obarvených podle týhle konfigurace,
// stylizovaný "low-poly" vzhled místo nedosažitelného fotorealismu.
//
// Šest lokací (Emberfall, dungeon Molten Core, Greenhaven, Voidspire,
// Frostheim, Solace) — Solace uzavírá hlavní dějovou linku Season 1
// (viz combat/nepratele.ts a data/quests.ts), zbývají už jen vedlejší
// questy stejným vzorem — nová položka sem + odpovídající quest v
// quests.ts (nebo u dungeonu rovnou několik nepřátel v
// combat/nepratele.ts).
//
// Greenhaven si přitom drží svůj vlastní typ 'mesto' v lokace.ts beze
// změny (viz Fáze 7 — přítomnost tady rozhoduje o 3D vstupu, ne typ na
// mapě) — 3D svět představuje Věčný les kolem města, ne město samotné,
// stejně jako Emberfallův svět jsou pole za městem, ne Emberfall sám.
//
// Přítomnost lokace v týhle mapě je to jediné, co rozhoduje, jestli
// má 3D průzkum — MapaSveta.tsx to čte přímo odsud (SVETY_PODLE_LOKACE[id]),
// ne z Lokace.typ. Molten Core tak zůstává typ 'dungeon' (svůj vlastní
// popisek a barvu na mapě) a přitom dostal 3D svět stejně jako
// 'explorace' lokace — typ (co to *je*) a přítomnost 3D světa (*jak*
// se tam vstupuje) jsou dvě nezávislé věci, netřeba je nutit do
// jednoho pole.
// ==========================================

export type TerenTyp = 'pole' | 'les' | 'jeskyne'

export interface SvetKonfigurace {
  /** Barva oblohy/mlhy v dálce — dává lokaci vlastní náladu bez
   *  jakékoli textury skyboxu. */
  barvaOblohy: string
  /** Barva mlhy — obvykle stejná jako obloha, ať splynou v dálce. */
  barvaMlhy: string
  barvaZeme: string
  /** Jak hustě a jakým typem dekorace (stromy/kameny) se poseje
   *  plocha — 'les' dá o dost víc a hustších objektů než 'pole',
   *  'jeskyne' jen kameny (stromy pod zemí nedávají smysl). */
  teren: TerenTyp
  /** Poloměr hratelné plochy ve světových jednotkách — hráč dál od
   *  středu neprojde (neviditelná hranice). */
  polomerSveta: number
  /** Startovní pozice hráče [x, z]. */
  start: [number, number]
  /** Pozice setkání s nepřítelem [x, z] — když se k ní hráč přiblíží
   *  na polomerSetkani, spustí se souboj (viz Explorace3D.tsx). */
  poziceSetkani: [number, number]
  polomerSetkani: number
}

export const SVETY_PODLE_LOKACE: Record<string, SvetKonfigurace> = {
  emberfall: {
    barvaOblohy: '#4a2416',
    barvaMlhy: '#3a1c12',
    barvaZeme: '#5c3a22',
    teren: 'pole',
    polomerSveta: 26,
    start: [0, 10],
    poziceSetkani: [0, -10],
    polomerSetkani: 3.2,
  },
  'dungeon-stinne-jeskyne': {
    // Temná, stísněná jeskyně — menší polomerSveta než Emberfall
    // schválně, ať prostor působí klaustrofobicky, ne jako další
    // otevřená louka s jinou paletou. Nepřátelé (3 za sebou, výdrž se
    // mezi nimi neobnoví, viz combat/nepratele.ts) čekají na konci —
    // 3D svět je jen "vstupní chodba", souboj samotný beze změny
    // dál běží ve stávajícím Souboj.tsx/useSouboj.ts.
    barvaOblohy: '#0d0a16',
    barvaMlhy: '#100c1c',
    barvaZeme: '#2b2438',
    teren: 'jeskyne',
    polomerSveta: 16,
    start: [0, 7],
    poziceSetkani: [0, -7],
    polomerSetkani: 3,
  },
  greenhaven: {
    // Věčný les (Elenwood) — hustý, tmavě zelený, jediné setkání na
    // konci (stejný tvar jako Emberfall: jedno 'explorace' místo, jeden
    // Nepritel v poli, žádná dungeonová série), tady rovnou boss.
    barvaOblohy: '#16321f',
    barvaMlhy: '#1d3f27',
    barvaZeme: '#23421f',
    teren: 'les',
    polomerSveta: 24,
    start: [0, 9],
    poziceSetkani: [0, -9],
    polomerSetkani: 3.2,
  },
  voidspire: {
    // Shadowveil ("The Corrupted Lands") kolem Voidspire — otrávená
    // fialová pláň, ne les ani jeskyně (teren zůstává 'pole', mění se
    // jen paleta) — stejný princip jako u Emberfallu: terén popisuje
    // hustotu/typ dekorace, náladu místa dělá barva.
    barvaOblohy: '#241830',
    barvaMlhy: '#2a1a3d',
    barvaZeme: '#3d2a4d',
    teren: 'pole',
    polomerSveta: 25,
    start: [0, 9],
    poziceSetkani: [0, -9],
    polomerSetkani: 3.2,
  },
  frostheim: {
    // Frosthold ("The Frozen North") kolem Frostheimu — mrazivá,
    // řídce zarostlá pustina, teren 'jeskyne' schválně (jen kameny/
    // ledové balvany, žádné stromy v ledu), i když samotné místo
    // jeskyně není — stejný princip jako u Voidspire: teren řídí typ
    // dekorace, ne doslovný název místa.
    barvaOblohy: '#0f1f2e',
    barvaMlhy: '#13293d',
    barvaZeme: '#1c3a4a',
    teren: 'jeskyne',
    polomerSveta: 25,
    start: [0, 9],
    poziceSetkani: [0, -9],
    polomerSetkani: 3.2,
  },
  solace: {
    // Prastará krypta pod trůnním sálem — jediná Season-1 lokace, co
    // NENÍ divočina za městem (Emberfall pole, Greenhaven les, Voidspire
    // pole, Frostheim jeskyně), ale prostor přímo pod hlavním městem
    // samotným, odpovídá finálovému rázu dějové linky. Teplá zlatavá
    // paleta (na rozdíl od studeného Molten Core) a menší polomerSveta
    // — sevřená, obřadní krypta, ne otevřená pláň.
    barvaOblohy: '#3d2b0f',
    barvaMlhy: '#4a3512',
    barvaZeme: '#5c4419',
    teren: 'jeskyne',
    polomerSveta: 20,
    start: [0, 8],
    poziceSetkani: [0, -8],
    polomerSetkani: 3.2,
  },
}
