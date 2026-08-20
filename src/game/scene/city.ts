import * as THREE from 'three'
import {
  ARENA_RADIUS,
  CITY_OUTER,
  HOTSPOTS,
  WALL_RADIUS,
} from '../constants'
import type { Hotspot, HotspotId } from '../types'
import { createRandom } from './random'
import {
  createGround,
  createLighting,
  createMountains,
  createPlateau,
  createRiver,
  createSky,
} from './environment'
import { createClouds } from './clouds'
import { createForest } from './forest'
import { createStreets } from './streets'
import { createWalls } from './walls'
import { createBuildings } from './buildings'
import { createArena } from './arena'
import { createCastle } from './castle'

// ==========================================
// Složení celé scény.
//
// Semínko je napevno, takže město vypadá při každém otevření stejně —
// viz komentář v random.ts.
// ==========================================

const SEMINKO = 20260819

export interface CityScene {
  root: THREE.Group
  hotspots: Hotspot[]
  /** Prstenec arény, se kterým hýbe animační smyčka */
  arenaRing: THREE.Mesh
}

/** Kroužek na zemi, který ukazuje, že se na tuhle část dá klepnout. */
const createGlowRing = (
  polomer: number,
  barva: string,
  vyska: number
): THREE.Mesh => {
  const geometry = new THREE.RingGeometry(polomer, polomer + 1.6, 64)
  geometry.rotateX(-Math.PI / 2)

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: barva,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    })
  )
  mesh.position.y = vyska
  mesh.renderOrder = 2
  return mesh
}

export const createCityScene = (): CityScene => {
  const random = createRandom(SEMINKO)
  const root = new THREE.Group()
  root.name = 'mesto-korene'

  // --- prostředí ---
  root.add(createSky())
  for (const svetlo of createLighting()) root.add(svetlo)
  root.add(createGround())
  root.add(createRiver())
  root.add(createPlateau(random))
  root.add(createMountains(random))
  root.add(createForest(random))
  root.add(createClouds(random))

  // --- město ---
  const ulice = createStreets()
  if (ulice) root.add(ulice)

  const arena = createArena()
  const budovy = createBuildings(random)
  const hradby = createWalls()
  const hrad = createCastle(random)

  root.add(arena.group, budovy.group, hradby.group, hrad.group)

  // --- klikatelné části ---
  const meta = (id: HotspotId) => {
    const nalezeno = HOTSPOTS.find((h) => h.id === id)
    if (!nalezeno) throw new Error(`Chybí popis pro část města: ${id}`)
    return nalezeno
  }

  const kroužky: Record<HotspotId, THREE.Mesh> = {
    arena: createGlowRing(ARENA_RADIUS + 1.2, meta('arena').color, 0.9),
    mesto: createGlowRing(CITY_OUTER + 1, meta('mesto').color, 0.5),
    brany: createGlowRing(WALL_RADIUS + 4, meta('brany').color, 0.4),
    hrad: createGlowRing(17, meta('hrad').color, 0.6),
  }

  // Kroužek u hradu patří k němu, ne do středu města
  kroužky.hrad.position.set(hrad.vrchol.x, 0.6, hrad.vrchol.z + 6)

  for (const kroužek of Object.values(kroužky)) root.add(kroužek)

  const hotspots: Hotspot[] = [
    {
      meta: meta('arena'),
      objects: arena.targets,
      anchor: new THREE.Vector3(0, 12, 0),
      glow: kroužky.arena,
    },
    {
      meta: meta('hrad'),
      objects: hrad.targets,
      anchor: hrad.vrchol,
      glow: kroužky.hrad,
    },
    {
      meta: meta('mesto'),
      objects: budovy.targets,
      // Popisek města se posadí nad zástavbu stranou od arény, aby
      // nepřekrýval popisek arény uprostřed.
      anchor: new THREE.Vector3(CITY_OUTER * 0.68, 34, -CITY_OUTER * 0.34),
      glow: kroužky.mesto,
    },
    {
      meta: meta('brany'),
      objects: hradby.targets,
      // Popisek sedí nízko a před hradbou. Při nízkém sklonu kamery se
      // body blíž k ní promítají níž, takže takhle skončí u spodního
      // okraje a nepřekryje arénu uprostřed.
      anchor: new THREE.Vector3(0, 4, WALL_RADIUS + 34),
      glow: kroužky.brany,
    },
  ]

  return { root, hotspots, arenaRing: arena.ring }
}

/**
 * Uvolní paměť na grafické kartě.
 *
 * Bez tohohle by každý návrat do hry nechal v paměti celou předchozí
 * scénu — React komponentu odpojí, ale WebGL o tom neví.
 */
export const disposeScene = (root: THREE.Object3D): void => {
  root.traverse((objekt) => {
    const mesh = objekt as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()

    const material = mesh.material
    if (Array.isArray(material)) material.forEach((m) => m.dispose())
    else if (material) material.dispose()
  })
}
