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
// DRUHÉ KOLO GRAFIKY — uživatel výslovně odmítl Kenney i jakýkoli jiný
// stažený balíček ("chci fakt hezkou a profesionální grafiku, ne
// Kenney") a zvolil cestu "postav to technikou": appka nemá nástroj na
// generování 3D modelů a appčin sandboxní proxy blokuje úplně každou
// volně dostupnou 3D knihovnu kromě GitHubu (kenney.nl/itch.io/
// opengameart.org/quaternius.com/polyhaven.com/sketchfab.com/
// poly.pizza — appka to ověřila přímým curl na všechny najednou, ne že
// by to jen předpokládala), takže "profesionální" vzhled appka staví
// čistě vlastními prostředky: procedurální canvas textury (zrnění,
// dřevo, přechod oblohy — appka nikde NIC nestahuje), PBR materiály s
// opravdovým metalness/roughness místo ploché barvy, měkké stíny
// (PCFSoftShadowMap) a filmové tónové mapování (ACESFilmicToneMapping)
// místo appčina dřívějšího holého rendereru.
//
// Tahle revize taky opravuje skutečnou, dřív nikým nevšimnutou mezeru:
// appka měla celou dobu 5 polí "Minihra" (viz minihry.ts, Fáze 6), ale
// scéna na ně nikdy nereagovala — `jeMinihrovePole` se tu vůbec
// neimportoval, takže minihrové pole vypadalo úplně stejně jako obyčejné
// prázdné pole šachovnice. Teď má appka pátou, vlastní barvu/materiál
// vedle obchodu/Osudu/kola štěstí, přesně jako ty tři.
// ==========================================

const VELIKOST_POLE = 1.4
const MEZERA = 0.06
const BARVA_NEPRODANEHO_OBCHODU = '#7a6a2e'
const BARVA_OSUDOVEHO_POLE = '#c44fb0'
const BARVA_KOLA_STESTI = '#e8b43a'
const BARVA_MINIHROVEHO_POLE = '#1fcab5'

// ==========================================
// Procedurální textury — appka žádný obrázek nenačítá, kreslí si je
// sama na <canvas> při vytvoření scény. Žádný opravdový šumový
// algoritmus (appka na to nemá knihovnu), ale appčino vlastní
// "stovky malých teček/vlnek náhodné odchylky přes jednobarevný
// podklad" stačí na to, aby dlaždice v appčině velikosti (VELIKOST_POLE)
// přestala vypadat jako plochá vektorová barva a začala vypadat jako
// skutečný povrch (kámen/mramor/dřevo). Stejný "appka to umí sama, bez
// knihovny" přístup appka už má jinde (konfety, waveform, admin
// sloupcové grafy) — tady poprvé použitý na texturu, ne na UI prvek.
// ==========================================

const vytvorZrnitouTexturu = (zaklad: string, zrno: string, pocetTecek = 600, rozmer = 128): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = rozmer
  canvas.height = rozmer
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = zaklad
    ctx.fillRect(0, 0, rozmer, rozmer)
    ctx.fillStyle = zrno
    for (let i = 0; i < pocetTecek; i++) {
      const x = Math.random() * rozmer
      const y = Math.random() * rozmer
      const r = Math.random() * 1.6 + 0.3
      ctx.globalAlpha = Math.random() * 0.3 + 0.06
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  return textura
}

/** Dřevitá textura pro rám kolem desky — appka vrství mírně zvlněné
 *  vodorovné pruhy (sinusová odchylka) tmavšího odstínu na základní
 *  barvu. `RepeatWrapping`, ať se jedna textura dá natáhnout kolem
 *  celého obvodu rámu beze švu. */
const vytvorDrevenouTexturu = (zaklad: string, zrno: string, rozmer = 256): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = rozmer
  canvas.height = rozmer
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = zaklad
    ctx.fillRect(0, 0, rozmer, rozmer)
    ctx.strokeStyle = zrno
    ctx.lineWidth = 1.5
    for (let y = 4; y < rozmer; y += 7) {
      ctx.globalAlpha = 0.18 + Math.random() * 0.14
      ctx.beginPath()
      ctx.moveTo(0, y)
      for (let x = 0; x <= rozmer; x += 16) {
        ctx.lineTo(x, y + Math.sin(x * 0.05 + y) * 3)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  textura.wrapS = THREE.RepeatWrapping
  textura.wrapT = THREE.RepeatWrapping
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
    renderer.toneMappingExposure = 1.1
    container.appendChild(renderer.domElement)

    const vsechnyTextury: THREE.Texture[] = []

    const scene = new THREE.Scene()
    const texturaPozadi = vytvorGradientPozadi('#182340', '#05070d')
    vsechnyTextury.push(texturaPozadi)
    scene.background = texturaPozadi
    scene.fog = new THREE.Fog('#0a0f1c', 15, 30)

    const stredX = ((SIRKA_MRIZKY - 1) * VELIKOST_POLE) / 2
    const stredZ = ((VYSKA_MRIZKY - 1) * VELIKOST_POLE) / 2

    const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.set(stredX, 11.5, stredZ + 9.5)
    camera.lookAt(stredX, 0, stredZ)

    // Světla — appka přidává skutečný vrhač stínu (hlavniSvetlo) místo
    // appčina dřívějšího "jen osvítit" směrového světla, a dosvitové
    // studené světlo z opačné strany (bez stínu, appka ho nepotřebuje
    // zdvojovat) pro hloubku ve stínovaných místech. Ambientní složka
    // zůstává, jen o něco jemnější, ať nový vrhač stínu nevybělí celou
    // scénu.
    scene.add(new THREE.AmbientLight('#aab6d6', 0.4))
    const hlavniSvetlo = new THREE.DirectionalLight('#fff3df', 1.45)
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
    // stíny dopadají (receiveShadow), zrnitý jako tmavá žula.
    const texturaStolu = vytvorZrnitouTexturu('#131722', '#1e2434', 500, 160)
    vsechnyTextury.push(texturaStolu)
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
    // dlaždice plovoucí bez okraje nad stolem.
    const texturaRamu = vytvorDrevenouTexturu('#5c3a21', '#331d0f')
    vsechnyTextury.push(texturaRamu)
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

    // Šachovnicová mřížka — appka teď dvě střídající se barvy kreslí
    // jako zrnité PBR materiály (ne ploché MeshStandardMaterial barvy),
    // jedna vlastní (a tedy nezávisle přebarvitelná) zlatá/bronzová
    // metalická textura na každém z 12 obchodních políček (Fáze 1), ať
    // přebarvení jednoho obchodu podle vlastníka nezmění barvu i
    // ostatním polím co sdílejí stejný materiál, jedna sdílená fialová
    // na šesti "Osud" políčkách (Fáze 2), jedna sdílená zlatá (se
    // slabým vlastním leskem) na jediném poli "Kolo štěstí" (Fáze 3) a
    // jedna sdílená tyrkysová na pěti polích "Minihra" (Fáze 6) —
    // tahle poslední dřív appka vůbec nerozlišovala, pole tiše
    // splývalo s obyčejnou šachovnicí.
    const geometriePole = new THREE.BoxGeometry(VELIKOST_POLE - MEZERA, 0.2, VELIKOST_POLE - MEZERA)
    const texturaSvetla = vytvorZrnitouTexturu('#243357', '#3a4f80', 500, 96)
    const texturaTmava = vytvorZrnitouTexturu('#1a2438', '#28344f', 500, 96)
    const texturaObchodu = vytvorZrnitouTexturu('#8a6a2a', '#d9bb60', 420, 96)
    const texturaOsudu = vytvorZrnitouTexturu('#5c1f78', '#9349bd', 360, 96)
    const texturaKola = vytvorZrnitouTexturu('#8a6a1e', '#f3d278', 360, 96)
    const texturaMinihry = vytvorZrnitouTexturu('#0f6e63', '#2fe0c8', 360, 96)
    vsechnyTextury.push(texturaSvetla, texturaTmava, texturaObchodu, texturaOsudu, texturaKola, texturaMinihry)
    const materialSvetly = new THREE.MeshStandardMaterial({ map: texturaSvetla, roughness: 0.55, metalness: 0.06 })
    const materialTmavy = new THREE.MeshStandardMaterial({ map: texturaTmava, roughness: 0.55, metalness: 0.06 })
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
