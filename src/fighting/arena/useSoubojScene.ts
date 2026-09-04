import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

// ==========================================
// Souboj, třetí kolo vizuálních vylepšení (viz CLAUDE.md) — skutečná
// 3D scéna arény místo ploché karty, potvrzeno přes AskUserQuestion
// (3D prostředí + rozdělená obrazovka s vlastní kamerou pro každého
// hráče + ploché SVG postavy zůstávají "billboardy" nad scénou).
//
// Stejná zásada vlastnictví jako RPG's usePlayerWorld.ts a Social's
// useAmbientScene.ts: hook si vytvoří renderer/scénu/kamery/smyčku
// mimo React a uklidí při odchodu, React dostane jen canvas (přes
// containerRef) a malé imperativní API. Obyčejný Three.js, žádné
// React Three Fiber — druhý, paralelní způsob práce se scénou vedle
// už zavedeného vzoru by appce nic nepřidal.
//
// Rozdělená obrazovka jede přes JEDEN renderer a JEDNU scénu, ne dva
// samostatné WebGL kontexty — dvě kamery, dva `renderer.render()`
// volání za snímek do dvou poloviček canvasu (setViewport/setScissor),
// přesně technika, jakou split-screen three.js sám doporučuje.
// Levnější než druhý renderer a zbytečná duplikace geometrie v paměti
// — schválně "ať je to rychlé", jak appka slíbila.
//
// Bojovníci sami NEJSOU 3D objekty ve scéně — appka nemá žádný 3D
// model postav (viz PostavaGrafika.tsx), takže zůstávají ploché SVG
// "billboard" sprity mimo Three.js úplně, jen POZICOVANÉ podle toho,
// kam by se v 3D scéně promítly (viz promitniSprite níž). Samotné
// vykreslení spritu (stavové animace, jiskry) dělá pořád React/CSS
// stejně jako v 2D verzi (SoubojArena2D.tsx) — hook jen píše
// left/top/opacity na obalový element, na který mu React dá
// referenci přes registrujSprite. Pozicování (imperativní, každý
// snímek) a vizuální stav (deklarativní, React classNames s vlastními
// transform animacemi) tak nikdy nesahají na stejnou CSS vlastnost.
// ==========================================

/** Šířka herního světa v jednotkách Three.js, na kterou se mapuje
 *  1D pozice bojovníka 0..arenaSirka z enginu (engine.ts). */
const SVET_SIRKA = 30
const VYSKA_KAMERY = 5.6
const HLOUBKA_KAMERY = 11.5
const VYSKA_CILE = 2
const VYSKA_POSTAVY = 1.35
/** Jak moc kamera upřednostňuje "svého" bojovníka před středem mezi
 *  oběma — 0 by znamenalo identický záběr pro obě kamery, 1 by
 *  hrozilo, že soupeř vypadne ze záběru úplně. */
const ZAOSTRENI_NA_VLASTNIHO = 0.55
const RYCHLOST_SLEDOVANI = 3.4

const worldX = (pozice: number, arenaSirka: number): number => (pozice / arenaSirka - 0.5) * SVET_SIRKA

interface UseSoubojSceneOptions {
  arenaSirka: number
}

interface UseSoubojSceneResult {
  containerRef: React.RefObject<HTMLDivElement>
  selhalo: boolean
  /** Zavolat při každé nové pozici obou bojovníků (0..arenaSirka) —
   *  kreslicí smyčka z toho počítá kamery i to, kam se sprity
   *  promítnou na obrazovku. */
  aktualizujPozice: (pozice0: number, pozice1: number) => void
  /** Callback ref pro DOM element jednoho spritu — kamera 0/1 (horní/
   *  dolní půlka), bojovník 0/1. Stabilní napříč rendery (viz
   *  komentář u registruj níž), ať se element neregistruje/
   *  neodregistruje 60× za sekundu jen proto, že stav rodiče na
   *  každý tik dostává novou funkci. */
  registrujSprite: (kamera: 0 | 1, bojovnik: 0 | 1) => (el: HTMLDivElement | null) => void
}

export const useSoubojScene = ({ arenaSirka }: UseSoubojSceneOptions): UseSoubojSceneResult => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selhalo, setSelhalo] = useState(false)
  const poziceRef = useRef<[number, number]>([arenaSirka * 0.25, arenaSirka * 0.75])
  const spriteRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const aktualizujPozice = (pozice0: number, pozice1: number) => {
    poziceRef.current = [pozice0, pozice1]
  }

  const registrujSprite = useMemo(() => {
    const cache: Record<string, (el: HTMLDivElement | null) => void> = {}
    return (kamera: 0 | 1, bojovnik: 0 | 1) => {
      const klic = `${kamera}-${bojovnik}`
      if (!cache[klic]) cache[klic] = (el) => { spriteRefs.current[klic] = el }
      return cache[klic]
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    } catch {
      setSelhalo(true)
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setScissorTest(true)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    // Plátno jako první potomek kontejneru, ne appendChild na konec —
    // sprity (JSX děti stejného kontejneru) tak vždycky malují nad
    // ním podle pořadí v DOM, bez nutnosti řešit z-index navíc.
    container.insertBefore(renderer.domElement, container.firstChild)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#16241a')
    scene.fog = new THREE.Fog('#16241a', 16, 42)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const slunce = new THREE.DirectionalLight(0xffe7c2, 1.05)
    slunce.position.set(8, 14, 6)
    scene.add(slunce)

    // --- tráva + hlinitá "pěšina" podél osy souboje (Z=0) ---
    const zem = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: '#3a6b34', roughness: 1 })
    )
    zem.rotation.x = -Math.PI / 2
    scene.add(zem)

    const pesina = new THREE.Mesh(
      new THREE.PlaneGeometry(SVET_SIRKA + 8, 3.2),
      new THREE.MeshStandardMaterial({ color: '#6b5a3f', roughness: 1 })
    )
    pesina.rotation.x = -Math.PI / 2
    pesina.position.y = 0.01
    scene.add(pesina)

    // --- voda vzadu, za stromy — jen atmosféra, mimo dosah obou kamer ---
    const voda = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 14),
      new THREE.MeshStandardMaterial({ color: '#1e6091', roughness: 0.35, transparent: true, opacity: 0.88 })
    )
    voda.rotation.x = -Math.PI / 2
    voda.position.set(0, 0.02, -26)
    scene.add(voda)

    // --- stromy/kameny — stejná primitiva jako RPG's usePlayerWorld.ts
    // (žádný stažený model, appka na 3D postavy/scenérii nemá
    // pipeline), rozeseté v pásu ZA pěšinou, ať kamerám nic neblokuje
    // výhled na souboj samotný. ---
    const dekorace = new THREE.Group()
    for (let i = 0; i < 26; i++) {
      const x = (Math.random() - 0.5) * (SVET_SIRKA + 16)
      const z = -4 - Math.random() * 18
      const jeStrom = Math.random() > 0.35
      const skupina = new THREE.Group()
      if (jeStrom) {
        const kmen = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6),
          new THREE.MeshStandardMaterial({ color: '#3d2a1a', roughness: 1 })
        )
        kmen.position.y = 0.7
        const koruna = new THREE.Mesh(
          new THREE.ConeGeometry(0.9, 1.8, 7),
          new THREE.MeshStandardMaterial({ color: '#2f5d34', roughness: 0.9 })
        )
        koruna.position.y = 2.1
        skupina.add(kmen, koruna)
      } else {
        const kamen = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.3),
          new THREE.MeshStandardMaterial({ color: '#5a5248', roughness: 1 })
        )
        kamen.position.y = 0.3
        kamen.rotation.set(Math.random(), Math.random(), Math.random())
        skupina.add(kamen)
      }
      skupina.position.set(x, 0, z)
      dekorace.add(skupina)
    }
    scene.add(dekorace)

    const kamery: [THREE.PerspectiveCamera, THREE.PerspectiveCamera] = [
      new THREE.PerspectiveCamera(60, 1, 0.1, 100),
      new THREE.PerspectiveCamera(60, 1, 0.1, 100),
    ]
    kamery[0].position.set(0, VYSKA_KAMERY, HLOUBKA_KAMERY)
    kamery[1].position.set(0, VYSKA_KAMERY, HLOUBKA_KAMERY)

    const prizpusob = () => {
      const sirka = container.clientWidth
      const vyska = container.clientHeight
      if (sirka === 0 || vyska === 0) return
      renderer.setSize(sirka, vyska)
      // Poloviční výška na kameru, ne celá — každá kreslí jen do své
      // půlky obrazovky (viz smyčka níž).
      const aspekt = sirka / (vyska / 2)
      kamery[0].aspect = aspekt
      kamery[1].aspect = aspekt
      kamery[0].updateProjectionMatrix()
      kamery[1].updateProjectionMatrix()
    }
    const observer = new ResizeObserver(prizpusob)
    observer.observe(container)
    prizpusob()

    let smycka = 0
    let bezi = true
    const hodiny = new THREE.Clock()
    const promitanyBod = new THREE.Vector3()

    const promitniSprite = (kameraIdx: 0 | 1, bojovnikIdx: 0 | 1, poziceX: number) => {
      const el = spriteRefs.current[`${kameraIdx}-${bojovnikIdx}`]
      if (!el) return
      promitanyBod.set(poziceX, VYSKA_POSTAVY, 0)
      promitanyBod.project(kamery[kameraIdx])

      // Mimo hloubkový rozsah kamery (za ní, nebo za "far") — sprite
      // by se jinak vykreslil na nesmyslném místě, radši ho schovat.
      if (promitanyBod.z > 1 || promitanyBod.z < -1) {
        el.style.opacity = '0'
        return
      }

      const xProc = ((promitanyBod.x + 1) / 2) * 100
      // NDC y=1 je nahoře TÉ JEDNÉ kamery — appka to musí převést na
      // procenta z CELÉHO kontejneru (obě půlky dohromady), ne jen
      // z její vlastní poloviny.
      const yUvnitrPulky = ((1 - promitanyBod.y) / 2) * 50
      const yProc = kameraIdx === 0 ? yUvnitrPulky : 50 + yUvnitrPulky

      el.style.left = `${xProc}%`
      el.style.top = `${yProc}%`
      el.style.opacity = '1'
    }

    const krok = () => {
      if (!bezi) return
      smycka = requestAnimationFrame(krok)
      const dt = Math.min(hodiny.getDelta(), 0.1)

      const [p0, p1] = poziceRef.current
      const x0 = worldX(p0, arenaSirka)
      const x1 = worldX(p1, arenaSirka)
      const stred = (x0 + x1) / 2
      const vlastniX: [number, number] = [x0, x1]

      const lerpK = Math.min(1, RYCHLOST_SLEDOVANI * dt)
      ;([0, 1] as const).forEach((i) => {
        const cil = vlastniX[i] * ZAOSTRENI_NA_VLASTNIHO + stred * (1 - ZAOSTRENI_NA_VLASTNIHO)
        kamery[i].position.x += (cil - kamery[i].position.x) * lerpK
        kamery[i].lookAt(stred, VYSKA_CILE, 0)
        kamery[i].updateMatrixWorld()
      })

      promitniSprite(0, 0, x0)
      promitniSprite(0, 1, x1)
      promitniSprite(1, 0, x0)
      promitniSprite(1, 1, x1)

      const sirka = container.clientWidth
      const vyska = container.clientHeight
      renderer.setViewport(0, vyska / 2, sirka, vyska / 2)
      renderer.setScissor(0, vyska / 2, sirka, vyska / 2)
      renderer.render(scene, kamery[0])

      renderer.setViewport(0, 0, sirka, vyska / 2)
      renderer.setScissor(0, 0, sirka, vyska / 2)
      renderer.render(scene, kamery[1])
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
      // arenaSirka je v praxi konstanta z engine.ts (ARENA_SIRKA) —
      // v poli závislostí jen pro úplnost.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [arenaSirka])

  return { containerRef, selhalo, aktualizujPozice, registrujSprite }
}
