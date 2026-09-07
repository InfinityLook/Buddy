import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SIRKA_MRIZKY, VYSKA_MRIZKY } from '../engine'
import { POSTAVY } from '../postavy'
import type { TrhStav } from '../types'

// ==========================================
// Buddyho Trh — 3D deska mimo React, stejné vlastnictví jako
// social/scene/useAmbientScene.ts a game/explorace/usePlayerWorld.ts:
// hook vytvoří renderer/kameru/smyčku a uklidí se sám při odmontování,
// React dostane jen <div ref={containerRef}>. Obyčejný Three.js, ne
// React Three Fiber — stejný důvod jako všude jinde v appce.
//
// Fáze 0 nemá žádnou fyziku ani průběžnou simulaci — kamera je pevná,
// políčka mřížky se vykreslí jednou při startu. Jediná věc, co běží
// na smyčce, je plynulé dotažení tokenů hráčů k jejich aktuální
// pozici (TrhStav.hraci[].pozice) — bez toho by token po každém kroku
// pohybu "teleportoval", ne se plynule přesunul.
//
// Skutečná grafika (Kenney nízkopolygonové modely) je plánovaná
// pozdější fáze — tahle verze kreslí políčka a hráče čistě z
// primitiv, stejný "žádný stažený asset, dokud to není potřeba"
// postup jako Souboj/Buddyheim měly na začátku své vlastní historie.
// ==========================================

const VELIKOST_POLE = 1.4
const MEZERA = 0.06

interface UseTrhSceneOptions {
  stav: TrhStav
}

interface UseTrhSceneResult {
  containerRef: React.RefObject<HTMLDivElement>
  selhalo: boolean
}

export const useTrhScene = ({ stav }: UseTrhSceneOptions): UseTrhSceneResult => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selhalo, setSelhalo] = useState(false)
  const stavRef = useRef(stav)
  stavRef.current = stav

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true })
    } catch {
      setSelhalo(true)
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0c1220')
    scene.fog = new THREE.Fog('#0c1220', 14, 28)

    const stredX = ((SIRKA_MRIZKY - 1) * VELIKOST_POLE) / 2
    const stredZ = ((VYSKA_MRIZKY - 1) * VELIKOST_POLE) / 2

    const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.set(stredX, 11.5, stredZ + 9.5)
    camera.lookAt(stredX, 0, stredZ)

    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const smerove = new THREE.DirectionalLight(0xffffff, 0.85)
    smerove.position.set(6, 12, 4)
    scene.add(smerove)

    // Šachovnicová mřížka — jen dvě střídající se barvy, žádná
    // funkce polí (nákup/vlastnictví) ještě neexistuje.
    const geometriePole = new THREE.BoxGeometry(VELIKOST_POLE - MEZERA, 0.2, VELIKOST_POLE - MEZERA)
    const materialSvetly = new THREE.MeshStandardMaterial({ color: '#22304e' })
    const materialTmavy = new THREE.MeshStandardMaterial({ color: '#1a2438' })
    for (let x = 0; x < SIRKA_MRIZKY; x++) {
      for (let z = 0; z < VYSKA_MRIZKY; z++) {
        const pole = new THREE.Mesh(geometriePole, (x + z) % 2 === 0 ? materialSvetly : materialTmavy)
        pole.position.set(x * VELIKOST_POLE, 0, z * VELIKOST_POLE)
        scene.add(pole)
      }
    }

    // Jeden token na hráče — postavy se během hry nemění, takže mapa
    // se staví jen jednou tady, ne přebudovává při každé změně stav.
    const geometrieTokenu = new THREE.CapsuleGeometry(0.28, 0.42, 4, 8)
    const tokeny = new Map<string, THREE.Object3D>()
    for (const hrac of stavRef.current.hraci) {
      const material = new THREE.MeshStandardMaterial({ color: POSTAVY[hrac.postavaId].barva })
      const token = new THREE.Mesh(geometrieTokenu, material)
      token.position.set(hrac.pozice.x * VELIKOST_POLE, 0.46, hrac.pozice.z * VELIKOST_POLE)
      scene.add(token)
      tokeny.set(hrac.id, token)
    }

    let bezi = true
    const cilovaPozice = new THREE.Vector3()
    const smycka = () => {
      if (!bezi) return
      for (const hrac of stavRef.current.hraci) {
        const token = tokeny.get(hrac.id)
        if (!token) continue
        cilovaPozice.set(hrac.pozice.x * VELIKOST_POLE, 0.46, hrac.pozice.z * VELIKOST_POLE)
        token.position.lerp(cilovaPozice, 0.15)
      }
      renderer.render(scene, camera)
      requestAnimationFrame(smycka)
    }
    smycka()

    const naZmenuVelikosti = () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', naZmenuVelikosti)

    return () => {
      bezi = false
      window.removeEventListener('resize', naZmenuVelikosti)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
          else obj.material.dispose()
        }
      })
      geometriePole.dispose()
      geometrieTokenu.dispose()
      materialSvetly.dispose()
      materialTmavy.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement)
    }
    // Efekt se schválně spouští jen jednou za mount (viz komentář výš —
    // aktuální stav se čte přes stavRef, ne přes tuhle závislost).
  }, [])

  return { containerRef, selhalo }
}
