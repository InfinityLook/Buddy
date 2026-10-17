/** Procedurální značky fragmentů; bez externích textur a modelů. */
import * as THREE from 'three'
import { FRAGMENTY_RUIN } from '../fragmentyRuin'
export function vytvorFragmentyRuin3D(): THREE.Group {
  const group = new THREE.Group()
  group.name = 'BuddyWorld_FragmentyRuin'
  const barvy = [0x81e5db, 0xa6e578, 0xffd87a]
  FRAGMENTY_RUIN.forEach((fragment, index) => {
    const podstavec = new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.55,0.3,6), new THREE.MeshStandardMaterial({color:0x656779,roughness:0.9}))
    podstavec.position.set(fragment.x,0.15,fragment.z)
    group.add(podstavec)
    const material = new THREE.MeshStandardMaterial({color:barvy[index],emissive:barvy[index],emissiveIntensity:0.5,roughness:0.35})
    const krystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.3),material)
    krystal.position.set(fragment.x,0.68,fragment.z)
    group.add(krystal)
  })
  return group
}
