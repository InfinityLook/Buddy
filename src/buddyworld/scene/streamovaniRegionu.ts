import * as THREE from 'three'
import { OBLASTI_SVETA } from '../data/oblasti'
import type { Pozice2D } from '../types'

/** První streamovaná dekorativní vrstva současné 48m prototypové mapy.
 * Nejde o finální 2–3 km² svět; questy, kolize a nepřátelé zůstávají v původní scéně.
 */
export const DOSAH_NACTENI_REGIONU = 14
export const DOSAH_UVOLNENI_REGIONU = 19

export function regionyVDosahu(pozice: Pozice2D, aktivni: ReadonlySet<string>): string[] {
  return OBLASTI_SVETA.filter((oblast) => {
    const vzdalenost = Math.hypot(pozice.x - oblast.stred.x, pozice.z - oblast.stred.z)
    return vzdalenost <= oblast.polomer + (aktivni.has(oblast.id) ? DOSAH_UVOLNENI_REGIONU : DOSAH_NACTENI_REGIONU)
  }).map((oblast) => oblast.id)
}

function vytvorDekoraceRegionu(id: string): THREE.Group {
  const oblast = OBLASTI_SVETA.find((o) => o.id === id)
  const skupina = new THREE.Group()
  if (!oblast) return skupina
  skupina.name = `stream-region-${id}`
  const material = new THREE.MeshStandardMaterial({ color: oblast.barva, roughness: 0.8, emissive: oblast.barva, emissiveIntensity: 0.12 })
  const geometrie = new THREE.ConeGeometry(0.36, 1.25, 5)
  // Deterministické rozmístění bez náhodnosti: stejná scéna po návratu.
  for (let i = 0; i < 9; i++) {
    const uhel = (i / 9) * Math.PI * 2
    const vzdalenost = oblast.polomer * (0.65 + (i % 3) * 0.1)
    const dekorace = new THREE.Mesh(geometrie, material)
    dekorace.position.set(oblast.stred.x + Math.cos(uhel) * vzdalenost, 0.62, oblast.stred.z + Math.sin(uhel) * vzdalenost)
    dekorace.scale.setScalar(0.7 + (i % 3) * 0.2)
    skupina.add(dekorace)
  }
  return skupina
}

export function vytvorStreamerRegionu(scene: THREE.Scene) {
  const nactene = new Map<string, THREE.Group>()
  const uvolni = (id: string) => {
    const skupina = nactene.get(id)
    if (!skupina) return
    scene.remove(skupina)
    skupina.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return
      obj.geometry.dispose()
      const materialy = Array.isArray(obj.material) ? obj.material : [obj.material]
      materialy.forEach((material) => material.dispose())
    })
    nactene.delete(id)
  }
  const aktualizuj = (pozice: Pozice2D) => {
    const pozadovane = new Set(regionyVDosahu(pozice, new Set(nactene.keys())))
    for (const id of nactene.keys()) if (!pozadovane.has(id)) uvolni(id)
    for (const id of pozadovane) {
      if (nactene.has(id)) continue
      const skupina = vytvorDekoraceRegionu(id)
      nactene.set(id, skupina)
      scene.add(skupina)
    }
  }
  return { aktualizuj, uvolniVse: () => { for (const id of [...nactene.keys()]) uvolni(id) }, nacteneRegiony: () => [...nactene.keys()] }
}
