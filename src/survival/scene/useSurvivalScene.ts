import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SurvivalHerniStav } from '../types'
import { MONSTRA } from '../data/monsters'
import { ARENA_POLOMER } from '../engine/engine'

// ==========================================
// Survival Night — 3D aréna "Dark Forest" (bod 5 zadání). Čistý
// Three.js mimo React, stejná zásada vlastnictví jako appčiny další
// tři herní scény (social/scene/useAmbientScene.ts, game/explorace/
// usePlayerWorld.ts, fighting/arena/useSoubojScene.ts): hook si sám
// postaví renderer/scénu/kameru, uklidí ji při odchodu, React dostane
// jen canvas (containerRef) a jednu imperativní metodu.
//
// Nepřátelé jsou SKUTEČNÉ 3D objekty ve scéně (bod 26 zadání: appka
// nesmí kreslit stovky DOM elementů) — jeden InstancedMesh NA TYP
// monstra (8 typů + samostatný Mesh pro bosse, kterého je vždycky
// nejvýš jeden), pozice se každý snímek přepočítávají přímo do matic
// instancí, ne přes React re-render. Appka nemá žádnou skutečnou 3D
// grafiku postav/monster (na rozdíl od zbraní/bossů/mapy budoucích
// verzí) — primitivní geometrie (kapsle/kužely) obarvené podle
// MonstrumDef.barva, stejný "žádný umělecký pipeline, poctivé
// primitivum" postoj jako usePlayerWorld.ts.
//
// Kamera je "chase cam" shora a mírně zezadu, sleduje HRÁČE (ne první
// osoba jako Souboj) — hráč musí vidět nepřátele přicházející ze
// všech stran, což z první osoby nejde.
// ==========================================

const KAPACITA_NA_TYP = 40
// Strmější, vyšší kamera (skoro shora) + širší zorné pole než v první
// verzi — appka potřebuje, aby hráč viděl monstra přicházející ze
// VŠECH stran (bod 3/25 zadání), ne jen v úzkém kuželu před sebou.
const VYSKA_KAMERY = 15
const ODSTUP_KAMERY = 3
const ZORNE_POLE = 68
const RYCHLOST_KAMERY = 5

const MONSTRUM_IDS = Object.keys(MONSTRA)

interface UseSurvivalSceneResult {
  containerRef: React.RefObject<HTMLDivElement>
  selhalo: boolean
  /** Zavolat každý snímek z rAF smyčky vlastněné komponentou. */
  aktualizuj: (stav: SurvivalHerniStav) => void
}

export const useSurvivalScene = (): UseSurvivalSceneResult => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selhalo, setSelhalo] = useState(false)
  const stavRef = useRef<SurvivalHerniStav | null>(null)

  const aktualizuj = (stav: SurvivalHerniStav) => {
    stavRef.current = stav
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const klidnyRezim = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    } catch {
      setSelhalo(true)
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#050810')
    scene.fog = new THREE.Fog('#050810', ARENA_POLOMER * 0.7, ARENA_POLOMER * 2.1)

    const camera = new THREE.PerspectiveCamera(ZORNE_POLE, container.clientWidth / container.clientHeight, 0.1, 200)
    camera.position.set(0, VYSKA_KAMERY, ODSTUP_KAMERY)

    // --- světla — chladné noční ambientní + teplá záře od "měsíce" ---
    // Zesíleno oproti první verzi (0.55→1.05 ambientní, přidané měkké
    // "měsíční" bodové světlo shora) — reálný screenshot z ověřovacího
    // testu ukázal zem prakticky nerozeznatelnou od pozadí/mlhy, což by
    // hráči znemožnilo VIDĚT přicházející monstra (bod 25 zadání:
    // appka nesmí být hůř hratelná kvůli vzhledu, i když je "temná
    // noc" schválně tmavší téma).
    scene.add(new THREE.AmbientLight('#3d5490', 1.05))
    const mesicniSvetlo = new THREE.DirectionalLight('#c3d4f5', 0.85)
    mesicniSvetlo.position.set(-10, 20, -6)
    scene.add(mesicniSvetlo)
    const mesicniZar = new THREE.HemisphereLight('#5a76c2', '#0d1420', 0.6)
    scene.add(mesicniZar)

    // --- země — tmavá tráva, ale rozeznatelná od pozadí/mlhy ---
    const zem = new THREE.Mesh(
      new THREE.CircleGeometry(ARENA_POLOMER * 1.4, 48),
      new THREE.MeshStandardMaterial({ color: '#1c2c1a', roughness: 1 })
    )
    zem.rotation.x = -Math.PI / 2
    scene.add(zem)

    // --- hrací plocha, o trochu odlišená ---
    const hriste = new THREE.Mesh(
      new THREE.CircleGeometry(ARENA_POLOMER, 48),
      new THREE.MeshStandardMaterial({ color: '#243a24', roughness: 1 })
    )
    hriste.rotation.x = -Math.PI / 2
    hriste.position.y = 0.01
    scene.add(hriste)

    // --- hranice arény — tenký svítící kruh, ať appka vidí okraj ---
    const hranice = new THREE.Mesh(
      new THREE.RingGeometry(ARENA_POLOMER - 0.15, ARENA_POLOMER + 0.15, 64),
      new THREE.MeshBasicMaterial({ color: '#35c4f0', transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    )
    hranice.rotation.x = -Math.PI / 2
    hranice.position.y = 0.02
    scene.add(hranice)

    // --- dekorace: stromy/kameny rozeseté kolem, mlha/ohniště/hřbitov
    // pro atmosféru "temného nočního lesa" (bod 5 zadání) ---
    const dekorace = new THREE.Group()
    scene.add(dekorace)
    const POCET_DEKORACI = 60
    for (let i = 0; i < POCET_DEKORACI; i++) {
      const uhel = Math.random() * Math.PI * 2
      const polomer = ARENA_POLOMER * (0.75 + Math.random() * 0.6)
      const x = Math.cos(uhel) * polomer
      const z = Math.sin(uhel) * polomer
      const jeStrom = Math.random() > 0.3
      const skupina = new THREE.Group()

      if (jeStrom) {
        const kmen = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.2, 1.6, 6),
          new THREE.MeshStandardMaterial({ color: '#241a12', roughness: 1 })
        )
        kmen.position.y = 0.8
        const koruna = new THREE.Mesh(
          new THREE.ConeGeometry(1.0, 2.2, 7),
          new THREE.MeshStandardMaterial({ color: '#122616', roughness: 0.95 })
        )
        koruna.position.y = 2.4
        skupina.add(kmen, koruna)
      } else {
        const kamen = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.35),
          new THREE.MeshStandardMaterial({ color: '#2b2f38', roughness: 1 })
        )
        kamen.position.y = 0.3
        kamen.rotation.set(Math.random(), Math.random(), Math.random())
        skupina.add(kamen)
      }

      skupina.position.set(x, 0, z)
      dekorace.add(skupina)
    }

    // --- malé ohniště blízko okraje hřiště — teplá bodová záře ---
    const ohniste = new THREE.Group()
    const ohnistePlamen = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 1.2 })
    )
    ohnistePlamen.position.y = 0.3
    ohniste.add(ohnistePlamen, new THREE.PointLight('#f59e0b', 1.6, 9))
    ohniste.position.set(ARENA_POLOMER * 0.55, 0, ARENA_POLOMER * 0.3)
    scene.add(ohniste)

    // --- pár náhrobků (hřbitov) opodál na druhé straně ---
    const hrbitov = new THREE.Group()
    for (let i = 0; i < 5; i++) {
      const nahrobek = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.55, 0.12),
        new THREE.MeshStandardMaterial({ color: '#3a3f4a', roughness: 1 })
      )
      nahrobek.position.set((Math.random() - 0.5) * 3, 0.27, (Math.random() - 0.5) * 3)
      nahrobek.rotation.y = Math.random() * 0.4
      hrbitov.add(nahrobek)
    }
    hrbitov.position.set(-ARENA_POLOMER * 0.5, 0, -ARENA_POLOMER * 0.45)
    scene.add(hrbitov)

    // --- hráč — kapsle se záři, otáčí se ve směru pohybu ---
    const hracSkupina = new THREE.Group()
    const hracTelo = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 0.85, 4, 10),
      new THREE.MeshStandardMaterial({ color: '#35c4f0', emissive: '#1c7fa8', emissiveIntensity: 0.6 })
    )
    hracTelo.position.y = 0.9
    hracSkupina.add(hracTelo, new THREE.PointLight('#35c4f0', 1.1, 5))
    scene.add(hracSkupina)

    // --- nepřátelé: 1 InstancedMesh na typ, kapacita KAPACITA_NA_TYP ---
    const geometrieNepritele = new THREE.CapsuleGeometry(0.4, 0.6, 3, 8)
    const instanceNepratel: Record<string, THREE.InstancedMesh> = {}
    for (const id of MONSTRUM_IDS) {
      const def = MONSTRA[id as keyof typeof MONSTRA]
      const material = new THREE.MeshStandardMaterial({ color: def.barva, roughness: 0.7 })
      const mesh = new THREE.InstancedMesh(geometrieNepritele, material, KAPACITA_NA_TYP)
      mesh.count = 0
      scene.add(mesh)
      instanceNepratel[id] = mesh
    }

    // --- boss — samostatný, výrazně větší mesh (vždycky jen jeden) ---
    const bossMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.1, 0),
      new THREE.MeshStandardMaterial({ color: '#1a0b23', emissive: '#7f1d1d', emissiveIntensity: 0.55, roughness: 0.5 })
    )
    bossMesh.visible = false
    const bossHalo = new THREE.PointLight('#ef4444', 1.8, 10)
    bossHalo.visible = false
    scene.add(bossMesh, bossHalo)

    // --- resize ---
    const prizpusob = () => {
      const sirka = container.clientWidth
      const vyska = container.clientHeight
      if (sirka === 0 || vyska === 0) return
      camera.aspect = sirka / vyska
      camera.updateProjectionMatrix()
      renderer.setSize(sirka, vyska)
    }
    const observer = new ResizeObserver(prizpusob)
    observer.observe(container)

    let smycka = 0
    let bezi = true
    const hodiny = new THREE.Clock()
    const matice = new THREE.Matrix4()
    const kvaternion = new THREE.Quaternion()
    const meritko = new THREE.Vector3(1, 1, 1)
    let posledniHracX = 0
    let posledniHracZ = 0

    const krok = () => {
      if (!bezi) return
      smycka = requestAnimationFrame(krok)
      const dt = Math.min(hodiny.getDelta(), 0.1)
      const cas = hodiny.elapsedTime
      const stav = stavRef.current

      if (stav) {
        // --- hráč ---
        hracSkupina.position.x = stav.hrac.pozice.x
        hracSkupina.position.z = stav.hrac.pozice.z

        const dx = stav.hrac.pozice.x - posledniHracX
        const dz = stav.hrac.pozice.z - posledniHracZ
        if (Math.hypot(dx, dz) > 0.01) {
          const cilNatoceni = Math.atan2(dx, dz)
          hracSkupina.rotation.y += (cilNatoceni - hracSkupina.rotation.y) * Math.min(1, 10 * dt)
        }
        posledniHracX = stav.hrac.pozice.x
        posledniHracZ = stav.hrac.pozice.z

        if (!klidnyRezim) {
          const pulz = 1 + Math.sin(cas * 5) * 0.04
          hracTelo.scale.setScalar(pulz)
        }

        // --- nepřátelé podle typu ---
        const podleTypu: Record<string, typeof stav.aktivniNepratele> = {}
        for (const id of MONSTRUM_IDS) podleTypu[id] = []
        let boss: (typeof stav.aktivniNepratele)[number] | null = null

        for (const nepritel of stav.aktivniNepratele) {
          if (nepritel.jeBoss) {
            boss = nepritel
            continue
          }
          if (podleTypu[nepritel.defId]) podleTypu[nepritel.defId].push(nepritel)
        }

        for (const id of MONSTRUM_IDS) {
          const mesh = instanceNepratel[id]
          const seznam = podleTypu[id].slice(0, KAPACITA_NA_TYP)
          mesh.count = seznam.length
          seznam.forEach((n, i) => {
            const houpani = klidnyRezim ? 0 : Math.sin(cas * 6 + i) * 0.05
            matice.compose(
              new THREE.Vector3(n.pozice.x, 0.55 + houpani, n.pozice.z),
              kvaternion,
              meritko
            )
            mesh.setMatrixAt(i, matice)
          })
          mesh.instanceMatrix.needsUpdate = true
        }

        if (boss) {
          bossMesh.visible = true
          bossHalo.visible = true
          bossMesh.position.set(boss.pozice.x, 1.1, boss.pozice.z)
          bossHalo.position.copy(bossMesh.position)
          if (!klidnyRezim) {
            bossMesh.rotation.y = cas * 0.5
            bossMesh.scale.setScalar(1 + Math.sin(cas * 3) * 0.05)
          }
        } else {
          bossMesh.visible = false
          bossHalo.visible = false
        }

        // --- kamera sleduje hráče shora/zezadu ---
        const cilKamX = hracSkupina.position.x
        const cilKamZ = hracSkupina.position.z + ODSTUP_KAMERY
        const lerpK = Math.min(1, RYCHLOST_KAMERY * dt)
        camera.position.x += (cilKamX - camera.position.x) * lerpK
        camera.position.z += (cilKamZ - camera.position.z) * lerpK
        camera.position.y = VYSKA_KAMERY
        camera.lookAt(hracSkupina.position.x, 0.6, hracSkupina.position.z)
      }

      renderer.render(scene, camera)
    }
    krok()

    return () => {
      bezi = false
      cancelAnimationFrame(smycka)
      observer.disconnect()

      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(material)) material.forEach((m) => m.dispose())
        else material?.dispose()
      })

      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return { containerRef, selhalo, aktualizuj }
}
