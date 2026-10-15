import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { BossRuntimeStav, BuddyWorldHracStav, MaskotDef, NepritelDef, NepritelRuntimeStav, Pozice2D } from '../types'
import {
  jePripravenUtok,
  jeObranaAktivni,
  jeObranaPripravena,
  aktivujObranu,
  krokAI,
  melByRespawnovat,
  omezNaOblast,
  pokusUtokHrace,
  pokusUtokNepritele,
  redukujPoskozeniObranou,
  vytvorNepritelRuntime,
  vzdalenost2D,
} from '../combat/engine'
import {
  krokAiBosse,
  melByProbuditBosse,
  obnovBosse,
  pokusUtokOtresemBosse,
  probuditBosse,
  vytvorBossRuntime,
  aplikujZuriNaPoskozeni,
} from '../combat/bossEngine'
import { BossDef } from '../data/bossove'
import { nahodnyNepritel } from '../data/nepratele'
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
//
// DRUHÉ POKRAČOVÁNÍ VÝVOJE (druhý typ nepřítele, boss, obrana) —
// tahle scéna teď pro běžné nepřátele drží POCET_SLOTU_NEPRATEL míst
// v aréně, ne jen jeden; každý slot si při vytvoření scény vybere
// jeden konkrétní typ z data/nepratele.ts's NEPRATELE (přes
// nahodnyNepritel()) a drží ho po celou relaci — appka ho na
// respawnu nenáhodí znovu, ať appka nemusí kvůli jednoduchosti
// stavět nový mesh/materiál pokaždé znovu (appka tím nahodnyNepritel()
// i tak dokazuje "architekturu pro výběr nepřítele", jen bez zbytečné
// komplikace navíc). Boss (combat/bossEngine.ts) má vlastní stav i
// vlastní pozici — stojí trvale na pevném místě (appčin "háj"), appka
// ho nikdy nehoní automaticky, dokud ho hráč nevzbudí "Vyzvat" akcí.
// Dokud je boss aktivní (probuzen, žije), appka BĚŽNÉ nepřátele
// zmrazí a schová — appčina odpověď na "zachovej čitelnost souboje na
// mobilu": na obrazovce appka appku nikdy neukáže víc než jednu HP
// lištu najednou.
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

/** Kolik appka drží samostatných míst pro běžné nepřátele v aréně
 *  najednou — appčino "víc než jeden nepřítel" ze zadání, úmyslně
 *  malé číslo, ať zůstane souboj na mobilu čitelný, i kdyby appka
 *  (vzácně) oba sloty bojovaly zároveň. */
const POCET_SLOTU_NEPRATEL = 2

/** Pevná pozice bossova háje — appčin appka "rozpoznatelný herní
 *  bod", ne nahodilá pozice jako u běžných nepřátel. */
const BOSS_HAJ_POZICE: Pozice2D = { x: 0, z: -(POLOMER_SVETA * 0.78) }

interface UseBuddyWorldSceneOptions {
  maskot: MaskotDef
  bossDef: BossDef
  pocatecniHracStav: BuddyWorldHracStav
  /** Zavolá se přesně jednou za každé poražení běžného nepřítele —
   *  appka tím nechá appku (BuddyWorldModule.tsx) rozhodnout o
   *  recordAction()/uložení postupu, tahle scéna appčin store vůbec
   *  appku nezná. */
  onZabitiNepritele: (xpOdmena: number) => void
  /** Zavolá se přesně jednou za každé poražení bosse — appka ho volá
   *  samostatně od onZabitiNepritele, ať si appka (BuddyWorldModule.tsx)
   *  mohla pro bossí výhru appku vybrat vlastní appčin ActivityKind. */
  onZabitiBosse: (xpOdmena: number) => void
}

/** Zúžený appka "focus" tvar — HUD z něj potřebuje jen číslo appka
 *  HP/maxHp a fázi, ne celý appka runtime appka appky stav. */
interface FocusNepritele {
  def: NepritelDef
  hp: number
  maxHp: number
  faze: NepritelRuntimeStav['faze']
}

interface FocusBosse extends FocusNepritele {
  probuzen: boolean
  zuri: boolean
}

export interface BuddyWorldHud {
  hrac: BuddyWorldHracStav
  xpProDalsiUroven: number
  mrtvyHrac: boolean
  utokPripraven: boolean
  /** Nejbližší živý a "v boji" (honí/útočí) běžný nepřítel — appka ho
   *  vrátí jako null, dokud probíhá souboj s bossem, ať appka na
   *  obrazovce nikdy neukáže víc než jednu HP lištu najednou. */
  nepritelFocus: FocusNepritele | null
  /** Bossův HP/fáze/zuřivost — appka null, dokud hráč bosse
   *  nevzbudí, ať appčina HP lišta zůstane skrytá, dokud souboj
   *  doopravdy nezačal. */
  bossFocus: FocusBosse | null
  /** Smí hráč bosse právě teď vyzvat — appka tím HUD ukáže tlačítko
   *  "Vyzvat" jen v dosahu dormantního bosse. */
  muzeVyzvatBosse: boolean
  obranaAktivni: boolean
  obranaPripravena: boolean
}

interface UseBuddyWorldSceneResult {
  containerRef: React.RefObject<HTMLDivElement>
  selhalo: boolean
  nastavJoystick: (x: number, z: number) => void
  utocit: () => void
  obranit: () => void
  vyzvatBosse: () => void
  obnovitPoSmrti: () => void
  hud: BuddyWorldHud
}

const bodVArene = (minVzdalenostOdStredu: number): Pozice2D => {
  const uhel = Math.random() * Math.PI * 2
  const polomer = minVzdalenostOdStredu + Math.random() * (POLOMER_SVETA * 0.6 - minVzdalenostOdStredu)
  return { x: Math.cos(uhel) * polomer, z: Math.sin(uhel) * polomer }
}

interface NepritelMesh {
  skupina: THREE.Group
  telo: THREE.Mesh
  teloMaterial: THREE.MeshStandardMaterial
  halo: THREE.Mesh
}

/** appka postaví 3D siluetu z vizuálních dat (barvaTela/barvaHalo/
 *  meritko/tvar) — appka tím sdílí JEDNU generickou továrnu pro
 *  běžné nepřátele i bosse, ať žádný nový typ (nebo budoucí boss)
 *  nikdy nepotřebuje nový kus 3D kódu, jen nová data v
 *  data/nepratele.ts/data/bossove.ts. */
const vytvorNepritelMesh = (def: NepritelDef): NepritelMesh => {
  const teloGeometrie =
    def.tvar === 'kapka'
      ? new THREE.SphereGeometry(0.62 * def.meritko, 14, 12)
      : new THREE.IcosahedronGeometry(0.6 * def.meritko, 0)

  const teloMaterial = new THREE.MeshStandardMaterial({
    color: def.barvaTela,
    emissive: def.barvaHalo,
    emissiveIntensity: 0.5,
    roughness: 0.6,
  })
  const telo = new THREE.Mesh(teloGeometrie, teloMaterial)
  telo.position.y = 0.8 * def.meritko
  // "kapka" appka zploští do blobovitého tvaru — dvě appky vedle sebe
  // tak vypadají viditelně jinak, i bez hotového 3D modelu.
  if (def.tvar === 'kapka') telo.scale.y = 0.72

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.85 * def.meritko, 0.04 * def.meritko, 8, 32),
    new THREE.MeshBasicMaterial({ color: def.barvaHalo, transparent: true, opacity: 0.5 })
  )
  halo.position.y = 0.05
  halo.rotation.x = Math.PI / 2

  const skupina = new THREE.Group()
  skupina.add(telo, halo)
  skupina.add(new THREE.PointLight(def.barvaHalo, 1.2, 7 * def.meritko))

  return { skupina, telo, teloMaterial, halo }
}

const uvolniMesh = (skupina: THREE.Group) => {
  skupina.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(material)) material.forEach((m) => m.dispose())
    else material?.dispose()
  })
}

/** Jeden slot pro běžného nepřítele — appka jeho def zvolila nahodile
 *  jen jednou, při vytvoření scény, a drží ho stejný po celou
 *  relaci. */
interface SlotNepritele {
  def: NepritelDef
  runtime: NepritelRuntimeStav
  mesh: NepritelMesh
  /** Čas (ms), do kterého zůstane tělo "zasaženě" zvětšené —
   *  appka ho drží per-slot, ne jako jednu sdílenou proměnnou, ať se
   *  dva sloty navzájem nerušily. */
  hitDoMs: number
}

export const useBuddyWorldScene = ({
  maskot,
  bossDef,
  pocatecniHracStav,
  onZabitiNepritele,
  onZabitiBosse,
}: UseBuddyWorldSceneOptions): UseBuddyWorldSceneResult => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selhalo, setSelhalo] = useState(false)
  const joystickRef = useRef({ x: 0, z: 0 })

  const hracStavRef = useRef<BuddyWorldHracStav>(pocatecniHracStav)
  const bossRef = useRef<BossRuntimeStav>(vytvorBossRuntime(bossDef.id, bossDef.maxHp, BOSS_HAJ_POZICE))
  const posledniUtokHraceRef = useRef(-Infinity)
  const obranaAktivniDoMsRef = useRef(-Infinity)
  const obranaCooldownDoMsRef = useRef(-Infinity)

  const utocitPozadavekRef = useRef(false)
  const obranaPozadavekRef = useRef(false)
  const vyzvatPozadavekRef = useRef(false)
  const obnovitPozadavekRef = useRef(false)

  const vychoziHud: BuddyWorldHud = {
    hrac: pocatecniHracStav,
    xpProDalsiUroven: 25,
    mrtvyHrac: false,
    utokPripraven: false,
    nepritelFocus: null,
    bossFocus: null,
    muzeVyzvatBosse: false,
    obranaAktivni: false,
    obranaPripravena: true,
  }
  const [hud, setHud] = useState<BuddyWorldHud>(vychoziHud)
  const hudRef = useRef<BuddyWorldHud>(vychoziHud)

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

  /** Jen naznačí požadavek na obranu — stejný jednosnímkový "request
   *  flag" jako utocit() výš; skutečnou aktivaci (a její cooldown)
   *  vyhodnotí combat/engine.ts's aktivujObranu uvnitř herní smyčky. */
  const obranit = () => {
    obranaPozadavekRef.current = true
  }

  /** Jen naznačí požadavek na vzbuzení bosse — skutečné ověření
   *  dosahu/dormance (melByProbuditBosse) proběhne uvnitř herní
   *  smyčky stejně jako u utocit(). */
  const vyzvatBosse = () => {
    vyzvatPozadavekRef.current = true
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

    // --- dekorace (stromy/kameny), rozeseté mimo appčin střed a mimo
    // bossův háj, ať appka jeho siluetu nikdy nezacloní ---
    const dekorace = new THREE.Group()
    scene.add(dekorace)
    const volnaZonaKolem = (x: number, z: number, min: number) => Math.hypot(x, z) < min
    const blizkoHaje = (x: number, z: number) => Math.hypot(x - BOSS_HAJ_POZICE.x, z - BOSS_HAJ_POZICE.z) < 4.5
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
      } while (pokus < 12 && (volnaZonaKolem(x, z, 3.5) || blizkoHaje(x, z)))

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

    // --- běžní nepřátelé — appka drží POCET_SLOTU_NEPRATEL slotů,
    // každý s vlastním nahodile zvoleným typem (viz SlotNepritele výš
    // a appčina komentář u POCET_SLOTU_NEPRATEL) ---
    const sloty: SlotNepritele[] = []
    for (let i = 0; i < POCET_SLOTU_NEPRATEL; i++) {
      const def = nahodnyNepritel()
      const runtime = vytvorNepritelRuntime(def.id, def.maxHp, bodVArene(6))
      const mesh = vytvorNepritelMesh(def)
      scene.add(mesh.skupina)
      sloty.push({ def, runtime, mesh, hitDoMs: -Infinity })
    }

    // --- boss — stejná vizuální továrna, ale z BossDef (vyšší
    // meritko ho appka vykreslí viditelně větší). Stojí trvale na
    // BOSS_HAJ_POZICE, dokud ho krokAiBosse poprvé nepohne — ten
    // appka hýbe bossem jen po probuzení. ---
    const bossMesh = vytvorNepritelMesh(bossDef)
    bossMesh.skupina.position.set(BOSS_HAJ_POZICE.x, 0, BOSS_HAJ_POZICE.z)
    scene.add(bossMesh.skupina)

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

    // --- klávesnice (jen desktop). WASD/šipky appka čte, pokud jsou
    // podrženy (polled každý snímek níž); Shift je naopak jen
    // jednorázová akce (!e.repeat hlídá appku, ať OS vlastním
    // klávesovým "repeat" nespamoval obranu). ---
    const klavesy = new Set<string>()
    const onKeyDown = (e: KeyboardEvent) => {
      klavesy.add(e.key.toLowerCase())
      if (e.key === 'Shift' && !e.repeat) obranaPozadavekRef.current = true
    }
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
    let vitezstviDoMs = -Infinity
    let bossOtresDoMs = -Infinity

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

        // appka vyhodnotí, jestli je bossí souboj právě aktivní —
        // podle toho rozhodne, jestli appka běžné nepřátele zmrazí a
        // schová (appčina "jen jedna HP lišta najednou" požadavka na
        // čitelnost).
        const bossAktivni = bossRef.current.probuzen && bossRef.current.faze !== 'mrtvy'

        // --- obrana: appka zkusí vyhodnotit požadavek, appka sama
        // appku ověří cooldown (viz combat/engine.ts's aktivujObranu
        // — appka se nespoléhá na to, co už ověřilo UI). ---
        if (obranaPozadavekRef.current) {
          obranaPozadavekRef.current = false
          const vysledekObrany = aktivujObranu(obranaCooldownDoMsRef.current, casMs)
          if (vysledekObrany) {
            obranaAktivniDoMsRef.current = vysledekObrany.obranaAktivniDoMs
            obranaCooldownDoMsRef.current = vysledekObrany.obranaCooldownDoMs
          }
        }
        const obranaAktivni = jeObranaAktivni(obranaAktivniDoMsRef.current, casMs)

        /** appka tím zajistí všem zdrojům poškození hráče stejnou
         *  redukci obranou — jedna společná funkce, ne samostatná
         *  pro každý zdroj poškození zvlášť. */
        const zpusobPoskozeniHraci = (poskozeni: number) => {
          hracStavRef.current = utrzetPoskozeni(hracStavRef.current, redukujPoskozeniObranou(poskozeni, obranaAktivni))
        }

        // --- požadavek na vzbuzení bosse ---
        if (vyzvatPozadavekRef.current) {
          vyzvatPozadavekRef.current = false
          const vzdKHaji = vzdalenost2D(hracPozice, bossRef.current.pozice)
          if (melByProbuditBosse(bossRef.current, bossDef, vzdKHaji)) {
            bossRef.current = probuditBosse(bossRef.current)
          }
        }

        // --- bossí AI/útoky — appka volá krokAiBosse i
        // pokusUtokOtresemBosse nepodmíněně každý snímek; obě si
        // dormanci (!probuzen) ověřují sama uvnitř, appka je proto
        // nemusí obalovat žádnou podmínkou zvenčí. ---
        bossRef.current = krokAiBosse(bossRef.current, bossDef, hracPozice, dt)

        const vzdKBossovi = vzdalenost2D(hracPozice, bossRef.current.pozice)

        // appka znovupoužívá stejný pokusUtokNepritele z
        // combat/engine.ts pro melee útok bosse — nekopíruje tím
        // bojový engine, jen výsledné poškození navíc prožene
        // zuřivostí (aplikujZuriNaPoskozeni).
        const utokBosseMelee = pokusUtokNepritele(bossRef.current, bossDef, casMs)
        bossRef.current = utokBosseMelee.nepritel as BossRuntimeStav
        if (utokBosseMelee.provedeno) {
          zpusobPoskozeniHraci(aplikujZuriNaPoskozeni(utokBosseMelee.poskozeni, bossRef.current, bossDef))
        }

        const otresBosse = pokusUtokOtresemBosse(bossRef.current, bossDef, vzdKBossovi, casMs)
        bossRef.current = otresBosse.boss
        if (otresBosse.provedeno) {
          // zuřivost appka už zahrnula samo uvnitř pokusUtokOtresemBosse.
          zpusobPoskozeniHraci(otresBosse.poskozeni)
          bossOtresDoMs = casMs + 320
        }

        if (melByRespawnovat(bossRef.current, casMs)) {
          bossRef.current = obnovBosse(bossDef.id, bossDef.maxHp, BOSS_HAJ_POZICE)
        }

        // --- běžné nepřátele — appka je zmrazí/schová, dokud
        // probíhá souboj s bossem ---
        for (const slot of sloty) {
          slot.mesh.skupina.visible = !bossAktivni && slot.runtime.faze !== 'mrtvy'
          if (bossAktivni) continue

          slot.runtime = krokAI(slot.runtime, slot.def, hracPozice, dt)

          const utokSlotu = pokusUtokNepritele(slot.runtime, slot.def, casMs)
          slot.runtime = utokSlotu.nepritel
          if (utokSlotu.provedeno) {
            zpusobPoskozeniHraci(utokSlotu.poskozeni)
          }

          if (melByRespawnovat(slot.runtime, casMs)) {
            slot.runtime = vytvorNepritelRuntime(slot.def.id, slot.def.maxHp, bodVArene(6))
          }
        }

        // --- appka zkusí útok hráče — na bosse, pokud s ním souboj
        // probíhá, jinak na nejbližšího živého běžného nepřítele.
        // Appka jen naznačila požadavek (utocitPozadavekRef);
        // skutečné vyhodnocení dosahu/cooldownu appka vždy provede
        // uvnitř combat/engine.ts's pokusUtokHrace, nikdy napřímo
        // tady. ---
        if (utocitPozadavekRef.current) {
          utocitPozadavekRef.current = false

          if (bossAktivni) {
            const utokHrace = pokusUtokHrace(bossRef.current, vzdKBossovi, posledniUtokHraceRef.current, casMs)
            if (utokHrace.provedeno) {
              posledniUtokHraceRef.current = casMs
              bossRef.current = utokHrace.nepritel as BossRuntimeStav
              if (utokHrace.porazen) {
                vitezstviDoMs = casMs + 1400
                hracStavRef.current = pripocistXp(hracStavRef.current, bossDef.odmenaXp)
                onZabitiBosse(bossDef.odmenaXp)
              }
            }
          } else {
            let cilovySlot: SlotNepritele | null = null
            let nejmensiVzd = Infinity
            for (const slot of sloty) {
              if (slot.runtime.faze === 'mrtvy') continue
              const vzd = vzdalenost2D(hracPozice, slot.runtime.pozice)
              if (vzd < nejmensiVzd) {
                nejmensiVzd = vzd
                cilovySlot = slot
              }
            }
            if (cilovySlot) {
              const utokHrace = pokusUtokHrace(cilovySlot.runtime, nejmensiVzd, posledniUtokHraceRef.current, casMs)
              if (utokHrace.provedeno) {
                posledniUtokHraceRef.current = casMs
                cilovySlot.runtime = utokHrace.nepritel
                cilovySlot.hitDoMs = casMs + 220
                if (utokHrace.porazen) {
                  vitezstviDoMs = casMs + 1400
                  hracStavRef.current = pripocistXp(hracStavRef.current, cilovySlot.def.odmenaXp)
                  onZabitiNepritele(cilovySlot.def.odmenaXp)
                }
              }
            }
          }
        }

        // --- vykreslení běžných nepřátel ---
        let vBojiNekdo = false
        for (const slot of sloty) {
          slot.mesh.skupina.position.set(slot.runtime.pozice.x, 0, slot.runtime.pozice.z)
          const vBoji = slot.runtime.faze !== 'klid' && slot.runtime.faze !== 'mrtvy'
          vBojiNekdo = vBojiNekdo || vBoji
          if (!klidnyRezim && slot.mesh.skupina.visible) {
            const pulz = 1 + Math.sin(casMs * 0.0026) * (vBoji ? 0.1 : 0.05)
            slot.mesh.telo.scale.setScalar(casMs < slot.hitDoMs ? 1.35 : pulz)
            slot.mesh.teloMaterial.emissiveIntensity = casMs < slot.hitDoMs ? 1.4 : 0.5
            slot.mesh.skupina.rotation.y = casMs * 0.0004
            slot.mesh.halo.rotation.z = casMs * 0.0005
          }
        }

        // --- vykreslení bosse — appka odlišným pulzováním rozliší
        // dormantní stav od vzbuzeného a vzbuzený od zuřivého,
        // appčina viditelná zpětná vazba ze zadání. Halo se krátce
        // zvětší, kdy právě probíhá otřesový útok — druhý, viditelně
        // odlišný signál od obyčejného melee zásahu. ---
        bossMesh.skupina.position.set(bossRef.current.pozice.x, 0, bossRef.current.pozice.z)
        bossMesh.skupina.visible = bossRef.current.faze !== 'mrtvy'
        if (!klidnyRezim && bossMesh.skupina.visible) {
          const zasazen = casMs < vitezstviDoMs && bossRef.current.hp <= 0
          const puvodniPulz = bossRef.current.probuzen
            ? 1 + Math.sin(casMs * (bossRef.current.zuri ? 0.0048 : 0.003)) * (bossRef.current.zuri ? 0.14 : 0.08)
            : 1 + Math.sin(casMs * 0.0012) * 0.03
          bossMesh.telo.scale.setScalar(zasazen ? 1 : puvodniPulz)
          bossMesh.teloMaterial.emissiveIntensity = bossRef.current.zuri ? 1.4 : bossRef.current.probuzen ? 0.9 : 0.5
          bossMesh.skupina.rotation.y = casMs * (bossRef.current.probuzen ? 0.00045 : 0.00015)
          bossMesh.halo.rotation.z = casMs * 0.0005
          bossMesh.halo.scale.setScalar(casMs < bossOtresDoMs ? 1.6 : 1)
        }

        // --- Buddy plave kousek za a vpravo od hráče, appka mu k
        // tomu dá krátkou "vítěznou" reakci po poražení nepřítele/bosse
        // a mírnou "bojovou" reakci, dokud je nějaký souboj v chodu ---
        const buddyForward = { x: Math.sin(hracNatoceni), z: Math.cos(hracNatoceni) }
        const buddyRight = { x: buddyForward.z, z: -buddyForward.x }
        const cilBuddyX = hracPozice.x - buddyForward.x * BUDDY_ODSTUP_ZA + buddyRight.x * BUDDY_ODSTUP_STRANOU
        const cilBuddyZ = hracPozice.z - buddyForward.z * BUDDY_ODSTUP_ZA + buddyRight.z * BUDDY_ODSTUP_STRANOU
        const lerpK = Math.min(1, 4.2 * dt)
        buddy.position.x += (cilBuddyX - buddy.position.x) * lerpK
        buddy.position.z += (cilBuddyZ - buddy.position.z) * lerpK

        const vBoji = vBojiNekdo || bossAktivni
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

      // --- obnova po smrti, jen pokud o ni požádala obnovitPoSmrti()
      // a hráč je doopravdy mrtvý — appka tím resetuje i obranu a
      // vrátí bosse zpátky na jeho háj dormantně (zadání to žádá),
      // ne že by pokračoval tam, kde skončil ---
      const mrtvy = jeMrtvyHrac(hracStavRef.current)
      if (obnovitPozadavekRef.current && mrtvy) {
        obnovitPozadavekRef.current = false
        hracStavRef.current = plneUzdravit(hracStavRef.current)
        hracPozice = { x: 0, z: -4 }
        obranaAktivniDoMsRef.current = -Infinity
        obranaCooldownDoMsRef.current = -Infinity
        bossRef.current = obnovBosse(bossDef.id, bossDef.maxHp, BOSS_HAJ_POZICE)
        for (const slot of sloty) {
          slot.runtime = vytvorNepritelRuntime(slot.def.id, slot.def.maxHp, bodVArene(6))
        }
      }

      // --- appka sestaví čerstvý HUD a zavolá setState jen, pokud se
      // skutečně liší od toho, co naposledy vykreslila — appka tím
      // zabrání zbytečnému React re-renderu 60× za sekundu. ---
      const bossAktivniProHud = bossRef.current.probuzen && bossRef.current.faze !== 'mrtvy'

      let cilNepritele: SlotNepritele | null = null
      if (!bossAktivniProHud) {
        let nejmensiVzd = Infinity
        for (const slot of sloty) {
          if (slot.runtime.faze === 'klid' || slot.runtime.faze === 'mrtvy') continue
          const vzd = vzdalenost2D(hracPozice, slot.runtime.pozice)
          if (vzd < nejmensiVzd) {
            nejmensiVzd = vzd
            cilNepritele = slot
          }
        }
      }

      const utokPripravenNyni = bossAktivniProHud
        ? jePripravenUtok(bossRef.current, vzdalenost2D(hracPozice, bossRef.current.pozice), posledniUtokHraceRef.current, casMs)
        : cilNepritele
          ? jePripravenUtok(
              cilNepritele.runtime,
              vzdalenost2D(hracPozice, cilNepritele.runtime.pozice),
              posledniUtokHraceRef.current,
              casMs
            )
          : false

      const novyHud: BuddyWorldHud = {
        hrac: { ...hracStavRef.current },
        xpProDalsiUroven: 25 + (hracStavRef.current.level - 1) * 12,
        mrtvyHrac: mrtvy,
        utokPripraven: utokPripravenNyni,
        nepritelFocus: cilNepritele
          ? { def: cilNepritele.def, hp: cilNepritele.runtime.hp, maxHp: cilNepritele.def.maxHp, faze: cilNepritele.runtime.faze }
          : null,
        bossFocus: bossAktivniProHud
          ? {
              def: bossDef,
              hp: bossRef.current.hp,
              maxHp: bossDef.maxHp,
              faze: bossRef.current.faze,
              probuzen: bossRef.current.probuzen,
              zuri: bossRef.current.zuri,
            }
          : null,
        muzeVyzvatBosse: !mrtvy && melByProbuditBosse(bossRef.current, bossDef, vzdalenost2D(hracPozice, bossRef.current.pozice)),
        obranaAktivni: jeObranaAktivni(obranaAktivniDoMsRef.current, casMs),
        obranaPripravena: jeObranaPripravena(obranaCooldownDoMsRef.current, casMs),
      }

      if (hudSeZmenil(hudRef.current, novyHud)) {
        hudRef.current = novyHud
        setHud(novyHud)
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

      for (const slot of sloty) uvolniMesh(slot.mesh.skupina)
      uvolniMesh(bossMesh.skupina)

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
  }, [maskot, bossDef])

  return { containerRef, selhalo, nastavJoystick, utocit, obranit, vyzvatBosse, obnovitPoSmrti, hud }
}

/** appka porovná dva HUD objekty — appka tím zabrání zbytečnému
 *  re-renderu, i pro tenhle bohatší tvar s nepritelFocus/bossFocus,
 *  ne jen pro appčinu dřívější jedinou plochou dvojici
 *  nepritelHp/nepritelFaze. */
const hudSeZmenil = (stary: BuddyWorldHud, novy: BuddyWorldHud): boolean =>
  stary.hrac.hp !== novy.hrac.hp ||
  stary.hrac.level !== novy.hrac.level ||
  stary.hrac.xp !== novy.hrac.xp ||
  stary.mrtvyHrac !== novy.mrtvyHrac ||
  stary.utokPripraven !== novy.utokPripraven ||
  stary.muzeVyzvatBosse !== novy.muzeVyzvatBosse ||
  stary.obranaAktivni !== novy.obranaAktivni ||
  stary.obranaPripravena !== novy.obranaPripravena ||
  (stary.nepritelFocus?.def.id ?? null) !== (novy.nepritelFocus?.def.id ?? null) ||
  (stary.nepritelFocus?.hp ?? null) !== (novy.nepritelFocus?.hp ?? null) ||
  (stary.nepritelFocus?.faze ?? null) !== (novy.nepritelFocus?.faze ?? null) ||
  (stary.bossFocus?.hp ?? null) !== (novy.bossFocus?.hp ?? null) ||
  (stary.bossFocus?.faze ?? null) !== (novy.bossFocus?.faze ?? null) ||
  (stary.bossFocus?.probuzen ?? null) !== (novy.bossFocus?.probuzen ?? null) ||
  (stary.bossFocus?.zuri ?? null) !== (novy.bossFocus?.zuri ?? null)
