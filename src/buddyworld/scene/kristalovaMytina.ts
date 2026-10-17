import * as THREE from 'three'
import type { Pozice2D } from '../types'
import { OBLASTI_SVETA } from '../data/oblasti'

/** První vlastní vizuální biome vrstva; svět i kolize zatím zůstávají společné. */
export const MYTINA_NACTI_NAVIC = 12
export const MYTINA_UVOLNI_NAVIC = 18
const mytina = OBLASTI_SVETA.find(o => o.id === 'kristalova-mytina')

export function mytinaMaBytViditelna(pozice: Pozice2D, bylaViditelna: boolean): boolean {
  if (!mytina) return false
  const vzdalenost = Math.hypot(pozice.x - mytina.stred.x, pozice.z - mytina.stred.z)
  return vzdalenost <= mytina.polomer + (bylaViditelna ? MYTINA_UVOLNI_NAVIC : MYTINA_NACTI_NAVIC)
}

/** Deterministická geometrie, žádné síťové assety ani náhodné změny po návratu. */
export function rozmisteniKrystalu(pocet = 24): Array<{ x: number; z: number; velikost: number }> {
  if (!mytina) return []
  return Array.from({ length: pocet }, (_, i) => {
    const uhel = i * 2.399963229728653
    const polomer = Math.sqrt((i + 0.5) / pocet) * mytina.polomer * 0.86
    return {
      x: mytina.stred.x + Math.cos(uhel) * polomer,
      z: mytina.stred.z + Math.sin(uhel) * polomer,
      velikost: 0.45 + (i % 5) * 0.14,
    }
  })
}

export function vytvorKristalovouMytinu(scene: THREE.Scene) {
  const skupina = new THREE.Group()
  skupina.name = 'biom-kristalova-mytina'
  const geometrie = new THREE.ConeGeometry(0.36, 1.9, 5)
  const material = new THREE.MeshStandardMaterial({
    color: 0x85dff5, emissive: 0x3b78ad, emissiveIntensity: 0.46,
    roughness: 0.24, metalness: 0.16, flatShading: true,
  })
  const pozice = rozmisteniKrystalu()
  const krystaly = new THREE.InstancedMesh(geometrie, material, pozice.length)
  krystaly.name = 'krystaly-mytiny'
  const dummy = new THREE.Object3D()
  pozice.forEach((p, i) => {
    dummy.position.set(p.x, p.velikost * 0.92, p.z)
    dummy.rotation.y = i * 1.13
    dummy.rotation.z = (i % 3 - 1) * 0.13
    dummy.scale.setScalar(p.velikost)
    dummy.updateMatrix()
    krystaly.setMatrixAt(i, dummy.matrix)
  })
  krystaly.instanceMatrix.needsUpdate = true
  krystaly.computeBoundingSphere()
  skupina.add(krystaly)
  let viditelna = false
  return {
    aktualizuj(poziceHrace: Pozice2D) {
      const nova = mytinaMaBytViditelna(poziceHrace, viditelna)
      if (nova === viditelna) return
      viditelna = nova
      if (nova) scene.add(skupina)
      else scene.remove(skupina)
    },
    uvolni() {
      scene.remove(skupina)
      geometrie.dispose()
      material.dispose()
      viditelna = false
    },
  }
}
