// ==========================================
// Konfigurace 3D průzkumného světa pro jednotlivé lokace — data pro
// game/explorace/usePlayerWorld.ts, žádná geometrie ani barva natvrdo
// v komponentě. Svět samotný nemá stažené modely ani textury (offline-
// first, žádná závislost na cizím CDN, stejná zásada jako u
// mediapipe/mapa-sveta.jpg) — je poskládaný z jednoduchých Three.js
// primitiv (kvádry, kužely, koule) obarvených podle týhle konfigurace,
// stylizovaný "low-poly" vzhled místo nedosažitelného fotorealismu.
//
// Zatím dvě lokace (Emberfall, dungeon Molten Core). Další lokace ze
// Season 1 (Old Forest, Shadowfall, Frostheim, …) přibydou stejným
// vzorem — nová položka sem + odpovídající quest v quests.ts (nebo u
// dungeonu rovnou několik nepřátel v combat/nepratele.ts).
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
}
