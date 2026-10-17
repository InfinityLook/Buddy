/** v9.8: autorské procedurální prostředí magického lesa; bez externích assetů. */
import * as THREE from 'three'

/** Les je stranou od návsi, spawnu i hlavní cesty. Pouze vizuální dekorace. */
export const MAGICKY_LES_STRED = { x: -15, z: -6 } as const
export const MAGICKY_LES_STROMY = [
  [-20, -11], [-17, -13], [-13, -12], [-10, -9],
  [-21, -5], [-18, -3], [-12, -3], [-9, -5],
  [-20, 1], [-16, 2], [-12, 0],
] as const
export const MAGICKY_LES_KRYSTALY = [
  [-16, -7], [-12, -10], [-19, -1],
] as const

export function vytvorMagickyLes3D(): THREE.Group {
  const skupina = new THREE.Group()
  skupina.name = 'BuddyWorld_MagickyLes'
  const kura = new THREE.MeshStandardMaterial({ color: 0x382c4a, roughness: 1 })
  const koruna = new THREE.MeshStandardMaterial({ color: 0x244d4b, roughness: 1 })
  const korunaSvetla = new THREE.MeshStandardMaterial({ color: 0x34625b, roughness: 1 })
  const krystal = new THREE.MeshStandardMaterial({ color: 0x71cce0, emissive: 0x226f99, emissiveIntensity: 0.65, roughness: 0.35 })
  const mlha = new THREE.MeshBasicMaterial({ color: 0x779bb6, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })
  const kmenGeo = new THREE.CylinderGeometry(0.21, 0.34, 3.3, 6)
  const vetveGeo = new THREE.ConeGeometry(1.25, 2.5, 7)
  const krystalGeo = new THREE.OctahedronGeometry(0.62, 0)
  const mlhaGeo = new THREE.CircleGeometry(2.2, 16)
  const vloz = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo.clone(), mat.clone())
    mesh.position.set(x, y, z)
    skupina.add(mesh)
    return mesh
  }
  for (const [i, [x, z]] of MAGICKY_LES_STROMY.entries()) {
    vloz(kmenGeo, kura, x, 1.65, z)
    vloz(vetveGeo, i % 2 ? koruna : korunaSvetla, x, 3.4, z)
    const spicka = vloz(vetveGeo, koruna, x, 4.45, z)
    spicka.scale.setScalar(0.68)
  }
  for (const [x, z] of MAGICKY_LES_KRYSTALY) {
    const kamen = vloz(krystalGeo, krystal, x, 0.65, z)
    kamen.scale.set(0.8, 1.6, 0.8)
    const opar = vloz(mlhaGeo, mlha, x, 0.045, z)
    opar.rotation.x = -Math.PI / 2
  }
  // Sdílené geometrie a materiály: při úklidu scény je nutné deduplikovat dispose.
  return skupina
}
