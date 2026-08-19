import * as THREE from 'three'
import { ARENA_RADIUS, PALETTE } from '../constants'

// ==========================================
// Aréna uprostřed města — svítící kruh, který je na obrázku první, co
// padne do oka. Je to zároveň hlavní tlačítko scény.
// ==========================================

export interface ArenaScene {
  group: THREE.Group
  targets: THREE.Object3D[]
  /** Prstenec, jehož záře pulzuje — hýbe s ním animační smyčka */
  ring: THREE.Mesh
}

export const createArena = (): ArenaScene => {
  const skupina = new THREE.Group()
  skupina.name = 'arena'

  // Dlážděná plocha
  const plocha = new THREE.Mesh(
    new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS, 0.8, 48),
    new THREE.MeshStandardMaterial({ color: PALETTE.arena, roughness: 0.9 })
  )
  plocha.position.y = 0.4
  plocha.receiveShadow = true
  skupina.add(plocha)

  // Svítící prstenec po obvodu. Materiál je Basic a toneMapped: false,
  // aby ho tónování nestáhlo do šeda a zůstal opravdu zářivý.
  const prstenecGeom = new THREE.RingGeometry(ARENA_RADIUS - 0.9, ARENA_RADIUS + 0.5, 64)
  prstenecGeom.rotateX(-Math.PI / 2)

  const prstenec = new THREE.Mesh(
    prstenecGeom,
    new THREE.MeshBasicMaterial({
      color: PALETTE.arenaZar,
      toneMapped: false,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    })
  )
  prstenec.position.y = 0.85
  skupina.add(prstenec)

  // Světlo z prstence dopadá na okolní domy — bez něj by kruh vypadal
  // jako nalepený obrázek, ne jako zdroj záře.
  const svetlo = new THREE.PointLight(PALETTE.arenaZar, 26, 60, 2)
  svetlo.position.set(0, 6, 0)
  skupina.add(svetlo)

  // Vnitřní kruhy jako dlažba
  for (const polomer of [ARENA_RADIUS * 0.62, ARENA_RADIUS * 0.32]) {
    const geom = new THREE.RingGeometry(polomer - 0.25, polomer, 48)
    geom.rotateX(-Math.PI / 2)
    const kruh = new THREE.Mesh(
      geom,
      new THREE.MeshBasicMaterial({
        color: PALETTE.arenaZar,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      })
    )
    kruh.position.y = 0.82
    skupina.add(kruh)
  }

  return { group: skupina, targets: [plocha, prstenec], ring: prstenec }
}
