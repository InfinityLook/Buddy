import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  CAMERA_MAX_FACTOR,
  CAMERA_MAX_POLAR,
  CAMERA_MIN_FACTOR,
  CAMERA_MIN_POLAR,
  CITY_FIT_RADIUS,
  PALETTE,
} from './constants'
import { createCityScene, disposeScene } from './scene/city'
import type { Hotspot, HotspotId, HotspotScreenPosition } from './types'

// ==========================================
// Životní cyklus 3D scény.
//
// Three.js žije mimo React: scéna se postaví jednou, kreslí se ve vlastní
// smyčce a React o ní ví jen přes stav, který mu hook posílá ven
// (polohy popisků, co je právě pod prstem). Kdyby se scéna vykreslovala
// přes React, přestavovala by se šedesátkrát za vteřinu.
// ==========================================

interface UseGameSceneResult {
  /** Sem se pověsí <canvas> */
  containerRef: React.RefObject<HTMLDivElement>
  /** Polohy popisků na obrazovce, přepočítané každý snímek */
  labels: HotspotScreenPosition[]
  /** Část města pod ukazatelem, nebo null */
  hovered: HotspotId | null
  setHovered: (id: HotspotId | null) => void
  /** Scéna je postavená a první snímek vykreslený */
  ready: boolean
  /** WebGL v prohlížeči chybí nebo selhal */
  failed: boolean
}

/**
 * Jak daleko musí kamera couvnout, aby se do záběru vešla koule daného
 * poloměru.
 *
 * Počítá se z obou zorných úhlů a bere se ten náročnější. Na výšku
 * drženém telefonu rozhoduje ten vodorovný — je mnohem užší než svislý
 * a právě on určuje, jestli se město vejde do šířky.
 */
const fitDistance = (polomer: number, camera: THREE.PerspectiveCamera): number => {
  const svisly = THREE.MathUtils.degToRad(camera.fov)
  const vodorovny = 2 * Math.atan(Math.tan(svisly / 2) * camera.aspect)

  return Math.max(polomer / Math.tan(svisly / 2), polomer / Math.tan(vodorovny / 2)) * 1.08
}

export const useGameScene = (
  onSelect: (id: HotspotId) => void
): UseGameSceneResult => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [labels, setLabels] = useState<HotspotScreenPosition[]>([])
  const [hovered, setHovered] = useState<HotspotId | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  // Ukazatele na to, co se mění mezi snímky. Kdyby to byl stav, každá
  // změna by překreslila React strom — a to šedesátkrát za vteřinu.
  const hoveredRef = useRef<HotspotId | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  const setHoveredSafe = useCallback((id: HotspotId | null) => {
    if (hoveredRef.current === id) return
    hoveredRef.current = id
    setHovered(id)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    } catch {
      // Starý prohlížeč nebo vypnutá akcelerace. Komponenta pak ukáže
      // náhradní obrazovku místo prázdného místa.
      setFailed(true)
      return
    }

    // Na telefonech s vysokou hustotou bodů se plné rozlišení nevyplatí:
    // stojí čtyřnásobek výkonu a rozdíl je sotva vidět.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    // Mlha spolkne vzdálené hory a hlavně okraj roviny země: končí dřív,
    // než rovina, takže její hrana splyne s oparem a není vidět jako čára.
    // Barva je proto blízká obloze u obzoru.
    scene.fog = new THREE.Fog(PALETTE.mlha, 500, 1250)

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      1,
      2600
    )

    const mesto = createCityScene()
    scene.add(mesto.root)

    // Úvodní pohled: od jihu shora, jako na předloze. Vzdálenost se
    // dopočítá z poměru stran, ne napevno.
    const vzdalenost = fitDistance(CITY_FIT_RADIUS, camera)
    // Sklon musí být takový, aby se do horní části záběru vešel obzor.
    // Při strmějším pohledu míří celá plocha obrazovky pod vodorovnou
    // rovinu, obloha se vůbec neukáže a to, co vypadá jako obloha, je
    // ve skutečnosti zamlžená rovina země.
    const sklon = Math.PI * 0.395
    camera.position.set(
      0,
      Math.cos(sklon) * vzdalenost,
      Math.sin(sklon) * vzdalenost
    )

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 8, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    // Posouvání cíle vypnuté — jinak se dá město "ztratit" mimo obraz
    // a není jak se vrátit.
    controls.enablePan = false
    controls.minDistance = vzdalenost * CAMERA_MIN_FACTOR
    controls.maxDistance = vzdalenost * CAMERA_MAX_FACTOR
    controls.minPolarAngle = CAMERA_MIN_POLAR
    controls.maxPolarAngle = CAMERA_MAX_POLAR
    controls.rotateSpeed = 0.6
    controls.zoomSpeed = 0.8
    // Samovolné otáčení je schválně vypnuté. Popisky nad městem jsou
    // tlačítka a hýbala by jimi — na telefonu by se do nich trefoval
    // jen ten, kdo míří na pohyblivý cíl.
    controls.autoRotate = false
    controls.update()

    // --- trefy klepnutím ---
    const raycaster = new THREE.Raycaster()
    const ukazatel = new THREE.Vector2()

    const najdiHotspot = (event: PointerEvent): Hotspot | null => {
      const obdelnik = renderer.domElement.getBoundingClientRect()
      ukazatel.x = ((event.clientX - obdelnik.left) / obdelnik.width) * 2 - 1
      ukazatel.y = -((event.clientY - obdelnik.top) / obdelnik.height) * 2 + 1

      raycaster.setFromCamera(ukazatel, camera)

      // Části se zkoušejí v pořadí, v jakém jsou v seznamu, a bere se
      // ta nejbližší trefa napříč všemi.
      let nejblizsi: { hotspot: Hotspot; vzdalenost: number } | null = null

      for (const hotspot of mesto.hotspots) {
        const trefy = raycaster.intersectObjects(hotspot.objects, true)
        if (trefy.length === 0) continue
        if (!nejblizsi || trefy[0].distance < nejblizsi.vzdalenost) {
          nejblizsi = { hotspot, vzdalenost: trefy[0].distance }
        }
      }

      return nejblizsi?.hotspot ?? null
    }

    // Otáčení kamery nesmí platit jako klepnutí, proto se hlídá, o kolik
    // se prst mezi stiskem a puštěním posunul.
    let stiskX = 0
    let stiskY = 0
    let stiskCas = 0

    const onPointerDown = (event: PointerEvent) => {
      stiskX = event.clientX
      stiskY = event.clientY
      stiskCas = performance.now()
    }

    const onPointerUp = (event: PointerEvent) => {
      const posun = Math.hypot(event.clientX - stiskX, event.clientY - stiskY)
      if (posun > 12 || performance.now() - stiskCas > 700) return

      const hotspot = najdiHotspot(event)
      if (hotspot) onSelectRef.current(hotspot.meta.id)
    }

    const onPointerMove = (event: PointerEvent) => {
      // Na dotykovém displeji žádné "najetí" neexistuje a přepočet by
      // jen zbytečně žral výkon při každém tažení.
      if (event.pointerType === 'touch') return
      const hotspot = najdiHotspot(event)
      setHoveredSafe(hotspot?.meta.id ?? null)
    }

    const platno = renderer.domElement
    platno.addEventListener('pointerdown', onPointerDown)
    platno.addEventListener('pointerup', onPointerUp)
    platno.addEventListener('pointermove', onPointerMove)

    // --- změna velikosti ---
    const prizpusob = () => {
      const sirka = container.clientWidth
      const vyska = container.clientHeight
      if (sirka === 0 || vyska === 0) return

      camera.aspect = sirka / vyska
      camera.updateProjectionMatrix()
      renderer.setSize(sirka, vyska)

      // Otočením telefonu se mění i to, jak daleko musí kamera stát.
      // Meze se přepočítají, ale vzdálenost se hráči nepřenastavuje —
      // to, co si přiblížil, mu má zůstat.
      const nova = fitDistance(CITY_FIT_RADIUS, camera)
      controls.minDistance = nova * CAMERA_MIN_FACTOR
      controls.maxDistance = nova * CAMERA_MAX_FACTOR
    }

    const observer = new ResizeObserver(prizpusob)
    observer.observe(container)

    // --- kreslicí smyčka ---
    const promitnuty = new THREE.Vector3()
    let smycka = 0
    let bezi = true

    const krok = () => {
      if (!bezi) return
      smycka = requestAnimationFrame(krok)

      const cas = performance.now() / 1000

      // Prstenec arény dýchá, ať scéna nepůsobí zamrzle
      const material = mesto.arenaRing.material as THREE.MeshBasicMaterial
      material.opacity = 0.72 + Math.sin(cas * 1.6) * 0.22

      // Kroužek pod částí, na kterou se ukazuje, se rozsvítí
      for (const hotspot of mesto.hotspots) {
        const cil = hoveredRef.current === hotspot.meta.id ? 0.55 : 0
        const zar = hotspot.glow.material as THREE.MeshBasicMaterial
        zar.opacity += (cil - zar.opacity) * 0.15
      }

      controls.update()
      renderer.render(scene, camera)

      // Popisky se promítají až po vykreslení, aby seděly na to, co je
      // právě vidět, ne na polohu z minulého snímku.
      const obdelnik = renderer.domElement.getBoundingClientRect()
      setLabels(
        mesto.hotspots.map((hotspot) => {
          promitnuty.copy(hotspot.anchor).project(camera)

          const zaKamerou = promitnuty.z > 1
          const mimoObraz =
            promitnuty.x < -1.15 || promitnuty.x > 1.15 ||
            promitnuty.y < -1.15 || promitnuty.y > 1.15

          return {
            id: hotspot.meta.id,
            x: (promitnuty.x * 0.5 + 0.5) * obdelnik.width,
            y: (-promitnuty.y * 0.5 + 0.5) * obdelnik.height,
            visible: !zaKamerou && !mimoObraz,
            depth: camera.position.distanceTo(hotspot.anchor),
          }
        })
      )
    }

    krok()
    setReady(true)

    return () => {
      bezi = false
      cancelAnimationFrame(smycka)
      observer.disconnect()

      platno.removeEventListener('pointerdown', onPointerDown)
      platno.removeEventListener('pointerup', onPointerUp)
      platno.removeEventListener('pointermove', onPointerMove)

      controls.dispose()
      disposeScene(mesto.root)
      renderer.dispose()
      platno.remove()
    }
  }, [setHoveredSafe])

  return { containerRef, labels, hovered, setHovered: setHoveredSafe, ready, failed }
}
