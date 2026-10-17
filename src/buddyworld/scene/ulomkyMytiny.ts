import * as THREE from 'three'
import { ULOMKY_MYTINY } from '../data/ulomkyMytiny'

/** Tři samostatné sběratelské objekty; bez dodatečných textur a síťových assetů. */
export function vytvorUlomkyMytiny(scene: THREE.Scene) {
  const geometrie = new THREE.OctahedronGeometry(0.32, 0)
  const material = new THREE.MeshStandardMaterial({ color: 0xa7f8ff, emissive: 0x37a3ed, emissiveIntensity: 0.9, roughness: 0.18 })
  const skupina = new THREE.Group()
  skupina.name = 'sberatelne-ulomky-mytiny'
  const meshe = ULOMKY_MYTINY.map((u, i) => {
    const mesh = new THREE.Mesh(geometrie, material)
    mesh.position.set(u.pozice.x, 0.7, u.pozice.z)
    mesh.rotation.y = i * 0.8
    skupina.add(mesh)
    return mesh
  })
  scene.add(skupina)
  return {
    aktualizuj(sebrane: readonly string[], cas: number) {
      meshe.forEach((mesh, i) => {
        mesh.visible = !sebrane.includes(ULOMKY_MYTINY[i].id)
        mesh.position.y = 0.7 + Math.sin(cas * 0.002 + i * 1.6) * 0.13
        mesh.rotation.y += 0.012
      })
    },
    uvolni() { scene.remove(skupina); geometrie.dispose(); material.dispose() },
  }
}
