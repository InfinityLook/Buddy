import * as THREE from 'three'
import { ARENA_RADIUS, PALETTE } from '../constants'
import { DilGeometrie, matrixFor, mergeToMesh } from './merge'

// ==========================================
// Aréna uprostřed města — svítící kruh, který je na obrázku první, co
// padne do oka. Je to zároveň hlavní tlačítko scény.
//
// Není to jen plochý disk: kolem písčiny je stupňovité hlediště a nad
// ním svítící prstenec. Plochý kruh vypadal z výšky jako díra v dlažbě,
// stupně z něj udělají stavbu.
// ==========================================

/** Poloměr samotné písčiny; hlediště leží mezi ní a ARENA_RADIUS. */
const PISCINA_RADIUS = ARENA_RADIUS * 0.72

/** Kolik stupňů má hlediště */
const STUPNU = 3

export interface ArenaScene {
  group: THREE.Group
  targets: THREE.Object3D[]
  /** Prstenec, jehož záře pulzuje — hýbe s ním animační smyčka */
  ring: THREE.Mesh
}

export const createArena = (): ArenaScene => {
  const skupina = new THREE.Group()
  skupina.name = 'arena'

  // Písčina uprostřed
  const piscina = new THREE.Mesh(
    new THREE.CylinderGeometry(PISCINA_RADIUS, PISCINA_RADIUS, 0.8, 48),
    new THREE.MeshStandardMaterial({ color: PALETTE.arena, roughness: 0.95 })
  )
  piscina.position.y = 0.4
  piscina.receiveShadow = true
  skupina.add(piscina)

  // Hlediště: soustředné stupně, každý o kus výš a širší. Slučují se do
  // jednoho tělesa — samostatně by to bylo pár kreslicích volání navíc
  // za něco, co se nikdy nehne.
  const stupne: DilGeometrie[] = []
  const sirkaStupne = (ARENA_RADIUS - PISCINA_RADIUS) / STUPNU

  for (let i = 0; i < STUPNU; i++) {
    const vnitrni = PISCINA_RADIUS + i * sirkaStupne
    const vnejsi = vnitrni + sirkaStupne
    const vyska = 1.1 + i * 0.9

    stupne.push({
      geometry: new THREE.CylinderGeometry(vnejsi, vnejsi, vyska, 48, 1, true),
      matrix: matrixFor({ x: 0, y: vyska / 2, z: 0 }),
    })
    // Vodorovná plocha stupně, po které by se dalo chodit
    const plocha = new THREE.RingGeometry(vnitrni, vnejsi, 48)
    plocha.rotateX(-Math.PI / 2)
    stupne.push({ geometry: plocha, matrix: matrixFor({ x: 0, y: vyska, z: 0 }) })
  }

  const hlediste = mergeToMesh(
    stupne,
    new THREE.MeshStandardMaterial({
      color: PALETTE.hradba,
      roughness: 0.92,
      side: THREE.DoubleSide,
    })
  )
  if (hlediste) skupina.add(hlediste)

  const vyskaHlediste = 1.1 + (STUPNU - 1) * 0.9

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
  prstenec.position.y = vyskaHlediste + 0.1
  skupina.add(prstenec)

  // Světlo z prstence dopadá na okolní domy — bez něj by kruh vypadal
  // jako nalepený obrázek, ne jako zdroj záře.
  const svetlo = new THREE.PointLight(PALETTE.arenaZar, 26, 60, 2)
  svetlo.position.set(0, 6, 0)
  skupina.add(svetlo)

  // Značení na písčině
  for (const polomer of [PISCINA_RADIUS * 0.66, PISCINA_RADIUS * 0.34]) {
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

  return {
    group: skupina,
    targets: hlediste ? [piscina, hlediste, prstenec] : [piscina, prstenec],
    ring: prstenec,
  }
}
