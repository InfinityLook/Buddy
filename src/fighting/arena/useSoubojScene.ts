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
// volání za snímek do dvou poloviček canvasu (setViewport/setScissor).
//
// Vylepšení — VOLNÝ POHYB, potvrzeno přes AskUserQuestion (uživatel
// zvolil "Volný pohyb jako v RPG průzkumu" místo omezenějšího 2D
// bojiště nebo čistě vizuálního vylepšení beze změny pohybu). Tohle je
// skutečná, druhá reverze desátého kola vylepšení výš — kamera se
// znovu NEDÍVÁ vždycky přímo na soupeře, ale kamkoli hráč sám natočil
// (BojovnikStav.natoceni, odvozené ze SMĚRU POHYBU, viz combat/
// engine.ts's tikBojovnika) — přesně to "volná kamera, ne uzamčená na
// souboj" chování, které si uživatel vybral i s vysvětlenou cenou
// (soupeř může snadno vypadnout ze záběru, přesně jako v RPG průzkumu).
// Pozice bojovníka je teď skutečný 2D bod (x, z), ne skalár na jedné
// ose — aréna je čtvercové hřiště, kamera sedí přesně tam, kde stojí
// vlastní bojovník, na OBOU osách, ne jen na jedné.
//
// Bojovníci sami POŘÁD NEJSOU 3D objekty ve scéně — appka nemá žádný
// 3D model postav (viz PostavaGrafika.tsx), takže zůstávají ploché SVG/
// PNG "billboard" sprity mimo Three.js úplně, jen POZICOVANÉ podle
// toho, kam by se v 3D scéně promítly (viz promitniSprite níž).
// ==========================================

/** Rozměr herního světa v jednotkách Three.js na KAŽDÉ ose — aréna je
 *  teď čtvercová (viz Vylepšení výš), takže appka mapuje 0..arenaSirka
 *  enginu na tenhle jeden rozměr stejně na x i na z, ne jen na x jako
 *  dřív u jednorozměrné arény. */
const SVET_ROZMER = 30
/** Výška očí kamery — kamera SEDÍ na místě vlastního bojovníka. */
const VYSKA_OCI = 1.6
/** Výška, kam se promítá sprite soupeře (billboard). */
const VYSKA_POSTAVY = 1.35
/** Jak rychle kamera sleduje pozici I NATOČENÍ vlastního bojovníka —
 *  kamera JE jeho hlava, žádné velké zpoždění nedává smysl, jen tolik
 *  hladkosti, ať prudké odražení (knockback) nebo prudká změna směru
 *  pohybu nepůsobí jako trhavý skok obrazu. */
const RYCHLOST_HLAVY = 14
/** "Dolly-in" na knokaut — zúžení FOV bez skutečného pohybu kamery. */
const FOV_VYCHOZI = 60
const FOV_KO = 40
const RYCHLOST_DOLLY = 3

/** Vylepšení — volný pohyb. Převede 2D bod enginu (0..arenaSirka na
 *  obou osách) na 2D bod ve světě Three.js — jedna funkce pro obě osy
 *  najednou, dřív šlo o jednorozměrný `worldX`. */
const worldSouradnice = (pozice: { x: number; z: number }, arenaSirka: number): { x: number; z: number } => ({
  x: (pozice.x / arenaSirka - 0.5) * SVET_ROZMER,
  z: (pozice.z / arenaSirka - 0.5) * SVET_ROZMER,
})

/** Vylepšení — volný pohyb. Co hook potřebuje o jednom bojovníkovi
 *  vědět, aby spočítal kameru/projekci — BojovnikStav (combat/types.ts)
 *  tenhle tvar strukturálně splňuje sám (má `pozice.x`/`pozice.z`/
 *  `natoceni`), takže SoubojArena3D.tsx může poslat `stav.hraci[i]`
 *  přímo, žádný převodní krok navíc. */
interface BojovnikProScenu {
  pozice: { x: number; z: number }
  natoceni: number
}

interface UseSoubojSceneOptions {
  arenaSirka: number
  /** Vylepšení — výběr scény (areny.ts), vybraná na TV před startem
   *  zápasu. Barvy oblohy/mlhy/země a co se rozseje po hřišti
   *  všechno jde odsud, žádný z nich enginu ani síti nic neříká. */
  arena: Arena
}

interface UseSoubojSceneResult {
  containerRef: React.RefObject<HTMLDivElement>
  selhalo: boolean
  /** Zavolat při každé nové pozici/natočení obou bojovníků — kreslicí
   *  smyčka z toho počítá kamery (vlastní pozice+natočení) i to, kam
   *  se soupeřův sprite promítne na obrazovku. */
  aktualizujPozice: (bojovnik0: BojovnikProScenu, bojovnik1: BojovnikProScenu) => void
  /** Callback ref pro DOM element jednoho spritu — kamera 0/1 (horní/
   *  dolní půlka), bojovník 0/1. Stabilní napříč rendery. */
  registrujSprite: (kamera: 0 | 1, bojovnik: 0 | 1) => (el: HTMLDivElement | null) => void
  /** "Dolly-in" na knokaut. */
  aktualizujKonecKola: (konec: boolean) => void
}

export const useSoubojScene = ({ arenaSirka, arena }: UseSoubojSceneOptions): UseSoubojSceneResult => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selhalo, setSelhalo] = useState(false)
  const hraciRef = useRef<[BojovnikProScenu, BojovnikProScenu]>([
    { pozice: { x: arenaSirka * 0.25, z: arenaSirka / 2 }, natoceni: Math.PI / 2 },
    { pozice: { x: arenaSirka * 0.75, z: arenaSirka / 2 }, natoceni: -Math.PI / 2 },
  ])
  const spriteRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const konecKolaRef = useRef(false)

  const aktualizujPozice = (bojovnik0: BojovnikProScenu, bojovnik1: BojovnikProScenu) => {
    hraciRef.current = [bojovnik0, bojovnik1]
  }

  const aktualizujKonecKola = (konec: boolean) => {
    konecKolaRef.current = konec
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
    container.insertBefore(renderer.domElement, container.firstChild)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(arena.barvaOblohy)
    scene.fog = new THREE.Fog(arena.barvaMlhy, arena.mlhaBlizko, arena.mlhaDaleko)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const slunce = new THREE.DirectionalLight(0xffe7c2, 1.05)
    slunce.position.set(8, 14, 6)
    scene.add(slunce)

    // --- země — teď skutečné čtvercové hřiště přes celou SVET_ROZMER
    // plochu, ne úzký pruh s hlinitou "pěšinou" podél jedné osy (ta
    // dávala smysl jen pro dřívější 1D souboj — volný pohyb potřebuje
    // celou plochu volně schůdnou). ---
    const zem = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(120, SVET_ROZMER * 2), Math.max(120, SVET_ROZMER * 2)),
      new THREE.MeshStandardMaterial({ color: arena.barvaZeme, roughness: 1 })
    )
    zem.rotation.x = -Math.PI / 2
    scene.add(zem)

    // Slabě odlišená vnitřní plocha hřiště samotného (barvaPesiny),
    // ať appka aspoň nějak vizuálně odliší "kde se bojuje" od širšího
    // okolí, i když teď nejde o úzkou pěšinu, ale o celý čtverec.
    const hriste = new THREE.Mesh(
      new THREE.PlaneGeometry(SVET_ROZMER, SVET_ROZMER),
      new THREE.MeshStandardMaterial({ color: arena.barvaPesiny, roughness: 1 })
    )
    hriste.rotation.x = -Math.PI / 2
    hriste.position.y = 0.01
    scene.add(hriste)

    // --- voda vzadu, za dekoracemi — jen atmosféra, mimo hrací plochu,
    // jen když aréna vodu vůbec má (poušť/noc ji nemá). ---
    if (arena.barvaVody) {
      const voda = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.max(120, SVET_ROZMER * 2), 14),
        new THREE.MeshStandardMaterial({ color: arena.barvaVody, roughness: 0.35, transparent: true, opacity: 0.88 })
      )
      voda.rotation.x = -Math.PI / 2
      voda.position.set(0, 0.02, -(SVET_ROZMER * 0.9))
      scene.add(voda)
    }

    // --- stromy/kameny — stejná instancovaná primitiva jako dřív, teď
    // rozeseté PO CELÉM čtvercovém hřišti (s malým vyloučeným kruhem
    // uprostřed, ať dekorace nezačínají přesně tam, kde se souboj
    // obvykle odehrává), ne jen v úzkém pásu za bývalou pěšinou —
    // volný pohyb potřebuje mít co procházet ve všech směrech, ne jen
    // kulisu za jednou hranou. ---
    const dekorace = new THREE.Group()
    if (arena.dekorace !== 'zadne') {
      const POCET_DEKORACI = 34
      const VOLNY_POLOMER = SVET_ROZMER * 0.14
      interface Umisteni {
        x: number
        z: number
        jeStrom: boolean
        rotace: number
        skala: number
      }
      const umisteni: Umisteni[] = []
      let pokusy = 0
      while (umisteni.length < POCET_DEKORACI && pokusy < POCET_DEKORACI * 6) {
        pokusy++
        const x = (Math.random() - 0.5) * SVET_ROZMER
        const z = (Math.random() - 0.5) * SVET_ROZMER
        if (Math.hypot(x, z) < VOLNY_POLOMER) continue
        umisteni.push({
          x,
          z,
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
    // Vylepšení — volný pohyb. Vyhlazený SMĚR pohledu obou kamer (ne
    // úhel — appka lerpuje sin/cos složky přímo, ať se nemusí řešit
    // "kterou stranou je to kratší" zalamování úhlu). Startovní hodnota
    // odpovídá natoceni bojovníků na startu (viz combat/engine.ts's
    // vytvorSoubojStav — appka tu jen nastavuje rozumný startovní
    // odhad, skutečná hodnota dorazí hned prvním aktualizujPozice).
    const smerPohleduRef = { current: [{ x: 1, z: 0 }, { x: -1, z: 0 }] as [{ x: number; z: number }, { x: number; z: number }] }

    const promitniSprite = (kameraIdx: 0 | 1, bojovnikIdx: 0 | 1, svetBod: { x: number; z: number }) => {
      const el = spriteRefs.current[`${kameraIdx}-${bojovnikIdx}`]
      if (!el) return
      promitanyBod.set(svetBod.x, VYSKA_POSTAVY, svetBod.z)
      promitanyBod.project(kamery[kameraIdx])

      // Mimo hloubkový rozsah kamery (za ní, nebo za "far") — sprite
      // by se jinak vykreslil na nesmyslném místě, radši ho schovat.
      // Vylepšení — volný pohyb: soupeř teď navíc reálně MŮŽE stát
      // mimo záběr úplně (kamera se na něj už nedívá vždycky, viz
      // modulový komentář výš) — appka to nijak zvlášť neřeší, sprite
      // prostě zmizí (opacity 0), stejné chování jako "za kamerou".
      if (promitanyBod.z > 1 || promitanyBod.z < -1) {
        el.style.opacity = '0'
        return
      }

      const xProc = ((promitanyBod.x + 1) / 2) * 100
      const yUvnitrPulky = ((1 - promitanyBod.y) / 2) * 50
      const yProc = kameraIdx === 0 ? yUvnitrPulky : 50 + yUvnitrPulky

      // Vylepšení — volný pohyb. I uvnitř hloubkového rozsahu může
      // projekce ležet daleko mimo viditelný výřez (NDC x/y mimo
      // -1..1) — s volnou kamerou, co se soupeře už nedrží automaticky
      // v záběru, se tohle na rozdíl od dřívějška doopravdy stává.
      if (xProc < -20 || xProc > 120 || yProc < -20 || yProc > 120) {
        el.style.opacity = '0'
        return
      }

      el.style.left = `${xProc}%`
      el.style.top = `${yProc}%`
      el.style.opacity = '1'
    }

    const krok = () => {
      if (!bezi) return
      smycka = requestAnimationFrame(krok)
      const dt = Math.min(hodiny.getDelta(), 0.1)

      const [b0, b1] = hraciRef.current
      const svet0 = worldSouradnice(b0.pozice, arenaSirka)
      const svet1 = worldSouradnice(b1.pozice, arenaSirka)
      const svetoveBody: [{ x: number; z: number }, { x: number; z: number }] = [svet0, svet1]
      const natoceni: [number, number] = [b0.natoceni, b1.natoceni]

      const lerpK = Math.min(1, RYCHLOST_HLAVY * dt)
      const cilFov = konecKolaRef.current ? FOV_KO : FOV_VYCHOZI
      const lerpFov = Math.min(1, RYCHLOST_DOLLY * dt)

      ;([0, 1] as const).forEach((i) => {
        // Kamera i sedí PŘESNĚ na místě svého bojovníka (obě osy), a
        // dívá se, KAM SE BOJOVNÍK NATOČIL — natočení appka sama
        // odvozuje ze směru pohybu (viz combat/engine.ts's tikBojovnika),
        // žádný oddělený vstup "rozhlížení" na ovladači.
        kamery[i].position.x += (svetoveBody[i].x - kamery[i].position.x) * lerpK
        kamery[i].position.z += (svetoveBody[i].z - kamery[i].position.z) * lerpK

        const cilSmerX = Math.sin(natoceni[i])
        const cilSmerZ = Math.cos(natoceni[i])
        const smer = smerPohleduRef.current[i]
        smer.x += (cilSmerX - smer.x) * lerpK
        smer.z += (cilSmerZ - smer.z) * lerpK

        kamery[i].lookAt(kamery[i].position.x + smer.x, VYSKA_OCI, kamery[i].position.z + smer.z)
        kamery[i].updateMatrixWorld()
        kamery[i].fov += (cilFov - kamery[i].fov) * lerpFov
        kamery[i].updateProjectionMatrix()
      })

      // Jen sprite SOUPEŘE na každou kameru — vlastní bojovník se v
      // pohledu z očí nevykresluje vůbec.
      promitniSprite(0, 1, svetoveBody[1])
      promitniSprite(1, 0, svetoveBody[0])

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [arenaSirka, arena])

  return { containerRef, selhalo, aktualizujPozice, registrujSprite, aktualizujKonecKola }
}
