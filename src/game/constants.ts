import type { HotspotMeta } from './types'

// ==========================================
// Rozměry a barvy města.
//
// Všechno je v jedné soustavě: světový poloměr arény je 18 jednotek
// a od něj se odvíjí zbytek. Když se změní tohle číslo, město se
// zvětší celé — proto nikde jinde nejsou rozměry napevno.
// ==========================================

/** Poloměr svítící arény uprostřed */
export const ARENA_RADIUS = 18

/** Kde začíná a končí pás domů kolem arény */
export const CITY_INNER = ARENA_RADIUS + 5
export const CITY_OUTER = 52

/** Poloměr hradby */
export const WALL_RADIUS = 58
export const WALL_HEIGHT = 9
export const WALL_THICKNESS = 3

/** Kolik věží je rozmístěných po hradbě */
export const TOWER_COUNT = 12
/** Kolik z nich je brána (rovnoměrně mezi věžemi) */
export const GATE_COUNT = 3

/** Kde stojí hrad — na skále za městem */
export const CASTLE_ANGLE = -Math.PI / 2
export const CASTLE_DISTANCE = 40

/** Hory začínají až daleko za hradbou */
export const MOUNTAIN_INNER = 110
export const MOUNTAIN_OUTER = 265

/**
 * Směr, ze kterého se hráč na město dívá na začátku, a jak široký pruh
 * kolem něj zůstane bez hor.
 *
 * Kamera stojí dál než celý prstenec hor, takže bez téhle mezery by mezi
 * ní a městem vždycky stály hory v popředí a zakrývaly ho. Otevřené údolí
 * v popředí má i předloha.
 */
export const VALLEY_ANGLE = Math.PI / 2
export const VALLEY_WIDTH = Math.PI * 0.32

// ==========================================
// Barvy. Vycházejí ze západu slunce v horách: teplá obloha, studené
// stíny, kámen do šeda a střechy do měděné a modrozelené.
// ==========================================

export const PALETTE = {
  oblohaHore: '#2a2145',
  oblohaStred: '#8d4f6a',
  oblohaDole: '#f0a04b',
  slunce: '#ffd28a',

  zemeSvetla: '#525c44',
  zemeTmava: '#39442f',
  skala: '#6e6b7d',
  skalaTmava: '#3e3c4a',

  hradba: '#7d7568',
  hradbaTmava: '#57514a',
  vez: '#8a8175',

  domZed: '#b09a80',
  domZedSvetla: '#c8b394',
  strechaMed: '#a35b3c',
  strechaModra: '#3f6b70',
  strechaSeda: '#5a5754',
  okno: '#ffc978',

  arena: '#cbbd9e',
  arenaZar: '#5fd8f0',

  // Mlha má schválně stejnou barvu jako obloha u obzoru. Jakmile se
  // liší, je přechod mezi zemí a oblohou vidět jako ostrý schod.
  mlha: '#f0a04b',
} as const

// ==========================================
// Části města, na které se dá klepnout.
//
// Zatím žádná nikam nevede — až bude co otevřít, přibude sem cíl.
// ==========================================

export const HOTSPOTS: HotspotMeta[] = [
  {
    id: 'arena',
    title: 'Aréna',
    subtitle: 'Souboje a výzvy',
    icon: '⚔️',
    color: PALETTE.arenaZar,
  },
  {
    id: 'hrad',
    title: 'Hrad',
    subtitle: 'Příběh a výpravy',
    icon: '🏰',
    color: '#c9a3ff',
  },
  {
    id: 'mesto',
    title: 'Tržiště',
    subtitle: 'Obchod a postavy',
    icon: '🏘️',
    color: '#ffc978',
  },
  {
    id: 'brany',
    title: 'Brány',
    subtitle: 'Cesta do kraje',
    icon: '🚪',
    color: '#7fe3a8',
  },
]

// ==========================================
// Kamera
// ==========================================

/**
 * Poloměr, který má být na začátku celý vidět.
 *
 * Vzdálenost kamery se z něj dopočítá podle poměru stran (viz fitDistance
 * v useGameScene). Napevno zadané číslo nefungovalo: na výšku držený
 * telefon má vodorovný zorný úhel mnohem užší než na šířku, takže stejná
 * vzdálenost, která na monitoru ukázala celé město, postavila kameru
 * doprostřed prstence hor.
 */
export const CITY_FIT_RADIUS = 60

/** Násobky dopočítané vzdálenosti — meze přiblížení a oddálení */
export const CAMERA_MIN_FACTOR = 0.4
export const CAMERA_MAX_FACTOR = 1.45

/** Jak nízko smí kamera klesnout — pod obzor se nesmí dostat */
export const CAMERA_MAX_POLAR = Math.PI * 0.44
export const CAMERA_MIN_POLAR = Math.PI * 0.1
