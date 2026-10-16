import * as THREE from 'three'
import type { Zbran } from '../combat/weapons'

/** Purely visual feedback: combat engine remains the authority for damage and cooldown. */
export function vytvorBojoveEfekty(scene: THREE.Scene) {
  type Efekt = { objekt: THREE.Object3D; zacatek: THREE.Vector3; cil: THREE.Vector3; uplynulo: number; trvani: number; typ: 'projektil' | 'svih' | 'zasah' }
  const aktivni: Efekt[] = []
  const material = (barva: number, pruhlednost = 0.92) => new THREE.MeshBasicMaterial({ color: barva, transparent: true, opacity: pruhlednost, depthWrite: false })
  function pridej(objekt: THREE.Object3D, zacatek: THREE.Vector3, cil: THREE.Vector3, trvani: number, typ: Efekt['typ']) {
    objekt.position.copy(zacatek)
    scene.add(objekt)
    aktivni.push({ objekt, zacatek, cil, trvani, uplynulo: 0, typ })
  }
  function utok(zbran: Zbran, odkud: THREE.Vector3, kam: THREE.Vector3) {
    const start = odkud.clone().add(new THREE.Vector3(0, 1.25, 0))
    const cil = kam.clone().add(new THREE.Vector3(0, 1.1, 0))
    if (zbran === 'mec') {
      const smer = cil.clone().sub(start).normalize()
      const oblouk = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.09, 6, 24, Math.PI * 1.3), material(0xffdf88))
      oblouk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), smer)
      pridej(oblouk, start.clone().add(smer.multiplyScalar(0.65)), cil, 0.27, 'svih')
    } else {
      const sip = zbran === 'luk'
      const objekt = sip
        ? new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.6, 7), material(0xffdf91))
        : new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), material(0xa58bff))
      if (sip) objekt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cil.clone().sub(start).normalize())
      pridej(objekt, start, cil, sip ? 0.28 : 0.38, 'projektil')
    }
    zasah(cil, zbran === 'hul' ? 0xb39aff : 0xffdc90)
  }
  function zasah(cil: THREE.Vector3, barva: number) {
    const kruh = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.25, 18), material(barva))
    kruh.rotation.x = -Math.PI / 2
    pridej(kruh, cil, cil, 0.42, 'zasah')
  }
  function buddy(odkud: THREE.Vector3, kam: THREE.Vector3, id: string) {
    const barvy: Record<string, number> = { ember: 0xff6628, moss: 0x75e88d, nyx: 0xb18aff, frost: 0x80dcff }
    const barva = barvy[id] ?? 0xffffff
    const koule = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), material(barva))
    pridej(koule, odkud.clone().add(new THREE.Vector3(0, 1.1, 0)), kam.clone().add(new THREE.Vector3(0, 1.1, 0)), 0.38, 'projektil')
    zasah(kam.clone().add(new THREE.Vector3(0, 1.1, 0)), barva)
  }
  function krok(dt: number) {
    for (let i = aktivni.length - 1; i >= 0; i--) {
      const efekt = aktivni[i]
      efekt.uplynulo += dt
      const t = Math.min(1, efekt.uplynulo / efekt.trvani)
      if (efekt.typ === 'projektil') efekt.objekt.position.lerpVectors(efekt.zacatek, efekt.cil, t)
      if (efekt.typ === 'zasah') efekt.objekt.scale.setScalar(1 + t * 3)
      if (efekt.typ === 'svih') efekt.objekt.rotation.z = t * 1.5
      efekt.objekt.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshBasicMaterial) obj.material.opacity = 0.92 * (1 - t)
      })
      if (t >= 1) {
        scene.remove(efekt.objekt)
        efekt.objekt.traverse(obj => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose()
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
            else obj.material.dispose()
          }
        })
        aktivni.splice(i, 1)
      }
    }
  }
  function uklidit() {
    for (const efekt of aktivni) {
      scene.remove(efekt.objekt)
      efekt.objekt.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material.dispose()
        }
      })
    }
    aktivni.length = 0
  }
  return { utok, buddy, krok, uklidit }
}
