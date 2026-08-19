import type * as THREE from 'three'

// ==========================================
// Tvary herní scény.
//
// Město je zatím jen rozcestník: každá jeho část je tlačítko, které
// teprve dostane obsah. Proto je hotspot samostatný typ — až se na něj
// bude napojovat hra, přibude mu cíl, ne nová struktura.
// ==========================================

export type HotspotId = 'arena' | 'hrad' | 'mesto' | 'brany'

export interface HotspotMeta {
  id: HotspotId
  title: string
  /** Krátký popisek pod názvem */
  subtitle: string
  icon: string
  /** Barva popisku a záře pod danou částí města */
  color: string
}

/**
 * Část města, na kterou se dá klepnout.
 *
 * `objects` jsou tělesa, přes která se trefa počítá; `anchor` je bod
 * v prostoru, nad kterým se vznáší popisek. Popisek se každý snímek
 * promítá do 2D, takže drží nad svým místem i při otáčení kamery.
 */
export interface Hotspot {
  meta: HotspotMeta
  objects: THREE.Object3D[]
  anchor: THREE.Vector3
  /** Kroužek na zemi, který se rozsvítí při najetí */
  glow: THREE.Mesh
}

/** Poloha popisku na obrazovce, spočítaná z 3D bodu. */
export interface HotspotScreenPosition {
  id: HotspotId
  x: number
  y: number
  /** Za kamerou nebo moc daleko — popisek se schová */
  visible: boolean
  /** Vzdálenost od kamery; podle ní se řadí, aby bližší byl navrchu */
  depth: number
}
