/** v10.0: Autorské procedurální ruiny na okraji magického lesa. Bez externích assetů. */
import * as THREE from 'three'

/** Ruiny jsou mimo hlavní cestu i místa lesních krystalů. */
export const RUINY_POZICE = { x: -24, z: -17 } as const

export function vytvorZapomenuteRuiny3D(): THREE.Group {
  const group = new THREE.Group()
  group.name = 'BuddyWorld_ZapomenuteRuiny'
  group.position.set(RUINY_POZICE.x, 0, RUINY_POZICE.z)
  const stone = new THREE.MeshStandardMaterial({ color: 0x666b78, roughness: 0.95 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x424757, roughness: 1 })
  const rune = new THREE.MeshStandardMaterial({ color: 0x72d7e5, emissive: 0x268ca7, emissiveIntensity: 0.8 })
  const place = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  // Nízké schodiště a oltář s runou, žádná neprůchodná brána.
  place(new THREE.BoxGeometry(7, 0.24, 5), dark, 0, 0.12, 0)
  place(new THREE.BoxGeometry(5.6, 0.22, 3.7), stone, 0, 0.34, 0)
  place(new THREE.BoxGeometry(1.5, 0.75, 1.1), dark, 0, 0.82, -1)
  const runeStone = place(new THREE.OctahedronGeometry(0.38), rune, 0, 1.45, -1)
  runeStone.scale.set(0.8, 1.2, 0.8)
  for (const x of [-2.35, 2.35]) {
    for (const z of [-1.25, 1.25]) {
      place(new THREE.CylinderGeometry(0.34, 0.42, 2.3, 6), stone, x, 1.55, z)
      place(new THREE.BoxGeometry(0.95, 0.27, 0.95), dark, x, 2.78, z)
    }
  }
  // Fragmenty zdí jen na zadní straně: hráč může ruiny obejít.
  for (const x of [-1.25, 0.2, 1.65]) {
    place(new THREE.BoxGeometry(1.25, 0.75 + (x > 0 ? 0.35 : 0), 0.5), stone, x, 0.7, -2.25)
  }
  return group
}
