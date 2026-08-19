import * as THREE from 'three'
import { CASTLE_ANGLE, CASTLE_DISTANCE, PALETTE } from '../constants'
import { DilGeometrie, matrixFor, mergeToMesh } from './merge'
import type { Random } from './random'

// ==========================================
// Hrad na skále za městem. Je to nejvyšší bod scény, takže drží pohled
// a slouží jako orientační značka při otáčení kamery.
//
// Stejně jako hradby se skládá z dílů, které se na konci slučují podle
// materiálu do tří těles — viz komentář v merge.ts.
// ==========================================

const materialSkala = new THREE.MeshStandardMaterial({
  color: PALETTE.skalaTmava,
  roughness: 1,
  flatShading: true,
})
const materialZed = new THREE.MeshStandardMaterial({
  color: PALETTE.vez,
  roughness: 0.9,
})
const materialStrecha = new THREE.MeshStandardMaterial({
  color: PALETTE.strechaModra,
  roughness: 0.8,
})

/** Věž hradu — tělo do zdí, střecha do střech. */
const vez = (
  zdi: DilGeometrie[],
  strechy: DilGeometrie[],
  x: number,
  y: number,
  z: number,
  vyska: number,
  polomer: number
): void => {
  zdi.push({
    geometry: new THREE.CylinderGeometry(polomer, polomer * 1.08, vyska, 8),
    matrix: matrixFor({ x, y: y + vyska / 2, z }),
  })
  strechy.push({
    geometry: new THREE.ConeGeometry(polomer * 1.3, vyska * 0.55, 8),
    matrix: matrixFor({ x, y: y + vyska + (vyska * 0.55) / 2, z }),
  })
}

export const createCastle = (
  random: Random
): { group: THREE.Group; targets: THREE.Object3D[]; vrchol: THREE.Vector3 } => {
  const skupina = new THREE.Group()
  skupina.name = 'hrad'

  const stred = new THREE.Vector3(
    Math.cos(CASTLE_ANGLE) * CASTLE_DISTANCE,
    0,
    Math.sin(CASTLE_ANGLE) * CASTLE_DISTANCE
  )

  const skaly: DilGeometrie[] = []
  const zdi: DilGeometrie[] = []
  const strechy: DilGeometrie[] = []

  // Skála pod hradem. Několik přeložených kuželů vypadá členitěji než
  // jeden — hrad tak nestojí na hladkém kopečku.
  const vyskaSkaly = 15
  for (let i = 0; i < 5; i++) {
    const polomer = random.rozsah(9, 16)
    const vyska = vyskaSkaly * random.rozsah(0.6, 1)
    skaly.push({
      geometry: new THREE.ConeGeometry(polomer, vyska, random.cele(5, 7), 1),
      matrix: matrixFor(
        {
          x: stred.x + random.rozsah(-8, 8),
          y: vyska / 2 - 2,
          z: stred.z + random.rozsah(-8, 8),
        },
        random.rozsah(0, Math.PI * 2)
      ),
    })
  }

  // Nádvoří, na kterém hrad stojí
  zdi.push({
    geometry: new THREE.CylinderGeometry(13, 15, 4, 12),
    matrix: matrixFor({ x: stred.x, y: vyskaSkaly - 2, z: stred.z }),
  })

  // Hlavní budova
  zdi.push({
    geometry: new THREE.BoxGeometry(16, 13, 11),
    matrix: matrixFor({ x: stred.x, y: vyskaSkaly + 6.5, z: stred.z }),
  })
  strechy.push({
    geometry: new THREE.ConeGeometry(11, 7, 4),
    // Jehlan má hranu proti ose, pootočení o 45° ho srovná se stěnami
    matrix: matrixFor({ x: stred.x, y: vyskaSkaly + 16.5, z: stred.z }, Math.PI / 4),
  })

  // Věže: nejvyšší uprostřed vzadu, nižší po rozích
  vez(zdi, strechy, stred.x, vyskaSkaly, stred.z - 6, 30, 3.6)
  vez(zdi, strechy, stred.x - 9, vyskaSkaly, stred.z + 3, 20, 2.8)
  vez(zdi, strechy, stred.x + 9, vyskaSkaly, stred.z + 3, 22, 2.8)
  vez(zdi, strechy, stred.x - 5, vyskaSkaly, stred.z - 9, 17, 2.4)
  vez(zdi, strechy, stred.x + 5, vyskaSkaly, stred.z - 9, 17, 2.4)

  for (const [dily, material] of [
    [skaly, materialSkala],
    [zdi, materialZed],
    [strechy, materialStrecha],
  ] as const) {
    const mesh = mergeToMesh(dily, material)
    if (mesh) skupina.add(mesh)
  }

  // Bod pro popisek: nad špičkou nejvyšší věže
  const vrchol = new THREE.Vector3(stred.x, vyskaSkaly + 30 + 9, stred.z - 6)

  return { group: skupina, targets: [skupina], vrchol }
}
