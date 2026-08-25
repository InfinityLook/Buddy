import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SvetKonfigurace } from '../data/world'

// ==========================================
// 3D průzkumný svět z první osoby — čistý Three.js mimo React, stejná
// zásada vlastnictví jako social/scene/useAmbientScene.ts a Form
// Checku usePoseEngine.ts: hook si vytvoří renderer/kameru/smyčku,
// stará se o vlastní úklid při odchodu, React dostává jen to, co má
// vykreslit (canvas přes containerRef) a callback při setkání s
// nepřítelem. Používáme obyčejný Three.js, ne React Three Fiber —
// R3F by do appky přineslo druhý, paralelní způsob práce se scénou
// vedle už existujícího vzoru, přesně čemu se chceme vyhnout.
//
// Žádné stažené modely ani textury — svět je poskládaný z primitiv
// (koule, kužely, válce) obarvených podle SvetKonfigurace, stylizovaný
// "low-poly" vzhled zvolený vědomě místo nedosažitelného
// fotorealismu bez opravdových assetů.
//
// Ovládání je sjednocené přes Pointer Events (fungují stejně pro myš
// i dotyk): tažení po ploše otáčí kamerou (na mobilu i desktopu),
// pohyb řeší buď klávesnice (WASD/šipky, jen desktop) nebo virtuální
// joystick (VirtualniJoystick.tsx, mimo tenhle DOM strom — dotyk na
// joysticku proto nikdy nespustí i otáčení kamerou, prohlížeč ho
// doručí jen joysticku, ne kontejneru pod ním).
// ==========================================

const VYSKA_OCI = 1.7
const RYCHLOST_POHYBU = 5.2 // jednotky světa za sekundu
const CITLIVOST_OTOCENI = 0.0038
const MAX_SKLON = 1.15 // rad, ~66°, ať se hráč nepřevrátí přes hlavu

const BUDDY_ODSTUP_ZA = 2.2
const BUDDY_ODSTUP_STRANOU = 1.0
const BUDDY_ZAKLADNI_VYSKA = 1.25
const BUDDY_AMPLITUDA = 0.14

interface UsePlayerWorldOptions {
  konfigurace: SvetKonfigurace
  /** Zavolá se přesně jednou, když se hráč přiblíží k pozici setkání
   *  na polomerSetkani. Po zavolání se smyčka pohybu zastaví — scéna
   *  zůstane vykreslená, ale zamrzlá, dokud ji React neodmontuje. */
  onSetkani: () => void
}

interface UsePlayerWorldResult {
  containerRef: React.RefObject<HTMLDivElement>
  selhalo: boolean
  /** Nastaví pohybový vstup z virtuálního joysticku — x = do strany
   *  (-1..1), z = dopředu/dozadu (-1..1). Volá VirtualniJoystick.tsx
   *  při každé změně polohy palce, (0, 0) při puštění. */
  nastavJoystick: (x: number, z: number) => void
}

export const usePlayerWorld = ({ konfigurace, onSetkani }: UsePlayerWorldOptions): UsePlayerWorldResult => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selhalo, setSelhalo] = useState(false)
  const joystickRef = useRef({ x: 0, z: 0 })

  // Zpřístupní nastavJoystick jako stabilní referenci nezávislou na
  // efektu níž (ten se spouští jen jednou za mount, ne při každém
  // renderu) — zapisuje přímo do joystickRef, který čte kreslicí smyčka.
  const nastavJoystick = (x: number, z: number) => {
    joystickRef.current.x = x
    joystickRef.current.z = z
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
    scene.background = new THREE.Color(konfigurace.barvaOblohy)
    scene.fog = new THREE.Fog(konfigurace.barvaMlhy, konfigurace.polomerSveta * 0.35, konfigurace.polomerSveta * 1.35)

    const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 200)
    camera.rotation.order = 'YXZ'
    camera.position.set(konfigurace.start[0], VYSKA_OCI, konfigurace.start[1])
    // Hráč se má dívat směrem k setkání, ne zády k němu — spočteno ze
    // start/poziceSetkani (world.ts), ne natvrdo, ať to platí pro
    // libovolnou budoucí lokaci bez ohledu na to, jak jsou body vůči
    // sobě umístěné. Odvozeno z toho, že výchozí směr kamery (yaw=0)
    // je (0,0,-1): chceme forward = normalize(setkani - start).
    let yaw = Math.atan2(
      -(konfigurace.poziceSetkani[0] - konfigurace.start[0]),
      -(konfigurace.poziceSetkani[1] - konfigurace.start[1])
    )
    let sklon = 0

    // --- světla ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const slunce = new THREE.DirectionalLight(0xffd9a0, 1.1)
    slunce.position.set(10, 18, 6)
    scene.add(slunce)

    // --- zem ---
    const zem = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshStandardMaterial({ color: konfigurace.barvaZeme, roughness: 1 })
    )
    zem.rotation.x = -Math.PI / 2
    scene.add(zem)

    // --- dekorace (stromy/kameny), rozeseté náhodně mimo start a
    // místo setkání, ať hráči nic neblokuje výhled ani cestu ---
    const dekorace = new THREE.Group()
    scene.add(dekorace)
    const pocetDekoraci = konfigurace.teren === 'les' ? 46 : konfigurace.teren === 'jeskyne' ? 30 : 22
    const volnaZonaKolem = (x: number, z: number, px: number, pz: number, min: number) =>
      Math.hypot(x - px, z - pz) < min

    for (let i = 0; i < pocetDekoraci; i++) {
      let x = 0
      let z = 0
      let pokus = 0
      do {
        const uhel = Math.random() * Math.PI * 2
        const polomer = Math.sqrt(Math.random()) * konfigurace.polomerSveta * 0.95
        x = Math.cos(uhel) * polomer
        z = Math.sin(uhel) * polomer
        pokus++
      } while (
        pokus < 12 &&
        (volnaZonaKolem(x, z, konfigurace.start[0], konfigurace.start[1], 3) ||
          volnaZonaKolem(x, z, konfigurace.poziceSetkani[0], konfigurace.poziceSetkani[1], konfigurace.polomerSetkani + 2.5))
      )

      // Jeskyně nemá stromy — jen kameny (sutiny/krápníkové balvany).
      const jeStrom = konfigurace.teren !== 'jeskyne' && (konfigurace.teren === 'les' || Math.random() > 0.45)
      const skupinaObjektu = new THREE.Group()

      if (jeStrom) {
        const kmen = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6),
          new THREE.MeshStandardMaterial({ color: '#3d2a1a', roughness: 1 })
        )
        kmen.position.y = 0.7
        const koruna = new THREE.Mesh(
          new THREE.ConeGeometry(0.9, 1.8, 7),
          new THREE.MeshStandardMaterial({ color: konfigurace.teren === 'les' ? '#2f5d34' : '#6b3d1f', roughness: 0.9 })
        )
        koruna.position.y = 2.1
        skupinaObjektu.add(kmen, koruna)
      } else {
        const kamen = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.3),
          new THREE.MeshStandardMaterial({ color: '#5a5248', roughness: 1 })
        )
        kamen.position.y = 0.3
        kamen.rotation.set(Math.random(), Math.random(), Math.random())
        skupinaObjektu.add(kamen)
      }

      skupinaObjektu.position.set(x, 0, z)
      dekorace.add(skupinaObjektu)
    }

    // --- Buddy — společník, stejný jazyk "jádro + záře" jako
    // social/scene/useAmbientScene.ts, ať vypadá jako ta samá appka ---
    const buddy = new THREE.Group()
    const buddyJadro = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 20, 20),
      new THREE.MeshStandardMaterial({ color: '#5ec9f0', emissive: '#3aa8e0', emissiveIntensity: 0.9 })
    )
    const buddyZar = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#8b7bf0', transparent: true, opacity: 0.25 })
    )
    buddy.add(buddyZar, buddyJadro)
    buddy.add(new THREE.PointLight('#7ac8f5', 1.2, 6))
    scene.add(buddy)

    // --- nepřítel na místě setkání — nápadná, mírně pulzující silueta ---
    const nepritel = new THREE.Group()
    const nepritelTelo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.75, 0),
      new THREE.MeshStandardMaterial({ color: '#7f1d1d', emissive: '#ef4444', emissiveIntensity: 0.5, roughness: 0.6 })
    )
    nepritelTelo.position.y = 1
    const nepritelHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.05, 8, 32),
      new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.5 })
    )
    nepritelHalo.position.y = 0.05
    nepritelHalo.rotation.x = Math.PI / 2
    nepritel.add(nepritelTelo, nepritelHalo)
    nepritel.add(new THREE.PointLight('#ef4444', 1.4, 8))
    nepritel.position.set(konfigurace.poziceSetkani[0], 0, konfigurace.poziceSetkani[1])
    scene.add(nepritel)

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

    // --- otáčení kamerou tažením (myš i dotyk sjednoceně přes Pointer
    // Events) — joystick leží mimo tenhle DOM strom, takže dotyk na
    // něm sem vůbec nedorazí (viz komentář nahoře souboru) ---
    let otacecíPointerId: number | null = null
    let poslX = 0
    let poslY = 0

    const onPointerDown = (e: PointerEvent) => {
      if (otacecíPointerId !== null) return
      otacecíPointerId = e.pointerId
      poslX = e.clientX
      poslY = e.clientY
    }
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== otacecíPointerId) return
      const dx = e.clientX - poslX
      const dy = e.clientY - poslY
      poslX = e.clientX
      poslY = e.clientY
      yaw -= dx * CITLIVOST_OTOCENI
      sklon = Math.max(-MAX_SKLON, Math.min(MAX_SKLON, sklon - dy * CITLIVOST_OTOCENI))
    }
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === otacecíPointerId) otacecíPointerId = null
    }

    container.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    // --- klávesnice (desktop) ---
    const klavesy = new Set<string>()
    const onKeyDown = (e: KeyboardEvent) => klavesy.add(e.key.toLowerCase())
    const onKeyUp = (e: KeyboardEvent) => klavesy.delete(e.key.toLowerCase())
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // --- kreslicí smyčka ---
    let smycka = 0
    let bezi = true
    let setkaniOhlaseno = false
    const hodiny = new THREE.Clock()

    const dopredny = new THREE.Vector3()
    const pravy = new THREE.Vector3()
    const nahoru = new THREE.Vector3(0, 1, 0)

    const krok = () => {
      if (!bezi) return
      smycka = requestAnimationFrame(krok)

      const dt = Math.min(hodiny.getDelta(), 0.1)
      const cas = hodiny.elapsedTime

      if (!setkaniOhlaseno) {
        camera.rotation.set(sklon, yaw, 0)

        camera.getWorldDirection(dopredny)
        dopredny.y = 0
        dopredny.normalize()
        pravy.crossVectors(dopredny, nahoru).normalize()

        let vstupX = joystickRef.current.x
        let vstupZ = joystickRef.current.z
        if (klavesy.has('w') || klavesy.has('arrowup')) vstupZ += 1
        if (klavesy.has('s') || klavesy.has('arrowdown')) vstupZ -= 1
        if (klavesy.has('a') || klavesy.has('arrowleft')) vstupX -= 1
        if (klavesy.has('d') || klavesy.has('arrowright')) vstupX += 1

        const delkaVstupu = Math.hypot(vstupX, vstupZ)
        if (delkaVstupu > 1) {
          vstupX /= delkaVstupu
          vstupZ /= delkaVstupu
        }

        if (delkaVstupu > 0.001) {
          const posunX = (pravy.x * vstupX + dopredny.x * vstupZ) * RYCHLOST_POHYBU * dt
          const posunZ = (pravy.z * vstupX + dopredny.z * vstupZ) * RYCHLOST_POHYBU * dt
          let novaX = camera.position.x + posunX
          let novaZ = camera.position.z + posunZ

          const vzdalenostOdStredu = Math.hypot(novaX, novaZ)
          if (vzdalenostOdStredu > konfigurace.polomerSveta) {
            const meritko = konfigurace.polomerSveta / vzdalenostOdStredu
            novaX *= meritko
            novaZ *= meritko
          }

          camera.position.x = novaX
          camera.position.z = novaZ
        }

        // --- Buddy plave kousek za a vpravo od hráče ---
        const cilBuddyX = camera.position.x - dopredny.x * BUDDY_ODSTUP_ZA + pravy.x * BUDDY_ODSTUP_STRANOU
        const cilBuddyZ = camera.position.z - dopredny.z * BUDDY_ODSTUP_ZA + pravy.z * BUDDY_ODSTUP_STRANOU
        const lerpK = Math.min(1, 4.2 * dt)
        buddy.position.x += (cilBuddyX - buddy.position.x) * lerpK
        buddy.position.z += (cilBuddyZ - buddy.position.z) * lerpK
        buddy.position.y = klidnyRezim ? BUDDY_ZAKLADNI_VYSKA : BUDDY_ZAKLADNI_VYSKA + Math.sin(cas * 2.1) * BUDDY_AMPLITUDA
        if (!klidnyRezim) buddy.rotation.y = cas * 0.6

        // --- pulz nepřítele ---
        if (!klidnyRezim) {
          const pulz = 1 + Math.sin(cas * 2.6) * 0.06
          nepritelTelo.scale.setScalar(pulz)
          nepritel.rotation.y = cas * 0.4
          nepritelHalo.rotation.z = cas * 0.5
        }

        // --- setkání ---
        const vzdalenostKNepriteli = Math.hypot(
          camera.position.x - konfigurace.poziceSetkani[0],
          camera.position.z - konfigurace.poziceSetkani[1]
        )
        if (vzdalenostKNepriteli < konfigurace.polomerSetkani) {
          setkaniOhlaseno = true
          onSetkani()
        }
      }

      renderer.render(scene, camera)
    }
    krok()

    return () => {
      bezi = false
      cancelAnimationFrame(smycka)
      observer.disconnect()
      container.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)

      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(material)) material.forEach((m) => m.dispose())
        else material?.dispose()
      })

      renderer.dispose()
      renderer.domElement.remove()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [konfigurace])

  return { containerRef, selhalo, nastavJoystick }
}
