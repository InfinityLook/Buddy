import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Arena } from './areny'

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
// Desáté kolo vylepšení, na výslovnou žádost přes AskUserQuestion,
// obrátilo kamery z třetí osoby (za a nad bojovníkem, koukající na
// střed mezi oběma) na SKUTEČNÝ pohled z očí — kamera hráče sedí
// přesně tam, kde stojí jeho vlastní bojovník (VYSKA_OCI, Z=0, stejná
// rovina jako souboj samotný), a kouká přímo na soupeře, žádný odstup
// ani lerpované "zaostření" na střed jako dřív. Přijatý (a výslovně
// odsouhlasený) důsledek: vlastní postavu takhle NEJDE vidět vůbec —
// appka ji proto v týhle kameře ani nevykresluje (viz SoubojArena3D.tsx),
// a zpětnou vazbu o vlastním stavu (zásah/blok/štít/perfektní blok)
// nese místo animace na (neviditelné) vlastní postavě přes obrazovku
// přes celou svou půlku (souboj-vlastni-prekryv, tamtéž) — přesně jak
// bylo řečeno předem, než padlo "ano".
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
/** Výška očí kamery — kamera SEDÍ na místě vlastního bojovníka, ne
 *  odtažená a zvednutá jako dřívější kamera třetí osoby. */
const VYSKA_OCI = 1.6
/** Výška, kam se (jak vlastní kamera dívá, tak kam se promítá) sprite
 *  soupeře — zůstává stejná hodnota jako dřív, teď jako jediný účel:
 *  billboard soupeře. */
const VYSKA_POSTAVY = 1.35
/** Jak rychle kamera sleduje pozici vlastního bojovníka — kamera JE
 *  jeho hlava, žádné velké zpoždění nedává smysl, jen tolik hladkosti,
 *  ať prudké odražení (knockback) nepůsobí jako trhavý skok obrazu. */
const RYCHLOST_HLAVY = 14

const worldX = (pozice: number, arenaSirka: number): number => (pozice / arenaSirka - 0.5) * SVET_SIRKA

interface UseSoubojSceneOptions {
  arenaSirka: number
  /** Vylepšení — výběr scény (areny.ts), vybraná na TV před startem
   *  zápasu. Barvy oblohy/mlhy/země a co se rozseje za pěšinou
   *  všechno jde odsud, žádný z nich enginu ani síti nic neříká. */
  arena: Arena
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

export const useSoubojScene = ({ arenaSirka, arena }: UseSoubojSceneOptions): UseSoubojSceneResult => {
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

    // Vylepšení — na vysokém devicePixelRatio (většina telefonů) už
    // samo vykreslení ve vyšším rozlišení dělá antialiasing skoro
    // zbytečný (supersampling z DPR ho z velké části nahrazuje) — MSAA
    // (`antialias: true`) navrch je pak čistý výkonový náklad bez moc
    // viditelného přínosu. Scéna se navíc kreslí DVAKRÁT za snímek
    // (jedna kamera na půlku obrazovky, viz komentář nad souborem),
    // takže tenhle náklad platí appka dvakrát, ne jednou.
    const dpr = Math.min(window.devicePixelRatio, 2)
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: dpr <= 1, powerPreference: 'high-performance' })
    } catch {
      setSelhalo(true)
      return
    }

    renderer.setPixelRatio(dpr)
    renderer.setScissorTest(true)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    // Plátno jako první potomek kontejneru, ne appendChild na konec —
    // sprity (JSX děti stejného kontejneru) tak vždycky malují nad
    // ním podle pořadí v DOM, bez nutnosti řešit z-index navíc.
    container.insertBefore(renderer.domElement, container.firstChild)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(arena.barvaOblohy)
    scene.fog = new THREE.Fog(arena.barvaMlhy, arena.mlhaBlizko, arena.mlhaDaleko)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const slunce = new THREE.DirectionalLight(0xffe7c2, 1.05)
    slunce.position.set(8, 14, 6)
    scene.add(slunce)

    // --- země + hlinitá "pěšina" podél osy souboje (Z=0) ---
    const zem = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: arena.barvaZeme, roughness: 1 })
    )
    zem.rotation.x = -Math.PI / 2
    scene.add(zem)

    const pesina = new THREE.Mesh(
      new THREE.PlaneGeometry(SVET_SIRKA + 8, 3.2),
      new THREE.MeshStandardMaterial({ color: arena.barvaPesiny, roughness: 1 })
    )
    pesina.rotation.x = -Math.PI / 2
    pesina.position.y = 0.01
    scene.add(pesina)

    // --- voda vzadu, za stromy — jen atmosféra, mimo dosah obou kamer,
    // jen když aréna vodu vůbec má (poušť/noc ji nemá). ---
    if (arena.barvaVody) {
      const voda = new THREE.Mesh(
        new THREE.PlaneGeometry(120, 14),
        new THREE.MeshStandardMaterial({ color: arena.barvaVody, roughness: 0.35, transparent: true, opacity: 0.88 })
      )
      voda.rotation.x = -Math.PI / 2
      voda.position.set(0, 0.02, -26)
      scene.add(voda)
    }

    // --- stromy/kameny — stejná primitiva jako RPG's usePlayerWorld.ts
    // (žádný stažený model, appka na 3D postavy/scenérii nemá
    // pipeline), rozeseté v pásu ZA pěšinou, ať kamerám nic neblokuje
    // výhled na souboj samotný. Co přesně se rozseje (les/jen kameny/
    // nic) i jakou barvou určuje vybraná aréna, viz areny.ts.
    //
    // Vylepšení — INSTANCOVANÉ, ne 26 samostatných Mesh objektů jako
    // dřív. Dřívější verze vytvářela vlastní geometrii i materiál pro
    // KAŽDOU jednu dekoraci zvlášť, i když barva/tvar byly napříč nimi
    // stejné (lišila se jen pozice/rotace/velikost) — 26 samostatných
    // draw volání navíc, u scény, co se kreslí DVAKRÁT za snímek (jedna
    // kamera na půlku obrazovky), tedy 52 volání jen na dekorace.
    // InstancedMesh nakreslí libovolný počet instancí JEDNÍM draw
    // voláním — sdílená geometrie/materiál napříč všemi stromy (resp.
    // kameny) jedné arény, jen s jinou transformační maticí na
    // instanci. Reálný, měřitelný zásah do výkonu na zařízení, kde má
    // scéna běžet plynule, ne kosmetická reorganizace kódu. ---
    const dekorace = new THREE.Group()
    if (arena.dekorace !== 'zadne') {
      const POCET_DEKORACI = 26
      interface Umisteni {
        x: number
        z: number
        jeStrom: boolean
        rotace: number
        skala: number
      }
      const umisteni: Umisteni[] = []
      for (let i = 0; i < POCET_DEKORACI; i++) {
        umisteni.push({
          x: (Math.random() - 0.5) * (SVET_SIRKA + 16),
          z: -4 - Math.random() * 18,
          jeStrom: arena.dekorace === 'les' && Math.random() > 0.35,
          rotace: Math.random() * Math.PI * 2,
          skala: 0.3 + Math.random() * 0.3,
        })
      }
      const stromy = umisteni.filter((u) => u.jeStrom)
      const kameny = umisteni.filter((u) => !u.jeStrom)
      const matice = new THREE.Matrix4()

      if (stromy.length > 0) {
        const matKmen = new THREE.MeshStandardMaterial({ color: arena.barvaKmene, roughness: 1 })
        const matKoruna = new THREE.MeshStandardMaterial({ color: arena.barvaKoruny, roughness: 0.9 })
        const kmeny = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6), matKmen, stromy.length)
        const koruny = new THREE.InstancedMesh(new THREE.ConeGeometry(0.9, 1.8, 7), matKoruna, stromy.length)
        stromy.forEach((u, i) => {
          matice.makeTranslation(u.x, 0.7, u.z)
          kmeny.setMatrixAt(i, matice)
          matice.makeTranslation(u.x, 2.1, u.z)
          koruny.setMatrixAt(i, matice)
        })
        dekorace.add(kmeny, koruny)
      }

      if (kameny.length > 0) {
        const matKamen = new THREE.MeshStandardMaterial({ color: arena.barvaKamene, roughness: 1 })
        const skaly = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1), matKamen, kameny.length)
        const q = new THREE.Quaternion()
        const s = new THREE.Vector3()
        kameny.forEach((u, i) => {
          q.setFromEuler(new THREE.Euler(u.rotace, u.rotace * 0.7, u.rotace * 1.3))
          s.setScalar(u.skala)
          matice.compose(new THREE.Vector3(u.x, u.skala, u.z), q, s)
          skaly.setMatrixAt(i, matice)
        })
        dekorace.add(skaly)
      }
    }
    scene.add(dekorace)

    const kamery: [THREE.PerspectiveCamera, THREE.PerspectiveCamera] = [
      new THREE.PerspectiveCamera(60, 1, 0.1, 100),
      new THREE.PerspectiveCamera(60, 1, 0.1, 100),
    ]
    kamery[0].position.set(0, VYSKA_OCI, 0)
    kamery[1].position.set(0, VYSKA_OCI, 0)

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
      // Kamera i (hráč i) sedí na pozici SVÉHO bojovníka a kouká na
      // toho druhého — vlastniX je "kam patří moje hlava", protivnikX
      // "na koho se dívám". Žádné zaostření na střed jako dřív u
      // třetí osoby: v pohledu z očí není žádný "střed mezi oběma" k
      // vidění, jen soupeř přímo před sebou.
      const vlastniX: [number, number] = [x0, x1]
      const protivnikX: [number, number] = [x1, x0]

      const lerpK = Math.min(1, RYCHLOST_HLAVY * dt)
      ;([0, 1] as const).forEach((i) => {
        kamery[i].position.x += (vlastniX[i] - kamery[i].position.x) * lerpK
        kamery[i].lookAt(protivnikX[i], VYSKA_POSTAVY, 0)
        kamery[i].updateMatrixWorld()
      })

      // Jen sprite SOUPEŘE na každou kameru — vlastní bojovník se v
      // pohledu z očí nevykresluje vůbec (SoubojArena3D.tsx pro něj
      // ani nezaregistruje DOM element, takže by tohle stejně jen
      // tiše skončilo na `if (!el) return` v promitniSprite).
      promitniSprite(0, 1, x1)
      promitniSprite(1, 0, x0)

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
      // v poli závislostí jen pro úplnost. `arena` se vybírá na TV
      // předem, ne uprostřed zápasu, ale patří do závislostí správně
      // — kdyby se přece jen změnila, scéna se má vážně přestavět.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [arenaSirka, arena])

  return { containerRef, selhalo, aktualizujPozice, registrujSprite }
}
