import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { HraStav, KRALOVSTVI, POCET_POLI, POZICE_TRUNU, TYPY_POLI, TypPole } from '../ctyriKralovstviTypes'

// ==========================================
// Čtyři království — skutečná 3D deska, stejné vlastnictví mimo React
// jako boardgame/scene/useTrhScene.ts hned vedle (a social/scene/
// useAmbientScene.ts, game/explorace/usePlayerWorld.ts, survival/
// scene/useSurvivalScene.ts jinde v appce): hook postaví renderer/
// kameru/smyčku sám a sám se uklidí při odmontování, React dostane jen
// <div ref={containerRef}>.
//
// Rozestavění: appka místo dřívější hadovité (serpentinové) cesty přes
// CSS Grid — pořád v souboru jako 2D záložní vykreslení pro `selhalo`
// (viz CtyriKralovstvi.tsx) — staví SKUTEČNOU čtvercovou desku, stejnou,
// jakou normální deskové hry (Monopoly) používají: 24 polí podél OBVODU
// čtvercové 7×7 mřížky (4*(7-1) = 24 — appka nemá o jedno pole víc ani
// míň, přesně sedí na POCET_POLI beze zbytku), trůn jako hrad uprostřed,
// kam se hráč po dosažení POZICE_TRUNU přesune z posledního pole cesty.
//
// GRAFIKA — druhé kolo, appka nahradila appčinu dřívější čistě
// primitivní verzi (kužel+válec stromy, poskládaný hrad z válců)
// skutečnými ILUSTROVANÝMI billboardy: appka se uživatele nejdřív ptala
// přes AskUserQuestion, jaký vizuální styl chce (appka zkusila i jiný
// zdroj 3D modelů — KhronosGroup/glTF-Sample-Models — ten se ukázal být
// jen generická sada testovacích modelů bez fantasy obsahu, appka to
// uživateli poctivě nahlásila, ne že by si vymyslela náhradu), a
// uživatel po dvou kolech upřesňování zvolil přesně "Ilustrovaný hrad +
// stromy (zimní)" — appka stáhla dva Kenney CC0 assety přes appčin už
// dřív zavedený `shorepine/kenney` GitHub mirror (appka nemá nástroj na
// generování 3D modelů a kenney.nl/itch.io/Poly Haven/Quaternius/
// OpenGameArt appčin sandboxní proxy přímo blokuje) — `castleSmall.png`
// (Background Elements Remastered) a `treePineFrozen.png` (appčin
// vlastní zasněžený smrk, ne appčina obyčejná zelená verze) — a uložila
// je do public/deskova-hra/ jako hrad-zima.png/strom-zima.png (appka
// schválně nesahá po appčiných existujících hrad-{barva}.png, ty patří
// per-království ikonám na výběru sedadla, ne appčině 3D scéně).
//
// Billboard = jedna THREE.PlaneGeometry s texturou, natočená ke kameře
// — appka natočení (billboardKvaternion) POČÍTÁ JEN JEDNOU, ne každý
// snímek jako appčin Survival Night vedle (useSurvivalScene.ts) — appka
// ho tam musí přepočítávat pořád dokola, protože appčina kamera v první
// osobě se tam skutečně hýbe/otáčí s hráčem. Appčina kamera TADY je
// jednou nastavená a pak se po celou dobu scény vůbec nehýbe (appka jí
// nemění pozici ani natočení nikde jinde než v jednorázovém setupu),
// takže billboardKvaternion.copy(camera.quaternion) appce stačí spočítat
// jednou hned po vytvoření kamery — o nic víc appka nešetří, jen appka
// nedělá zbytečnou práci pro kameru, co se nikdy nezmění.
//
// Appka navíc přebarvila celou paletu z dřívější temně fialové
// soumrakové noci na zimní bílo-modrou dennní oblohu/mlhu a světlejší
// "zasněžené" barvy podlahy/nádvoří — appka to udělala schválně
// v jednom kroku s billboardy, ne jako druhý dodatečný průchod, ať
// appka nemusí verzi s primitivama + zimní paletou nikdy vykreslit ani
// jednou (nikdo by ji stejně nikdy neviděl).
// ==========================================

const ROZMER_MRIZKY = 7
const VELIKOST_POLE = 1.5
const MEZERA = 0.08
const STRED = ((ROZMER_MRIZKY - 1) * VELIKOST_POLE) / 2

// Skutečný poměr stran appčiných dvou ilustrovaných Kenney assetů
// (public/deskova-hra/hrad-zima.png 216×170 px, strom-zima.png
// 212×514 px) — appka drží šířku PlaneGeometry přesně podle výšky *
// tenhle poměr, ať billboard nevyjde zploštělý ani protáhlý oproti
// originální ilustraci.
const POMER_STRAN_HRADU = 216 / 170
const POMER_STRAN_STROMU = 212 / 514

interface Souradnice {
  x: number
  z: number
}

/** Pořadí hraničních buněk čtvercové N×N mřížky po směru hodinových
 *  ručiček od levého horního rohu — appka je používá jako 24 polí
 *  cesty. Appka to nepočítá náhodně, HRANICE má vždycky přesně
 *  4*(n-1) prvků, index i odpovídá poli s číslem i+1. */
const hraniceMrizky = (n: number): Souradnice[] => {
  const bunky: Souradnice[] = []
  for (let x = 0; x < n; x++) bunky.push({ x, z: 0 })
  for (let z = 1; z < n; z++) bunky.push({ x: n - 1, z })
  for (let x = n - 2; x >= 0; x--) bunky.push({ x, z: n - 1 })
  for (let z = n - 2; z >= 1; z--) bunky.push({ x: 0, z })
  return bunky
}
const HRANICE = hraniceMrizky(ROZMER_MRIZKY)

/** Startovní stojiště mimo desku (pozice 0, "hráč se ještě nevydal na
 *  cestu") — appka ho posadí diagonálně za roh prvního pole, ať je
 *  jasně vidět "ještě nezačal", ne že by ho appka schovala v dlaždici. */
const START_MIMO_DESKU: Souradnice = { x: -1, z: -1 }

const svetovaPozice = (hrac: { pozice: number }): Souradnice => {
  if (hrac.pozice === 0) return START_MIMO_DESKU
  if (hrac.pozice >= POZICE_TRUNU) return { x: STRED / VELIKOST_POLE, z: STRED / VELIKOST_POLE }
  return HRANICE[hrac.pozice - 1]
}

interface UseCtyriKralovstviSceneOptions {
  stav: HraStav
}

interface UseCtyriKralovstviSceneResult {
  containerRef: React.RefObject<HTMLDivElement>
  selhalo: boolean
}

export const useCtyriKralovstviScene = ({ stav }: UseCtyriKralovstviSceneOptions): UseCtyriKralovstviSceneResult => {
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
    // Zimní bílo-modrá denní obloha/mlha — appčina druhá grafická
    // revize nahrazuje dřívější temně fialovou soumrakovou noc podle
    // uživatelovy výslovné volby ("Ilustrovaný hrad + stromy (zimní)").
    scene.background = new THREE.Color('#cfe3f2')
    scene.fog = new THREE.Fog('#cfe3f2', 14, 32)

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.set(STRED, 9.5, STRED + 8)
    camera.lookAt(STRED, 0, STRED)

    // Kamera se odsud dál po celou dobu scény vůbec nehýbe (appka jí
    // nemění pozici ani natočení nikde jinde než tady) — billboardové
    // natočení proto appka počítá jednou, hned teď, ne per snímek jako
    // appčin Survival Night vedle (viz komentář v hlavičce souboru).
    const billboardKvaternion = new THREE.Quaternion().copy(camera.quaternion)

    // Světla — appka zesvětluje ambientní složku (zasněžená scéna za
    // dne, ne appčina dřívější noc) a mění směrové "měsíční" světlo na
    // studenější denní; teplá zář od hradních oken zůstává (appka ji jen
    // posouvá níž, ke skutečné výšce nové ploché hradní ilustrace, ne
    // appčiny dřívější poskládané věže) — rozsvícená okna navečer
    // uprostřed sněhu je fantasy detail sám o sobě, ne jen zbytek
    // dřívější noční verze.
    scene.add(new THREE.AmbientLight(0xffffff, 0.85))
    const denniSvetlo = new THREE.DirectionalLight('#eaf2ff', 0.9)
    denniSvetlo.position.set(-6, 12, 4)
    scene.add(denniSvetlo)
    const svetloHradu = new THREE.PointLight('#ffb347', 1.1, 8)
    svetloHradu.position.set(STRED, 1.3, STRED)
    scene.add(svetloHradu)

    const dispose: Array<() => void> = []
    const zapamatujSiKUklizeni = <T extends THREE.BufferGeometry | THREE.Material>(vec: T): T => {
      dispose.push(() => vec.dispose())
      return vec
    }

    // Appka navíc sbírá VŠECHNY načtené textury zvlášť (stejný důvod
    // jako appčin Survival Night vedle) — material.dispose() texturu,
    // kterou drží, sám NEuvolní.
    const vsechnyTextury: THREE.Texture[] = []
    const nacitac = new THREE.TextureLoader()
    const nactiTexturu = (url: string) => {
      const t = nacitac.load(url)
      t.colorSpace = THREE.SRGBColorSpace
      vsechnyTextury.push(t)
      return t
    }

    // Vnější "zasněžená krajina" pod celou scénou a vnitřní zamrzlé
    // kamenné nádvoří pod celou 7×7 mřížkou (obojí i pod hradem
    // uprostřed) — appka tím pořád odliší "hrazené království" od
    // okolní krajiny jedním pohledem, jen ve světlejší zimní paletě
    // místo appčina dřívějšího tmavého lesa/hlíny.
    const geoLes = zapamatujSiKUklizeni(new THREE.PlaneGeometry(40, 40))
    const matLes = zapamatujSiKUklizeni(new THREE.MeshStandardMaterial({ color: '#e7f0fa' }))
    const les = new THREE.Mesh(geoLes, matLes)
    les.rotation.x = -Math.PI / 2
    les.position.set(STRED, -0.3, STRED)
    scene.add(les)

    const geoNadvori = zapamatujSiKUklizeni(new THREE.PlaneGeometry(ROZMER_MRIZKY * VELIKOST_POLE, ROZMER_MRIZKY * VELIKOST_POLE))
    const matNadvori = zapamatujSiKUklizeni(new THREE.MeshStandardMaterial({ color: '#b9c7d6' }))
    const nadvori = new THREE.Mesh(geoNadvori, matNadvori)
    nadvori.rotation.x = -Math.PI / 2
    nadvori.position.set(STRED, -0.06, STRED)
    scene.add(nadvori)

    // Stromy kolem hradeb — skutečné ilustrované billboardy (appčin
    // zasněžený Kenney smrk), ne appčiny dřívější kužel+válec primitiva.
    // Jedna geometrie/materiál pro všech dvanáct, appka jen mění pozici
    // per strom (appka nepotřebuje jiný les při každém otevření, pozice
    // jsou pevně dané stejně jako dřív).
    const vyskaStromu = 1.3
    const geoStrom = zapamatujSiKUklizeni(new THREE.PlaneGeometry(vyskaStromu * POMER_STRAN_STROMU, vyskaStromu))
    const matStrom = zapamatujSiKUklizeni(
      new THREE.MeshBasicMaterial({
        map: nactiTexturu('/deskova-hra/strom-zima.png'),
        transparent: false,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      })
    )
    const stromovePozice: Souradnice[] = [
      { x: -1.7, z: -1.7 }, { x: -2.3, z: 2.2 }, { x: -1.9, z: 5.8 }, { x: -1.6, z: 8.4 },
      { x: 8.6, z: -1.9 }, { x: 9.1, z: 2.6 }, { x: 8.7, z: 5.9 }, { x: 8.9, z: 8.9 },
      { x: 2.2, z: -2.3 }, { x: 5.4, z: -2.1 }, { x: 2.0, z: 9.0 }, { x: 5.6, z: 9.3 },
    ]
    for (const p of stromovePozice) {
      const strom = new THREE.Mesh(geoStrom, matStrom)
      strom.position.set(p.x, vyskaStromu / 2, p.z)
      strom.quaternion.copy(billboardKvaternion)
      scene.add(strom)
    }

    // Hrad uprostřed — appčina vizuální náhrada za trůn je teď skutečná
    // ilustrovaná billboardová budova (appčin Kenney "castleSmall"), ne
    // appčina dřívější poskládaná stavba ze čtyř rohových věží + jedné
    // centrální (válec + kužel) — appka schválně nepřidává žádnou
    // samostatnou 3D vlaječku navrch, appčina plochá ilustrace už sama
    // o sobě jasně čte jako hrad a přilepená primitivní vlaječka by na
    // plochém obrázku vypadala jako zapomenutý zbytek staré verze, ne
    // jako záměrná dekorace.
    const vyskaHradu = 2.1
    const geoHrad = zapamatujSiKUklizeni(new THREE.PlaneGeometry(vyskaHradu * POMER_STRAN_HRADU, vyskaHradu))
    const matHrad = zapamatujSiKUklizeni(
      new THREE.MeshBasicMaterial({
        map: nactiTexturu('/deskova-hra/hrad-zima.png'),
        transparent: false,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      })
    )
    const hrad = new THREE.Mesh(geoHrad, matHrad)
    hrad.position.set(STRED, vyskaHradu / 2, STRED)
    hrad.quaternion.copy(billboardKvaternion)
    scene.add(hrad)

    // Políčka cesty po obvodu — appka jim navrch podle typu přidá malý
    // "topper": mince (zlato), drahokam (drahokam) nebo mystickou kouli
    // (osud), stejná geometrie pro všechna pole daného typu. Appka
    // nechává appčiny zlatou/tyrkysovou/fialovou barvu topperů beze
    // změny (jasná fantasy ikonografie funguje stejně dobře v zimní
    // scéně), jen appka posunula podkladovou dlažbu do chladnější,
    // zamrzlé šedo-modré palety místo appčina dřívějšího teplého
    // hnědavého kamene.
    const geoDlazba = zapamatujSiKUklizeni(new THREE.BoxGeometry(VELIKOST_POLE - MEZERA, 0.16, VELIKOST_POLE - MEZERA))
    const matDlazbaSvetla = zapamatujSiKUklizeni(new THREE.MeshStandardMaterial({ color: '#dbe4ed' }))
    const matDlazbaTmava = zapamatujSiKUklizeni(new THREE.MeshStandardMaterial({ color: '#aebac7' }))

    const geoMince = zapamatujSiKUklizeni(new THREE.CylinderGeometry(0.22, 0.24, 0.12, 12))
    const matMince = zapamatujSiKUklizeni(new THREE.MeshStandardMaterial({ color: '#f2c14e', emissive: '#5b3d00', emissiveIntensity: 0.4 }))
    const geoDrahokam = zapamatujSiKUklizeni(new THREE.OctahedronGeometry(0.24))
    const matDrahokam = zapamatujSiKUklizeni(new THREE.MeshStandardMaterial({ color: '#38e8ff', emissive: '#0e5f6e', emissiveIntensity: 0.5 }))
    const geoOsud = zapamatujSiKUklizeni(new THREE.IcosahedronGeometry(0.22, 0))
    const matOsud = zapamatujSiKUklizeni(new THREE.MeshStandardMaterial({ color: '#b76bff', emissive: '#4d1a80', emissiveIntensity: 0.5 }))

    const tociciSeToppery: THREE.Object3D[] = []
    for (let i = 0; i < POCET_POLI; i++) {
      const typ: TypPole = TYPY_POLI[i]
      const bod = HRANICE[i]
      const worldX = bod.x * VELIKOST_POLE
      const worldZ = bod.z * VELIKOST_POLE
      const dlazba = new THREE.Mesh(geoDlazba, (bod.x + bod.z) % 2 === 0 ? matDlazbaSvetla : matDlazbaTmava)
      dlazba.position.set(worldX, 0, worldZ)
      scene.add(dlazba)

      if (typ === 'zlato') {
        const topper = new THREE.Mesh(geoMince, matMince)
        topper.position.set(worldX, 0.24, worldZ)
        scene.add(topper)
      } else if (typ === 'drahokam') {
        const topper = new THREE.Mesh(geoDrahokam, matDrahokam)
        topper.position.set(worldX, 0.34, worldZ)
        scene.add(topper)
        tociciSeToppery.push(topper)
      } else if (typ === 'osud') {
        const topper = new THREE.Mesh(geoOsud, matOsud)
        topper.position.set(worldX, 0.34, worldZ)
        scene.add(topper)
        tociciSeToppery.push(topper)
      }
    }

    // Jeden token na hráče, barva podle království — appka je nechává
    // plynule dotáhnout k aktuální pozici stejnou `lerp` smyčkou jako
    // Buddyho Trh vedle ní, jen se zdrojovými souřadnicemi z
    // svetovaPozice() místo přímo z hrac.pozice.
    const geoToken = zapamatujSiKUklizeni(new THREE.CapsuleGeometry(0.22, 0.34, 4, 8))
    const tokeny = new Map<string, THREE.Object3D>()
    for (const hrac of stavRef.current.hraci) {
      const kralovstvi = KRALOVSTVI.find((k) => k.id === hrac.kralovstviId)
      const material = zapamatujSiKUklizeni(new THREE.MeshStandardMaterial({ color: kralovstvi?.barva ?? '#94a3b8' }))
      const token = new THREE.Mesh(geoToken, material)
      const pozice = svetovaPozice(hrac)
      token.position.set(pozice.x * VELIKOST_POLE, 0.42, pozice.z * VELIKOST_POLE)
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
        const pozice = svetovaPozice(hrac)
        cilovaPozice.set(pozice.x * VELIKOST_POLE, 0.42, pozice.z * VELIKOST_POLE)
        token.position.lerp(cilovaPozice, 0.15)
      }
      for (const topper of tociciSeToppery) topper.rotation.y += 0.015
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
      for (const uklid of dispose) uklid()
      for (const t of vsechnyTextury) t.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement)
    }
    // Efekt se schválně spouští jen jednou za mount — aktuální stav se
    // čte přes stavRef, ne přes tuhle závislost (stejný důvod jako
    // useTrhScene.ts hned vedle).
  }, [])

  return { containerRef, selhalo }
}
