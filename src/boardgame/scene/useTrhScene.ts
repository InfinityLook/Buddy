import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SIRKA_MRIZKY, VYSKA_MRIZKY } from '../engine'
import { klicPole, OBCHODY_PODLE_KLICE } from '../obchody'
import { jeOsudovePole } from '../osud'
import { jeKoloStestiPole } from '../kolostesti'
import { jeMinihrovePole } from '../minihry'
import { POSTAVY } from '../postavy'
import type { TrhStav } from '../types'

// ==========================================
// Buddyho Trh — 3D deska mimo React, stejné vlastnictví jako
// social/scene/useAmbientScene.ts a game/explorace/usePlayerWorld.ts:
// hook vytvoří renderer/kameru/smyčku a uklidí se sám při odmontování,
// React dostane jen <div ref={containerRef}>. Obyčejný Three.js, ne
// React Three Fiber — stejný důvod jako všude jinde v appce.
//
// TŘETÍ KOLO GRAFIKY — uživatel appce sám poslal skutečnou fotku herní
// desky (vygenerovanou přes ChatGPT podle appčina vlastního popisu
// Buddyho Trhu — téma, políčka, postavy) s výslovným zadáním "tohle
// použijeme jako hrací desku". Appka ji ale nepoužívá jako plochý
// obrázek pozadí s překryvem (jako game/MapaSveta.tsx) — konkrétní
// rozložení políček na fotce je čistě umělecké a neodpovídá políčko po
// políčku appčiným skutečným datům (obchody.ts/osud.ts/kolostesti.ts/
// minihry.ts), takže appka z fotky ořízla sedm čistých, kolmých
// ukázkových dlaždic (obchod/osud/kolo štěstí/minihra/prázdné pole,
// rám, stůl — viz public/deskova-hra/trh-*.png) a použila je jako
// skutečné PBR textury na existující interaktivní 3D desce. Výsledek:
// každé pole pořád ukazuje svůj OPRAVDOVÝ typ (appka se nespoléhá na
// to, že fotka "uhodla" správné rozložení), jen material pod tím je
// teď skutečná fotka místo appkou kreslené procedurální textury
// (druhé kolo grafiky výš — appka tehdy neměla jinou volně dostupnou
// cestu k "profesionálnímu" vzhledu, protože sandboxní proxy blokuje
// kenney.nl/itch.io/opengameart.org/quaternius.com/polyhaven.com/
// sketchfab.com/poly.pizza; tahle fotka přišla přímo od uživatele, ne
// odjinud, takže appka ji stejně jako jakýkoli jiný uživatelem dodaný
// obrázek v tomhle souboru self-hostuje z public/, nikdy nenačítá za
// běhu odjinud). PBR materiály (metalness/roughness), měkké stíny
// (PCFSoftShadowMap) a filmové tónové mapování (ACESFilmicToneMapping)
// zůstávají beze změny.
//
// Pozadí scény (vytvorGradientPozadi) zůstává appčina procedurální
// canvas textura — žádný obrázek na vykreslení, jen jemný přechod barev
// za deskou — jen appka přeladila odstín z chladné modré na teplou
// hnědou, ať ladí s fotkou.
// ==========================================

const VELIKOST_POLE = 1.4
const MEZERA = 0.06
// Nenatónovaná (bílá) — appka dřív tónovala tmavým olivovým odstínem,
// vyladěným na appčinu dřívější procedurální texturu; násobený přes
// skutečnou (jasnou) fotografickou texturu to ale dělalo nekoupený
// obchod skoro nečitelný, splýval s tmavými poli šachovnice. Bílá
// necháva appku ukázat skutečnou texturu tak, jak vypadá na fotce.
const BARVA_NEPRODANEHO_OBCHODU = '#ffffff'
const BARVA_OSUDOVEHO_POLE = '#c44fb0'
const BARVA_KOLA_STESTI = '#e8b43a'
const BARVA_MINIHROVEHO_POLE = '#1fcab5'

// ==========================================
// Skutečné fotografické textury — appka je nenačítá za běhu odjinud,
// má je self-hostnuté v public/deskova-hra/ (ořezané appkou z fotky,
// co appce poslal uživatel, viz komentář výš). `nacti` je jen tenký
// obal nad `THREE.TextureLoader`, co appce rovnou nastaví sRGB prostor
// barev (stejný, co má renderer.outputColorSpace) a sám se přidá do
// `vsechnyTextury`, ať appka nemusí na každém volání opakovat tytéž dva
// řádky — `TextureLoader.load()` vrací Texture synchronně hned, obrázek
// se do ní dotáhne asynchronně až o pár snímků později.
// ==========================================

const zavaditel = new THREE.TextureLoader()

const nacti = (cesta: string, vsechnyTextury: THREE.Texture[]): THREE.Texture => {
  const textura = zavaditel.load(cesta)
  textura.colorSpace = THREE.SRGBColorSpace
  vsechnyTextury.push(textura)
  return textura
}

/** Svislý přechod pro pozadí scény — appka nahrazuje dřívější plochou
 *  barvu jedním gradientem (tmavší nahoře klesá do skoro černé dole,
 *  "stolní lampa v šeru"), pořád žádný stažený obrázek. */
const vytvorGradientPozadi = (horni: string, dolni: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, horni)
    gradient.addColorStop(1, dolni)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 256)
  }
  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  return textura
}

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
    // Měkké stíny + filmové tónové mapování — appčiny dva hlavní
    // nástroje, jak dosáhnout "profesionálního" vzhledu čistě
    // nastavením rendereru, bez jediného staženého assetu.
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.3
    container.appendChild(renderer.domElement)

    const vsechnyTextury: THREE.Texture[] = []

    const scene = new THREE.Scene()
    const texturaPozadi = vytvorGradientPozadi('#2b1c10', '#060301')
    vsechnyTextury.push(texturaPozadi)
    scene.background = texturaPozadi
    scene.fog = new THREE.Fog('#140d07', 15, 30)

    const stredX = ((SIRKA_MRIZKY - 1) * VELIKOST_POLE) / 2
    const stredZ = ((VYSKA_MRIZKY - 1) * VELIKOST_POLE) / 2

    const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.set(stredX, 11.5, stredZ + 9.5)
    camera.lookAt(stredX, 0, stredZ)

    // Světla — appka přidává skutečný vrhač stínu (hlavniSvetlo) místo
    // appčina dřívějšího "jen osvítit" směrového světla, a dosvitové
    // studené světlo z opačné strany (bez stínu, appka ho nepotřebuje
    // zdvojovat) pro hloubku ve stínovaných místech. Ambientní složka
    // appka přeladila z chladné modré (vyladěné na appčiny dřívější
    // procedurální textury) na teplou, ať nebije se skutečnou
    // fotografickou texturou desky (viz hlavní komentář výš), a o
    // trochu zesílila — appčina dřívější scéna byla s reálnou,
    // detailnější fotkou zbytečně tmavá a kreslené ikony na dlaždicích
    // byly těžko čitelné.
    scene.add(new THREE.AmbientLight('#e4c9a0', 0.55))
    const hlavniSvetlo = new THREE.DirectionalLight('#fff3df', 1.6)
    hlavniSvetlo.position.set(stredX + 6, 13, stredZ + 5)
    hlavniSvetlo.castShadow = true
    hlavniSvetlo.shadow.mapSize.set(2048, 2048)
    hlavniSvetlo.shadow.camera.left = -11
    hlavniSvetlo.shadow.camera.right = 11
    hlavniSvetlo.shadow.camera.top = 11
    hlavniSvetlo.shadow.camera.bottom = -11
    hlavniSvetlo.shadow.camera.near = 1
    hlavniSvetlo.shadow.camera.far = 32
    hlavniSvetlo.shadow.bias = -0.0015
    hlavniSvetlo.target.position.set(stredX, 0, stredZ)
    scene.add(hlavniSvetlo)
    scene.add(hlavniSvetlo.target)
    const dosvitSvetlo = new THREE.DirectionalLight('#5a7bd6', 0.35)
    dosvitSvetlo.position.set(stredX - 5, 6, stredZ - 4)
    scene.add(dosvitSvetlo)

    // Stůl pod celou deskou — appka dřív kreslila jen samotnou mřížku
    // na pozadí barvy; teď má deska skutečný "stůl", na který appčiny
    // stíny dopadají (receiveShadow), ořezaný ze skutečného dřevěného
    // stolu na uživatelově fotce (viz hlavní komentář výš).
    const texturaStolu = nacti('/deskova-hra/trh-stul.png', vsechnyTextury)
    texturaStolu.wrapS = THREE.RepeatWrapping
    texturaStolu.wrapT = THREE.RepeatWrapping
    texturaStolu.repeat.set(5, 5)
    const stul = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ map: texturaStolu, roughness: 0.85, metalness: 0.05 })
    )
    stul.rotation.x = -Math.PI / 2
    stul.position.set(stredX, -0.16, stredZ)
    stul.receiveShadow = true
    scene.add(stul)

    // Dřevěný rám kolem mřížky — čtyři samostatné "kolejnice" appka
    // staví přesně na obvod SIRKA_MRIZKY × VYSKA_MRIZKY mřížky, ať
    // deska vypadá jako skutečná stolní hra v dřevěné krabici, ne jako
    // dlaždice plovoucí bez okraje nad stolem. Textura je skutečný
    // dřevěný rám z uživatelovy fotky (viz hlavní komentář výš).
    const texturaRamu = nacti('/deskova-hra/trh-ram.png', vsechnyTextury)
    texturaRamu.wrapS = THREE.RepeatWrapping
    texturaRamu.wrapT = THREE.RepeatWrapping
    texturaRamu.repeat.set(6, 1)
    const materialRamu = new THREE.MeshStandardMaterial({ map: texturaRamu, roughness: 0.6, metalness: 0.08 })
    const minX = -VELIKOST_POLE / 2
    const maxX = (SIRKA_MRIZKY - 1) * VELIKOST_POLE + VELIKOST_POLE / 2
    const minZ = -VELIKOST_POLE / 2
    const maxZ = (VYSKA_MRIZKY - 1) * VELIKOST_POLE + VELIKOST_POLE / 2
    const sirkaMrizky = maxX - minX
    const hloubkaMrizky = maxZ - minZ
    const T = 0.4
    const H = 0.3
    const geoRailNS = new THREE.BoxGeometry(sirkaMrizky + T * 2, H, T)
    const geoRailEW = new THREE.BoxGeometry(T, H, hloubkaMrizky)
    const railSever = new THREE.Mesh(geoRailNS, materialRamu)
    railSever.position.set(stredX, 0, minZ - T / 2)
    const railJih = new THREE.Mesh(geoRailNS, materialRamu)
    railJih.position.set(stredX, 0, maxZ + T / 2)
    const railZapad = new THREE.Mesh(geoRailEW, materialRamu)
    railZapad.position.set(minX - T / 2, 0, stredZ)
    const railVychod = new THREE.Mesh(geoRailEW, materialRamu)
    railVychod.position.set(maxX + T / 2, 0, stredZ)
    for (const rail of [railSever, railJih, railZapad, railVychod]) {
      rail.castShadow = true
      rail.receiveShadow = true
      scene.add(rail)
    }

    // Šachovnicová mřížka — appka teď na ni místo appkou kreslených
    // procedurálních textur dává skutečné fotografické dlaždice ořezané
    // z uživatelovy fotky (viz hlavní komentář výš): zlatá/bronzová
    // metalická na každém z 12 obchodních políček (appka ji sdílí mezi
    // všemi, protože barva se nastaví až per-pole — viz `color` níž —
    // ať přebarvení jednoho obchodu podle vlastníka nezmění barvu i
    // ostatním polím), fialová na šesti "Osud" políčkách, zlatá se
    // slabým vlastním leskem na jediném poli "Kolo štěstí" a tyrkysová
    // na pěti polích "Minihra". Obyčejná prázdná pole appka střídá mezi
    // dvěma odstíny TÉŽE fotky (appka fotila jen jeden vzorek
    // "prázdného" pole) — světlejší beze změny, tmavší s mírně tmavším
    // `color` tónem, aby šachovnice dvě barvy pořád rozlišila.
    const geometriePole = new THREE.BoxGeometry(VELIKOST_POLE - MEZERA, 0.2, VELIKOST_POLE - MEZERA)
    const texturaPrazdna = nacti('/deskova-hra/trh-dlazdice-prazdne.png', vsechnyTextury)
    const texturaObchodu = nacti('/deskova-hra/trh-dlazdice-obchod.png', vsechnyTextury)
    const texturaOsudu = nacti('/deskova-hra/trh-dlazdice-osud.png', vsechnyTextury)
    const texturaKola = nacti('/deskova-hra/trh-dlazdice-kolo.png', vsechnyTextury)
    const texturaMinihry = nacti('/deskova-hra/trh-dlazdice-minihra.png', vsechnyTextury)
    const materialSvetly = new THREE.MeshStandardMaterial({ map: texturaPrazdna, roughness: 0.55, metalness: 0.06 })
    const materialTmavy = new THREE.MeshStandardMaterial({
      map: texturaPrazdna,
      color: '#b6a47c',
      roughness: 0.55,
      metalness: 0.06,
    })
    const materialOsud = new THREE.MeshStandardMaterial({
      map: texturaOsudu,
      color: BARVA_OSUDOVEHO_POLE,
      emissive: BARVA_OSUDOVEHO_POLE,
      emissiveIntensity: 0.25,
      roughness: 0.4,
      metalness: 0.15,
    })
    const materialKoloStesti = new THREE.MeshStandardMaterial({
      map: texturaKola,
      color: BARVA_KOLA_STESTI,
      emissive: BARVA_KOLA_STESTI,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.55,
    })
    const materialMinihra = new THREE.MeshStandardMaterial({
      map: texturaMinihry,
      color: BARVA_MINIHROVEHO_POLE,
      emissive: BARVA_MINIHROVEHO_POLE,
      emissiveIntensity: 0.3,
      roughness: 0.35,
      metalness: 0.2,
    })
    const obchodniMeshePodleKlice = new Map<string, THREE.Mesh>()
    for (let x = 0; x < SIRKA_MRIZKY; x++) {
      for (let z = 0; z < VYSKA_MRIZKY; z++) {
        const klic = klicPole({ x, z })
        const jeObchod = !!OBCHODY_PODLE_KLICE[klic]
        const material = jeObchod
          ? new THREE.MeshStandardMaterial({
              map: texturaObchodu,
              color: BARVA_NEPRODANEHO_OBCHODU,
              roughness: 0.3,
              metalness: 0.65,
            })
          : jeOsudovePole({ x, z })
            ? materialOsud
            : jeKoloStestiPole({ x, z })
              ? materialKoloStesti
              : jeMinihrovePole({ x, z })
                ? materialMinihra
                : (x + z) % 2 === 0
                  ? materialSvetly
                  : materialTmavy
        const pole = new THREE.Mesh(geometriePole, material)
        pole.position.set(x * VELIKOST_POLE, 0, z * VELIKOST_POLE)
        pole.receiveShadow = true
        scene.add(pole)
        if (jeObchod) obchodniMeshePodleKlice.set(klic, pole)
      }
    }

    // Jeden token na hráče — appka nahrazuje dřívější holou kapsli
    // dvoudílnou "pěšákovou" figurkou (kuželovité tělo + kulatá
    // hlavička, stejný tvar jako skutečná dřevěná meeple figurka),
    // postaveno ze dvou sdílených geometrií a jednoho vlastního
    // materiálu na postavu (barva se nemění, appka ji jen jednou
        // nastaví při vytvoření). Figurky vrhají stín (castShadow),
    // appka je nenechává stín i přijímat — je to malý objekt bez
    // dalších objektů pod sebou, co by na něj mohly vrhat stín.
    const geometrieTelo = new THREE.CylinderGeometry(0.16, 0.23, 0.4, 16)
    const geometrieHlava = new THREE.SphereGeometry(0.18, 16, 16)
    const tokeny = new Map<string, THREE.Object3D>()
    for (const hrac of stavRef.current.hraci) {
      const material = new THREE.MeshStandardMaterial({
        color: POSTAVY[hrac.postavaId].barva,
        roughness: 0.4,
        metalness: 0.25,
      })
      const telo = new THREE.Mesh(geometrieTelo, material)
      telo.position.y = 0.2
      telo.castShadow = true
      const hlava = new THREE.Mesh(geometrieHlava, material)
      hlava.position.y = 0.48
      hlava.castShadow = true
      const skupina = new THREE.Group()
      skupina.add(telo, hlava)
      skupina.position.set(hrac.pozice.x * VELIKOST_POLE, 0, hrac.pozice.z * VELIKOST_POLE)
      scene.add(skupina)
      tokeny.set(hrac.id, skupina)
    }

    let bezi = true
    const cilovaPozice = new THREE.Vector3()
    const smycka = () => {
      if (!bezi) return
      for (const hrac of stavRef.current.hraci) {
        const token = tokeny.get(hrac.id)
        if (!token) continue
        cilovaPozice.set(hrac.pozice.x * VELIKOST_POLE, 0, hrac.pozice.z * VELIKOST_POLE)
        token.position.lerp(cilovaPozice, 0.15)
      }
      // Vlastnictví obchodů se může kdykoli změnit (koupě/nájem
      // nezávisí na herní smyčce), takže appka barvu obchodního pole
      // přebarví každý snímek podle aktuálního stavu — 12 přiřazení
      // barvy je zanedbatelná cena i na 60 sn./s.
      for (const [klic, mesh] of obchodniMeshePodleKlice) {
        const vlastnikId = stavRef.current.vlastnictvi[klic]
        const material = mesh.material as THREE.MeshStandardMaterial
        const vlastnik = vlastnikId ? stavRef.current.hraci.find((h) => h.id === vlastnikId) : undefined
        material.color.set(vlastnik ? POSTAVY[vlastnik.postavaId].barva : BARVA_NEPRODANEHO_OBCHODU)
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
      // scene.traverse pokrývá geometrii/materiál KAŽDÉHO Mesh v celé
      // scéně (včetně dětí uvnitř skupin jako token) — appka tak
      // nemusí ručně vyjmenovávat každou sdílenou i unikátní (per
      // obchod, per token) položku zvlášť. Textury appka uvolňuje
      // samostatně (`vsechnyTextury`), protože material.dispose()
      // texturu, kterou drží jako `.map`, sám neuvolní.
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
          else obj.material.dispose()
        }
      })
      for (const t of vsechnyTextury) t.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement)
    }
    // Efekt se schválně spouští jen jednou za mount (viz komentář výš —
    // aktuální stav se čte přes stavRef, ne přes tuhle závislost).
  }, [])

  return { containerRef, selhalo }
}
