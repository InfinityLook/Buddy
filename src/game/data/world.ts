// ==========================================
// Konfigurace 3D průzkumného světa pro jednotlivé lokace — data pro
// game/explorace/usePlayerWorld.ts, žádná geometrie ani barva natvrdo
// v komponentě. Svět samotný nemá stažené modely ani textury (offline-
// first, žádná závislost na cizím CDN, stejná zásada jako u
// mediapipe/mapa-sveta.jpg) — je poskládaný z jednoduchých Three.js
// primitiv (kvádry, kužely, koule) obarvených podle týhle konfigurace,
// stylizovaný "low-poly" vzhled místo nedosažitelného fotorealismu.
//
// Zatím jedna lokace (Emberfall). Další lokace ze Season 1 (Old
// Forest, Shadowfall, Frostheim, …) přibydou stejným vzorem — nová
// položka sem + odpovídající quest v quests.ts + nepřítel v
// combat/nepratele.ts.
// ==========================================

export type TerenTyp = 'pole' | 'les'

export interface SvetKonfigurace {
  /** Barva oblohy/mlhy v dálce — dává lokaci vlastní náladu bez
   *  jakékoli textury skyboxu. */
  barvaOblohy: string
  /** Barva mlhy — obvykle stejná jako obloha, ať splynou v dálce. */
  barvaMlhy: string
  barvaZeme: string
  /** Jak hustě a jakým typem dekorace (stromy/kameny) se poseje
   *  plocha — 'les' dá o dost víc a hustších objektů než 'pole'. */
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
}
