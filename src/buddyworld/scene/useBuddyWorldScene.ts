import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { BuddyWorldHracStav, MaskotDef, NepritelDef, NepritelRuntimeStav, Pozice2D } from '../types'
import {
  jePripravenUtok,
  krokAI,
  melByRespawnovat,
  omezNaOblast,
  pokusUtokHrace,
  pokusUtokNepritele,
  vytvorNepritelRuntime,
  vzdalenost2D,
} from '../combat/engine'
import { jeMrtvyHrac, plneUzdravit, pripocistXp, utrzetPoskozeni } from '../leveling'

// ==========================================
// Buddy World — 3D svět, čistý Threejs mimo React (stejná zásada
// vlastnictví jako appčiny další herní scény — social/scene/
// useAmbientScene.ts, game/explorace/usePlayerWorld.ts, fighting/
// arena/useSoubojScene.ts, survival/scene/useSurvivalScene.ts): hook
// si sám postaví renderer/scénu/kameru, uklidí ji při odchodu, React
// dostane jen canvas (containerRef) a pár imperativních metod.
//
// Appka zvolila TŘETÍ OSOBU, ne první osobu z Buddyheimova
// usePlayerWorld.ts/Survival Nightu — zadání výslovně žádá "kamera
// sledující hráče" (kamera a hráč jsou dvě různé věci) a "správné
// natočení postavy při pohybu" (aby mělo smysl postavu natáčet,
// appka ji musí vidět). Hráčova postava je proto primitivní "meeple"
// (kapsle + koule, stejná technika jako boardgame/scene/
// useCtyriKralovstviScene.ts's figurky) — appka nemá hotový model,
// snadno nahraditelný, až Buddyheimův ArtPack dorazí (viz
// data/assets.ts).
//
// appka ovládá kameru tažením (appčiny Pointer Events — funguje
// stejně pro myš i dotyk) a pohyb virtuálním joystickem
// (VirtualniJoystick.tsx, mimo tenhle DOM strom — dotyk na joysticku
// proto appku nikdy nespustí i otočení kamerou) nebo klávesnicí
// (WASD/šipky, jen desktop). Pohyb je appkou relativní ke KAMEŘE, ne
// ke světu — appka pushne joystick "dopředu" a postava appku jde
// pryč od kamery, appčina klasická third-person konvence.
// ==========================================

const RYCHLOST_POHYBU = 4.6 // herní jednotky za sekundu
const CITLIVOST_OTOCENI = 0.0036
const PITCH_MIN = 0.12
const PITCH_MAX = 1.1
export const POLOMER_SVETA = 24

const KAMERA_VZDALENOST = 6
const KAMERA_CIL_VYSKA = 1.25

const RYCHLOST_NATOCENI_HRACE = 9 // appka natáčí postavu rychle, ne okamžitě (ať appku nevypadá robotické "cuknutí")

const BUDDY_ODSTUP_ZA = 1.9
const BUDDY_ODSTUP_STRANOU = 1.1
const BUDDY_ZAKLADNI_VYSKA = 1.3
const BUDDY_AMPLITUDA = 0.14

interface UseBuddyWorldSceneOptions {
  maskot: MaskotDef
  nepritelDef: NepritelDef
  pocatecniHracStav: BuddyWorldHracStav
  /** Zavolá se přesně jednou za každé poražení nepřítele — appka tím
   *  nechá appku (BuddyWorldModule.tsx) rozhodnout o recordAction()/
   *  uložení postupu, tahle scéna appčin store vůbec appku nezná. */
  onZabitiNepritele: (xpOdmena: number) => void
}

export interface BuddyWorldHud {
  hrac: BuddyWorldHracStav
  xpProDalsiUroven: number
  nepritelHp: number
  nepritelMaxHp: number
  nepritelFaze: NepritelRuntimeStav['faze']
  utokPripraven: boolean
  mrtvyHrac: boolean
}

interface UseBuddyWorldSceneResult {
  containerRef: React.RefObject<HTMLDivElement>
  selhalo: boolean
  nastavJoystick: (x: number, z: number) => void
  utocit: () => void
  obnovitPoSmrti: () => void
  hud: BuddyWorldHud
}

const bodVArene = (minVzdalenostOdStredu: number): Pozice2D => {
  const uhel = Math.random() * Math.PI * 2
  const polomer = minVzdalenostOdStredu + Math.random() * (POLOMER_SVETA * 0.6 - minVzdalenostOdStredu)
  return { x: Math.cos(uhel) * polomer, z: Math.sin(uhel) * polomer }
}

export const useBuddyWorldScene = ({
  maskot,
  nepritelDef,
  pocatecniHracStav,
  onZabitiNepritele,
}: UseBuddyWorldSceneOptions): UseBuddyWorldSceneResult => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selhalo, setSelhalo] = useState(false)
  const joystickRef = useRef({ x: 0, z: 0 })

  const hracStavRef = useRef<BuddyWorldHracStav>(pocatecniHracStav)
  const nepritelRuntimeRef = useRef<NepritelRuntimeStav>(
    vytvorNepritelRuntime(nepritelDef.id, nepritelDef.maxHp, bodVArene(6))
  )
  const posledniUtokHraceRef = useRef(-Infinity)
  const utocitPozadavekRef = useRef(false)
  const obnovitPozadavekRef = useRef(false)

  const [hud, setHud] = useState<BuddyWorldHud>({
    hrac: pocatecniHracStav,
    xpProDalsiUroven: 25,
    nepritelHp: nepritelRuntimeRef.current.hp,
    nepritelMaxHp: nepritelDef.maxHp,
    nepritelFaze: nepritelRuntimeRef.current.faze,
    utokPripraven: false,
    mrtvyHrac: false,
  })

  const nastavJoystick = (x: number, z: number) => {
    joystickRef.current.x = x
    joystickRef.current.z = z
  }

  /** Jen naznačí požadavek na útok — skutečné, jediné vyhodnocení
   *  (dosah + cooldown, viz combat/engine.ts's pokusUtokHrace) proběhne
   *  uvnitř herní smyčky níž, na stejném čase (performance.now()),
   *  který engine používá i pro cooldown nepřítele. Appka tím má jen
   *  jeden zdroj pravdy o čase, ne dva nesouhlasící hodiny. */
  const utocit = () => {
    utocitPozadavekRef.current = true
  }

  const obnovitPoSmrti = () => {
    obnovitPozadavekRef.current = true
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
    scene.background = new THREE.Color('#1c2a1a')
    scene.fog = new THREE.Fog('#243424', POLOMER_SVETA * 0.6, POLOMER_SVETA * 1.9)

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const slunce = new THREE.DirectionalLight(0xffe3b8, 1.05)
    slunce.position.set(8, 16, 6)
    scene.add(slunce)

    // --- zem ---
    const zem = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: '#3c5c34', roughness: 1 })
    )
    zem.rotation.x = -Math.PI / 2
    scene.add(zem)

    // --- dekorace (stromy/kameny), rozeseté mimo appčin střed ---
    const dekorace = new THREE.Group()
    scene.add(dekorace)
    const volnaZonaKolem = (x: number, z: number, min: number) => Math.hypot(x, z) < min
    for (let i = 0; i < 26; i++) {
      let x = 0
      let z = 0
      let pokus = 0
      do {
        const uhel = Math.random() * Math.PI * 2
        const polomer = Math.sqrt(Math.random()) * POLOMER_SVETA * 0.95
        x = Math.cos(uhel) * polomer
        z = Math.sin(uhel) * polomer
        pokus++
      } while (pokus < 12 && volnaZonaKolem(x, z, 3.5))

      const skupina = new THREE.Group()
      if (Math.random() > 0.35) {
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

    // --- hráčova postava — primitivní "meeple" (kapsle + koule),
    // snadno nahraditelná skutečným modelem, viz data/assets.ts ---
    const hrac = new THREE.Group()
    const hracTelo = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.32, 0.7, 4, 10),
      new THREE.MeshStandardMaterial({ color: '#4a7fb5', roughness: 0.75 })
    )
    hracTelo.position.y = 0.75
    const hracHlava = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 16, 16),
      new THREE.MeshStandardMaterial({ color: '#f0c9a0', roughness: 0.8 })
    )
    hracHlava.position.y = 1.42
    hrac.add(hracTelo, hracHlava)
    scene.add(hrac)

    // --- Buddy — maskotní společník, "jádro + záře", stejný vizuální
    // jazyk jako social/scene/useAmbientScene.ts ---
    const buddy = new THREE.Group()
    const buddyJadroMaterial = new THREE.MeshStandardMaterial({
      color: maskot.barvaJadro,
      emissive: maskot.barvaJadro,
      emissiveIntensity: 0.9,
    })
    const buddyJadro = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 20), buddyJadroMaterial)
    const buddyZar = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 16, 16),
      new THREE.MeshBasicMaterial({ color: maskot.barvaZar, transparent: true, opacity: 0.28 })
    )
    buddy.add(buddyZar, buddyJadro)
    buddy.add(new THREE.PointLight(maskot.barvaZar, 1.1, 6))
    scene.add(buddy)

    // --- nepřítel — tmavá, pulzující silueta s "halo" prstencem ---
    const nepritelniSkupina = new THREE.Group()
    const nepritelTeloMaterial = new THREE.MeshStandardMaterial({
      color: '#2d1f3f',
      emissive: '#8b5cf6',
      emissiveIntensity: 0.5,
      roughness: 0.6,
    })
    const nepritelTelo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), nepritelTeloMaterial)
    nepritelTelo.position.y = 0.8
    const nepritelHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.04, 8, 32),
      new THREE.MeshBasicMaterial({ color: '#8b5cf6', transparent: true, opacity: 0.5 })
    )
    nepritelHalo.position.y = 0.05
    nepritelHalo.rotation.x = Math.PI / 2
    nepritelniSkupina.add(nepritelTelo, nepritelHalo)
    nepritelniSkupina.add(new THREE.PointLight('#8b5cf6', 1.2, 7))
    scene.add(nepritelniSkupina)

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
    // něm sem nikdy nedorazí (viz VirtualniJoystick.tsx's komentář) ---
    let otacecíPointerId: number | null = null
    let poslX = 0
    let poslY = 0
    let yaw = 0
    let pitch = 0.5

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
      pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, pitch + dy * CITLIVOST_OTOCENI))
    }
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === otacecíPointerId) otacecíPointerId = null
    }
    container.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    // --- klávesnice (jen desktop) ---
    const klavesy = new Set<string>()
    const onKeyDown = (e: KeyboardEvent) => klavesy.add(e.key.toLowerCase())
    const onKeyUp = (e: KeyboardEvent) => klavesy.delete(e.key.toLowerCase())
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // --- appka pozastaví appčinu smyčku, když je appka (tab) skrytá,
    // a znovu ji spustí při návratu — appčin výkonový požadavek na
    // mobilu appka nechce zbytečně kreslit scénu na pozadí ---
    let bezi = true
    let smycka = 0
    const onVisibility = () => {
      if (document.hidden) {
        bezi = false
      } else if (!bezi) {
        bezi = true
        posledniCas = performance.now()
        smycka = requestAnimationFrame(krok)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    let posledniCas = performance.now()
    let hracPozice: Pozice2D = { x: 0, z: -4 }
    let hracNatoceni = 0
    let nepritelHitDoMs = -Infinity
    let vitezstviDoMs = -Infinity
    let posledniHudHp = hracStavRef.current.hp
    let posledniHudNepritelHp = nepritelRuntimeRef.current.hp
    let posledniHudFaze: NepritelRuntimeStav['faze'] = nepritelRuntimeRef.current.faze
    let posledniHudUtokPripraven = false

    const krok = (ted: number) => {
      if (!bezi) return
      smycka = requestAnimationFrame(krok)

      const dt = Math.min((ted - posledniCas) / 1000, 0.1)
      posledniCas = ted
      const casMs = ted

      if (!jeMrtvyHrac(hracStavRef.current)) {
        const dopredny = { x: Math.sin(yaw), z: Math.cos(yaw) }
        const pravy = { x: dopredny.z, z: -dopredny.x }

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
          hracPozice = omezNaOblast({ x: hracPozice.x + posunX, z: hracPozice.z + posunZ }, POLOMER_SVETA)

          // Natáčení postavy směrem pohybu, lerp po nejkratší úhlové
          // dráze (ne naslepo napřímo), ať se postava nikdy neotočí
          // "přes záda" opačným směrem.
          const cilNatoceni = Math.atan2(posunX, posunZ)
          let rozdil = cilNatoceni - hracNatoceni
          while (rozdil > Math.PI) rozdil -= Math.PI * 2
          while (rozdil < -Math.PI) rozdil += Math.PI * 2
          hracNatoceni += rozdil * Math.min(1, RYCHLOST_NATOCENI_HRACE * dt)
        }

        hrac.position.set(hracPozice.x, 0, hracPozice.z)
        hrac.rotation.y = hracNatoceni

        // Appčina kamera obíhá kolem hráče po appčině kruhové dráze
        // (sférické souřadnice z yaw/pitch) a vždy se dívá na pevný
        // bod nad jeho hlavou — appčin klasický třetí-osoba "orbit cam".
        camera.position.x = hracPozice.x - Math.sin(yaw) * Math.cos(pitch) * KAMERA_VZDALENOST
        camera.position.z = hracPozice.z - Math.cos(yaw) * Math.cos(pitch) * KAMERA_VZDALENOST
        camera.position.y = KAMERA_CIL_VYSKA + Math.sin(pitch) * KAMERA_VZDALENOST
        camera.lookAt(hracPozice.x, KAMERA_CIL_VYSKA, hracPozice.z)

        // --- appčin krok AI nepřítele ---
        nepritelRuntimeRef.current = krokAI(nepritelRuntimeRef.current, nepritelDef, hracPozice, dt)

        // --- appka zkusí útok nepřítele na hráče ---
        const utokNepritele = pokusUtokNepritele(nepritelRuntimeRef.current, nepritelDef, casMs)
        nepritelRuntimeRef.current = utokNepritele.nepritel
        if (utokNepritele.provedeno) {
          hracStavRef.current = utrzetPoskozeni(hracStavRef.current, utokNepritele.poskozeni)
        }

        // --- appka zkusí útok hráče na nepřítele, jen pokud o to
        // appku požádala appčina utocit() ---
        if (utocitPozadavekRef.current) {
          utocitPozadavekRef.current = false
          const vzdKNepriteli = vzdalenost2D(hracPozice, nepritelRuntimeRef.current.pozice)
          const utokHrace = pokusUtokHrace(
            nepritelRuntimeRef.current,
            vzdKNepriteli,
            posledniUtokHraceRef.current,
            casMs
          )
          if (utokHrace.provedeno) {
            posledniUtokHraceRef.current = casMs
            nepritelRuntimeRef.current = utokHrace.nepritel
            nepritelHitDoMs = casMs + 220
            if (utokHrace.porazen) {
              vitezstviDoMs = casMs + 1400
              hracStavRef.current = pripocistXp(hracStavRef.current, nepritelDef.odmenaXp)
              onZabitiNepritele(nepritelDef.odmenaXp)
            }
          }
        }

        // --- appka respawnuje poraženého nepřítele, až uplyne jeho
        // respawnOdMs (viz combat/engine.ts's melByRespawnovat) ---
        if (melByRespawnovat(nepritelRuntimeRef.current, casMs)) {
          nepritelRuntimeRef.current = vytvorNepritelRuntime(nepritelDef.id, nepritelDef.maxHp, bodVArene(6))
        }

        // --- appka vykreslí aktuální pozici/fázi nepřítele ---
        nepritelniSkupina.position.set(nepritelRuntimeRef.current.pozice.x, 0, nepritelRuntimeRef.current.pozice.z)
        const vBoji = nepritelRuntimeRef.current.faze !== 'klid' && nepritelRuntimeRef.current.faze !== 'mrtvy'
        nepritelniSkupina.visible = nepritelRuntimeRef.current.faze !== 'mrtvy'
        if (!klidnyRezim) {
          const pulz = 1 + Math.sin(casMs * 0.0026) * (vBoji ? 0.1 : 0.05)
          nepritelTelo.scale.setScalar(casMs < nepritelHitDoMs ? 1.35 : pulz)
          nepritelTeloMaterial.emissiveIntensity = casMs < nepritelHitDoMs ? 1.4 : 0.5
          nepritelniSkupina.rotation.y = casMs * 0.0004
          nepritelHalo.rotation.z = casMs * 0.0005
        }

        // --- Buddy plave kousek za a vpravo od hráče, appka mu k
        // tomu dá krátkou "vítěznou" reakci po poražení nepřítele a
        // mírnou "bojovou" reakci, dokud je souboj v chodu ---
        const buddyForward = { x: Math.sin(hracNatoceni), z: Math.cos(hracNatoceni) }
        const buddyRight = { x: buddyForward.z, z: -buddyForward.x }
        const cilBuddyX = hracPozice.x - buddyForward.x * BUDDY_ODSTUP_ZA + buddyRight.x * BUDDY_ODSTUP_STRANOU
        const cilBuddyZ = hracPozice.z - buddyForward.z * BUDDY_ODSTUP_ZA + buddyRight.z * BUDDY_ODSTUP_STRANOU
        const lerpK = Math.min(1, 4.2 * dt)
        buddy.position.x += (cilBuddyX - buddy.position.x) * lerpK
        buddy.position.z += (cilBuddyZ - buddy.position.z) * lerpK

        if (klidnyRezim) {
          buddy.position.y = BUDDY_ZAKLADNI_VYSKA
        } else if (casMs < vitezstviDoMs) {
          buddy.position.y = BUDDY_ZAKLADNI_VYSKA + Math.abs(Math.sin(casMs * 0.012)) * (BUDDY_AMPLITUDA * 2.6)
          buddy.rotation.y = casMs * 0.012
          buddyJadroMaterial.emissiveIntensity = 1.6
        } else {
          buddy.position.y = BUDDY_ZAKLADNI_VYSKA + Math.sin(casMs * 0.0021) * BUDDY_AMPLITUDA
          buddy.rotation.y = casMs * 0.0006
          buddyJadroMaterial.emissiveIntensity = vBoji ? 1.2 : 0.9
        }
      }

      // --- obnova po smrti, jen pokud o ni appku požádala appčina
      // obnovitPoSmrti() a hráč je doopravdy mrtvý ---
      const mrtvy = jeMrtvyHrac(hracStavRef.current)
      if (obnovitPozadavekRef.current && mrtvy) {
        obnovitPozadavekRef.current = false
        hracStavRef.current = plneUzdravit(hracStavRef.current)
        hracPozice = { x: 0, z: -4 }
        nepritelRuntimeRef.current = vytvorNepritelRuntime(nepritelDef.id, nepritelDef.maxHp, bodVArene(6))
      }

      const utokPripravenNyni = jePripravenUtok(
        nepritelRuntimeRef.current,
        vzdalenost2D(hracPozice, nepritelRuntimeRef.current.pozice),
        posledniUtokHraceRef.current,
        casMs
      )

      // appka zavolá setState jen, když se HUD doopravdy skutečně
      // změnil — appka tím zabrání zbytečnému React re-renderu 60×
      // za sekundu, HUD se překreslí jen na skutečnou událost (útok,
      // poškození, změna fáze nepřítele).
      if (
        hracStavRef.current.hp !== posledniHudHp ||
        nepritelRuntimeRef.current.hp !== posledniHudNepritelHp ||
        nepritelRuntimeRef.current.faze !== posledniHudFaze ||
        utokPripravenNyni !== posledniHudUtokPripraven ||
        mrtvy !== hud.mrtvyHrac
      ) {
        posledniHudHp = hracStavRef.current.hp
        posledniHudNepritelHp = nepritelRuntimeRef.current.hp
        posledniHudFaze = nepritelRuntimeRef.current.faze
        posledniHudUtokPripraven = utokPripravenNyni
        setHud({
          hrac: { ...hracStavRef.current },
          xpProDalsiUroven: 25 + (hracStavRef.current.level - 1) * 12,
          nepritelHp: nepritelRuntimeRef.current.hp,
          nepritelMaxHp: nepritelDef.maxHp,
          nepritelFaze: nepritelRuntimeRef.current.faze,
          utokPripraven: utokPripravenNyni,
          mrtvyHrac: mrtvy,
        })
      }

      renderer.render(scene, camera)
    }
    smycka = requestAnimationFrame(krok)

    return () => {
      bezi = false
      cancelAnimationFrame(smycka)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
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
  }, [maskot, nepritelDef])

  return { containerRef, selhalo, nastavJoystick, utocit, obnovitPoSmrti, hud }
}
