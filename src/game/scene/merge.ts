import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// ==========================================
// Slučování geometrie.
//
// Cimbuří, hory nebo skály pod hradem jsou stovky drobných těles, která
// sdílejí materiál. Každé zvlášť znamená jedno kreslicí volání — a právě
// jejich počet, ne trojúhelníky, je na telefonu úzké hrdlo. Po sloučení
// z nich zbude jedno těleso s jedním voláním.
//
// Za to se platí tím, že sloučená část už nemá vlastní polohu a nedá se
// s ní hýbat samostatně. U kulis, které se nikdy nehnou, to nevadí.
// ==========================================

/** Geometrie i s tím, kam ve světě patří. */
export interface DilGeometrie {
  geometry: THREE.BufferGeometry
  matrix: THREE.Matrix4
}

/**
 * Sloučí díly do jediné geometrie.
 *
 * Vstupní geometrie se převádějí na neindexované: mergeGeometries
 * odmítne směs indexovaných a neindexovaných a tvary z Three.js nejsou
 * v tomhle jednotné. Pár vrcholů navíc je levnější než pátrat, který
 * z tuctu tvarů tu podmínku porušil.
 */
export const mergeParts = (dily: DilGeometrie[]): THREE.BufferGeometry | null => {
  if (dily.length === 0) return null

  const pripravene = dily.map(({ geometry, matrix }) => {
    const kopie = geometry.toNonIndexed()
    kopie.applyMatrix4(matrix)
    // Barvy ani nic dalšího se nekopírují — díly, které se slučují, mají
    // společný materiál, takže by je stejně nikdo nepoužil.
    kopie.deleteAttribute('uv')
    return kopie
  })

  const vysledek = mergeGeometries(pripravene, false)

  // Zdrojové kopie už nikdo nepotřebuje
  for (const kopie of pripravene) kopie.dispose()

  return vysledek
}

/** Sloučí díly rovnou do meshe s daným materiálem. */
export const mergeToMesh = (
  dily: DilGeometrie[],
  material: THREE.Material,
  nastaveni: { castShadow?: boolean; receiveShadow?: boolean } = {}
): THREE.Mesh | null => {
  const geometry = mergeParts(dily)
  if (!geometry) return null

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = nastaveni.castShadow ?? true
  mesh.receiveShadow = nastaveni.receiveShadow ?? true
  return mesh
}

/** Pomůcka na sestavení matice z polohy, otočení kolem svislé osy a měřítka. */
export const matrixFor = (
  pozice: THREE.Vector3Like,
  rotaceY = 0,
  meritko: THREE.Vector3Like = { x: 1, y: 1, z: 1 }
): THREE.Matrix4 =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(pozice.x, pozice.y, pozice.z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotaceY),
    new THREE.Vector3(meritko.x, meritko.y, meritko.z)
  )
