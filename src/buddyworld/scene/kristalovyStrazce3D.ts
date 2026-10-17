import * as THREE from 'three'
import type { RefObject } from 'react'
import type { KristalovySouboj } from '../data/kristalovyStrazce'
import { KRYSTALOVY_ARENA, KRYSTALOVY_STRAZCE_HP, poziceKristalovehoStrazce } from '../data/kristalovyStrazce'

/** Low-poly procedural boss and spatial attack telegraph. No external assets required. */
export function vytvorKristalovehoStrazce3D(scene: THREE.Scene, soubojRef: RefObject<KristalovySouboj | null>) {
  const group = new THREE.Group()
  group.name = 'krystalovy-strazce-arena'
  group.position.set(KRYSTALOVY_ARENA.x, 0, KRYSTALOVY_ARENA.z)
  const disposables: Array<THREE.BufferGeometry | THREE.Material> = []
  const material = (color: number, emissive: number, intensity = 0.45) => {
    const m = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, flatShading: true, roughness: 0.32 })
    disposables.push(m)
    return m
  }
  const stone = material(0x35465d, 0x101a30, 0.12)
  const crystal = material(0x79dcf2, 0x2d80c7, 0.7)
  const rage = material(0xe98de7, 0x7c22aa, 0.85)
  const baseGeometry = new THREE.CylinderGeometry(1.0, 1.28, 1.55, 7)
  const headGeometry = new THREE.IcosahedronGeometry(0.73, 0)
  const spikeGeometry = new THREE.ConeGeometry(0.35, 1.5, 5)
  const ringGeometry = new THREE.RingGeometry(2.94, 3.1, 56)
  disposables.push(baseGeometry, headGeometry, spikeGeometry, ringGeometry)
  const body = new THREE.Mesh(baseGeometry, stone)
  body.position.y = 1.15
  const head = new THREE.Mesh(headGeometry, crystal)
  head.position.y = 2.2
  const model = new THREE.Group()
  group.add(model)
  model.add(body, head)
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(spikeGeometry, i % 2 ? crystal : rage)
    const a = i * Math.PI / 3
    spike.position.set(Math.cos(a) * 0.92, 1.45 + (i % 2) * 0.3, Math.sin(a) * 0.92)
    spike.rotation.z = Math.sin(a) * 0.5
    spike.rotation.x = -Math.cos(a) * 0.5
    model.add(spike)
  }
  const border = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0x58bff0, transparent: true, opacity: 0.52, side: THREE.DoubleSide, depthWrite: false }))
  disposables.push(border.material)
  border.rotation.x = -Math.PI / 2
  border.position.y = 0.055
  group.add(border)
  const warningGeometry = new THREE.CircleGeometry(1, 64)
  const warningMaterial = new THREE.MeshBasicMaterial({ color: 0xf04491, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })
  disposables.push(warningGeometry, warningMaterial)
  const warning = new THREE.Mesh(warningGeometry, warningMaterial)
  warning.rotation.x = -Math.PI / 2
  warning.position.y = 0.07
  warning.visible = false
  group.add(warning)
  // Zásahový záblesk je pouze vizuální odezva; výpočet HP provádí engine.
  const hitMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
  const hitGeometry = new THREE.SphereGeometry(1.42, 12, 8)
  const hitFlash = new THREE.Mesh(hitGeometry, hitMaterial)
  hitFlash.position.y = 1.6
  hitFlash.visible = false
  group.add(hitFlash)
  disposables.push(hitMaterial, hitGeometry)
  let posledniHp = KRYSTALOVY_STRAZCE_HP
  let casZasahu = -Infinity
  scene.add(group)
  return {
    aktualizuj(ted: number) {
      const state = soubojRef.current
      const active = state?.faze === 'boj'
      group.visible = Boolean(active)
      if (!active || !state) return
      if (state.bossHp < posledniHp) casZasahu = ted
      posledniHp = state.bossHp
      const odZasahu = ted - casZasahu
      hitFlash.visible = odZasahu >= 0 && odZasahu < 230
      if (hitFlash.visible) hitMaterial.opacity = 0.38 * (1 - odZasahu / 230)
      const bossPozice = poziceKristalovehoStrazce(state)
      // Model následuje logiku AI, zatímco aréna zůstává na původním místě.
      model.position.x = bossPozice.x - KRYSTALOVY_ARENA.x
      model.position.z = bossPozice.z - KRYSTALOVY_ARENA.z
      hitFlash.position.x = model.position.x
      hitFlash.position.z = model.position.z
      const rageMode = state.bossHp <= KRYSTALOVY_STRAZCE_HP / 2
      head.material = rageMode ? rage : crystal
      head.position.y = 2.2 + Math.sin(ted * 0.0027) * 0.11
      body.rotation.y = Math.sin(ted * 0.0011) * 0.24
      const untilAttack = state.dalsiUtokMs - ted
      warning.visible = untilAttack > 0 && untilAttack <= 900
      if (warning.visible) {
        const cil = state.cilUtoku ?? bossPozice
        warning.position.x = cil.x - KRYSTALOVY_ARENA.x
        warning.position.z = cil.z - KRYSTALOVY_ARENA.z
        const radius = state.utok === 'vlna' ? 5 : 3.1
        warning.scale.set(radius, radius, 1)
        warningMaterial.opacity = 0.13 + 0.2 * (1 - untilAttack / 900)
      }
    },
    uvolni() {
      scene.remove(group)
      disposables.forEach(item => item.dispose())
    },
  }
}
