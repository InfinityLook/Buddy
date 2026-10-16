import { noveObjevenaOblast } from '../data/objevovani'
import { POKLADY } from '../data/poklady'
import { OBLASTI_SVETA } from '../data/oblasti'
import { vytvorBojoveEfekty } from './combatVisuals'
import { buddySkillPripraven, buddySkillZasah, buddySkillCooldown as cooldownProMaskota, mossUzdraveni, FROST_ZPOMALENI_MS, frostNasobicRychlosti, zacniHoreni, krokHoreni, type HoriStav } from '../combat/buddySkills'
import { Zbran, muzeUtokZbrani } from '../combat/weapons'
import { jeVolneMisto, jeVolneProPresun } from '../buildingPlacement'
import type { StavitelnyTyp } from '../buildingPlacement'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { BossRuntimeStav, BuddyWorldHracStav, MaskotDef, NepritelDef, NepritelRuntimeStav, Pozice2D } from '../types'
import {
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
import { vytvorOblastniSpawny, poziceVOblasti } from '../data/oblastniNepratele'
import { jeMrtvyHrac, plneUzdravit, pripocistXp, utrzetPoskozeni } from '../leveling'
import { klonGlbModelu, nacistGlbModel } from './assetLoader'
import { useVillageStore } from '../useVillageStore'
import { odemceneStavby } from '../villageBuildings'
import { OBYVATELE } from '../data/obyvatele'

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
// mobilu": na obrazovce appka nikdy neukáže víc než jednu HP lištu
// najednou.
//
// TŘETÍ POKRAČOVÁNÍ VÝVOJE (BuddyWorld_Complete_Project_Pack.zip,
// Fáze 0+1) — "skoro prázdná scéna" ověřilo přečtení celého souboru
// výš, ne hádání: canvas, kamera, z-index i CSS jsou v pořádku,
// žádná chyba se tu nenašla. Skutečná příčina je obsahová řídkost —
// svět měl jen 26 dekorací rozsetých po ploše s poloměrem 24, bez
// jediného orientačního bodu (vesnice, cesta, krystal) a bez
// rozdílu mezi "vesnicí" a "lesem". Tahle fáze to doplňuje: malá
// vesnice (dvě chaty + dílna kolem appčina VESNICE_STRED), blízký
// krystalový útvar hned u startu, hustší lesní dekorace (46 místo
// 26) a viditelná cesta mezi spawnem a vesnicí.
//
// Appka teď nahrává skutečné .glb modely z ArtPacku
// (public/buddyworld/…, viz scene/assetLoader.ts a data/assets.ts),
// ale nikdy nenechá hráče čekat na prázdný snímek: nejdřív postaví
// svou obvyklou primitivní náhradu, a jakmile se model doopravdy
// nahraje, starou primitivu zahodí a nahradí ji novým GLB klonem
// (klonGlbModelu). Selhání nahrávání appce nikdy nespadne jako
// chyba — zůstane tiše u primitivy.
//
// Nepřítele a bosse tahle fáze záměrně nechává primitivní —
// appčina vytvorNepritelMesh pevně svazuje telo/teloMaterial s
// animací zásahu a pulzu v krok() smyčce výš, a přepsat tuhle vazbu
// na GLB bezpečně by potřebovalo širší refaktor. Bezpečnější krok
// je to teď odložit, ne to risknout napolo — zadání samo žádá
// "zvol bezpečné řešení a zdokumentuj ho", přesně tohle rozhodnutí
// to dělá.
//
// REÁLNÝ TEST NA TELEFONU (po Fázi 0+1 výš) odhalil skutečnou,
// konkrétní vadu: úvodní záběr ukazoval jen rozmazanou zelenou/hnědou
// plochu zblízka, ne čitelný les. Appčin dřívější seznam vyloučených
// zón chránil střed světa, bossův háj, vesnici a krystal — ale ne
// appčin skutečný spawn hráče ({x:0,z:-4}) ani appčinu výchozí
// kameru, která sedí dalších 2,7 až 6 jednotek za ním (viz výpočet
// níž u SPAWN_POLOMER). Strom tak mohl vzniknout doslova před
// objektivem hned při prvním snímku — appka to teď řeší pátou
// vyloučenou zónou kolem spawnu.
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

/** Appka kolem tohoto středu postaví malou vesnici (dvě chaty +
 *  dílna) — první, blízký orientační bod hned u spawnu (appka
 *  startuje hráče na {x:0, z:-4}, vesnice proto leží jen kousek
 *  před ním). */
const VESNICE_STRED: Pozice2D = { x: 0, z: 13 }
const VESNICE_CHATA_1: Pozice2D = { x: -5, z: 13 }
const VESNICE_CHATA_2: Pozice2D = { x: 5, z: 13 }
const VESNICE_DILNA: Pozice2D = { x: 0, z: 18 }
/** Vylučovací poloměr kolem vesnice — appka dekoraci (stromy/kameny)
 *  do něj nikdy neumístí, ať nestojí appce doslova ve dveřích. */
const VESNICE_POLOMER = 9

/** Druhý, blízký orientační bod — krystal appka postaví hned u
 *  startu, ne jen daleko u bossova háje. */
const KRYSTAL_POZICE: Pozice2D = { x: 0, z: 4 }
const KRYSTAL_POLOMER = 3.5

/** Kde hráč začíná (a kam se vrátí po smrti) — jedno sdílené místo,
 *  ne dva samostatné literály, co by se časem mohly rozejít. */
const HRAC_SPAWN_POZICE: Pozice2D = { x: 0, z: -4 }

/** Vyloučená zóna kolem spawnu — appka ji doplnila po reálném testu
 *  na telefonu (viz komentář výš u "REÁLNÝ TEST NA TELEFONU"). appčina
 *  kamera sedí při startu (yaw=0) 2,7 až 6 jednotek za hráčem podle
 *  pitche (cos(pitch)*KAMERA_VZDALENOST, pitch jde od 0,12 do 1,1) —
 *  appka poloměr 8 zvolila schválně větší, ať appku pokryje i
 *  nejvzdálenější appčinu kamerovou pozici s rezervou, ne jen
 *  přesně na hraně. */
const SPAWN_POLOMER = 8

/** Appka zvýšila dekoraci ze dřívějších 26 na tohle číslo — přímá
 *  oprava appčina Fáze 0 auditu ("scéna je skoro prázdná"). */
const POCET_DEKORACI = 46

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

/** Zúžený "focus" tvar — HUD z něj potřebuje jen HP/maxHp a fázi,
 *  ne celý runtime stav. */
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
  /** Jen pro dev build (import.meta.env.DEV) — appka v produkci
   *  tohle pole vždy nastaví na undefined, ať HUD.tsx nemá co
   *  zobrazit a Vite celý diagnostický JSX blok vyhodí z buildu
   *  (ověřeno grepem nad dist/, stejný postup jako core/role/
   *  devTools.ts). */
  diagnostika?: BuddyWorldDiagnostika
}

/** Dev diagnostický přehled pro Fázi 0+1 (BuddyWorld_Complete_
 *  Project_Pack.zip) — appka ho počítá pro audit "proč je scéna
 *  prázdná" otázky (velikost plátna, kolik objektů appka doopravdy
 *  vykreslila, který GLB model se nahrál a který spadl na appčinu
 *  primitivní náhradu, appčin reálný FPS). */
export interface BuddyWorldDiagnostika {
  sirkaPlatna: number
  vyskaPlatna: number
  pocetDekoraciStromy: number
  pocetDekoraciKameny: number
  fps: number
  stavAssetu: Record<string, 'nahravaji' | 'ok' | 'selhalo'>
}

interface UseBuddyWorldSceneResult {
  containerRef: React.RefObject<HTMLDivElement>
  selhalo: boolean
  nastavJoystick: (x: number, z: number) => void
  utocit: () => void
  pouzijBuddySchopnost: () => void
  buddySkillCooldown: number
  zvolZbran: (zbran: Zbran) => void
  obranit: () => void
  sebrat: () => void
  postavit: (typ: StavitelnyTyp) => void
  presunout: (id: string) => void
  potvrditStavbu: () => void
  zrusitNahled: () => void
  otocitNahled: () => void
  nahledPlatny: boolean
  vyzvatBosse: () => void
  obnovitPoSmrti: () => void
  /** appka tím appčinu komponentu appkou informuje, který obyvatel je
   *  zrovna nablízku hráči (appka s ním zrovna „promlouvá") — appka
   *  se vrátí k appčině `null`, jakmile hráč z appčina okruhu NPC
   *  odejde. appka nikdy nedrží víc než jednoho obyvatele zároveň. */
  blizkyObyvatel: (typeof OBYVATELE)[number] | null
  hud: BuddyWorldHud
  poziceHrace: Pozice2D
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
  oblastId: string
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
  const [poziceHrace, setPoziceHrace] = useState<Pozice2D>({ ...HRAC_SPAWN_POZICE })
  const joystickRef = useRef({ x: 0, z: 0 })

  const hracStavRef = useRef<BuddyWorldHracStav>(pocatecniHracStav)
  const bossRef = useRef<BossRuntimeStav>(vytvorBossRuntime(bossDef.id, bossDef.maxHp, BOSS_HAJ_POZICE))
  const posledniUtokHraceRef = useRef(-Infinity)
  const obranaAktivniDoMsRef = useRef(-Infinity)
  const obranaCooldownDoMsRef = useRef(-Infinity)

  const zbranRef = useRef<Zbran>('mec')
  const zvolZbran = (zbran: Zbran) => { zbranRef.current = zbran }
  const buddySkillCooldownRef = useRef(0)
  const buddySkillPozadavekRef = useRef(false)
  const frostZpomaleniRef = useRef(new Map<string, number>())
  const emberHoreniRef = useRef(new Map<string, HoriStav>())
  const buddySkillPosledniMsRef = useRef(-Infinity)
  const [buddySkillCooldown, setBuddySkillCooldown] = useState(0)
  const pouzijBuddySchopnost = () => { buddySkillPozadavekRef.current = true }
  const utocitPozadavekRef = useRef(false)
  const obranaPozadavekRef = useRef(false)
  const vyzvatPozadavekRef = useRef(false)
  const obnovitPozadavekRef = useRef(false)
  const sberPozadavekRef = useRef(false)
  const staveniPozadavekRef = useRef<StavitelnyTyp | null>(null)
  const presunPozadavekRef = useRef<string | null>(null)
  const potvrditRef = useRef(false)
  const rotaceRef = useRef(0)
  const [nahledPlatny, setNahledPlatny] = useState(false)
  const aktivniNahledRef = useRef<{ typ?: StavitelnyTyp; id?: string } | null>(null)

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
  const sebrat = () => { sberPozadavekRef.current = true }
  const postavit = (typ: StavitelnyTyp) => { aktivniNahledRef.current = { typ }; staveniPozadavekRef.current = null }
  const presunout = (id: string) => { aktivniNahledRef.current = { id }; presunPozadavekRef.current = null }
  const potvrditStavbu = () => { potvrditRef.current = true }
  const zrusitNahled = () => { aktivniNahledRef.current = null; potvrditRef.current = false; setNahledPlatny(false) }
  const otocitNahled = () => { rotaceRef.current = (rotaceRef.current + Math.PI / 2) % (2 * Math.PI) }

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

  const [blizkyObyvatel, setBlizkyObyvatel] = useState<(typeof OBYVATELE)[number] | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const klidnyRezim = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Appka nastaví tuhle vlajku na true přesně jednou, při odchodu
    // — každý asynchronní callback z nacistGlbModel() ji zkontroluje
    // dřív, než scénu znovu upraví, ať žádný GLB callback nedoběhne
    // pozdě a nemutoval už uvolněnou scénu.
    let odpojeno = false

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
    const bojoveEfekty = vytvorBojoveEfekty(scene)
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

    // Vizuální rozlišení čtyř částí světa bez dalších textur či síťových požadavků.
    // Poloprůhledné kruhy leží těsně nad zemí a nepřekážejí kolizím.
    const oblastiVizual = new THREE.Group()
    for (const oblast of OBLASTI_SVETA) {
      const plocha = new THREE.Mesh(
        new THREE.CircleGeometry(oblast.polomer, 48),
        new THREE.MeshBasicMaterial({ color: oblast.barva, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide })
      )
      plocha.rotation.x = -Math.PI / 2
      plocha.position.set(oblast.stred.x, 0.012, oblast.stred.z)
      const hranice = new THREE.Mesh(
        new THREE.RingGeometry(oblast.polomer - 0.11, oblast.polomer, 64),
        new THREE.MeshBasicMaterial({ color: oblast.barva, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide })
      )
      hranice.rotation.x = -Math.PI / 2
      hranice.position.set(oblast.stred.x, 0.018, oblast.stred.z)
      oblastiVizual.add(plocha, hranice)
    }
    scene.add(oblastiVizual)

    // --- dekorace (stromy/kameny), rozeseté mimo appčin střed, mimo
    // bossův háj, mimo vesnici a mimo appčin krystal, ať appka
    // žádnou siluetu nezacloní ---
    const dekorace = new THREE.Group()
    scene.add(dekorace)
    const volnaZonaKolem = (x: number, z: number, min: number) => Math.hypot(x, z) < min
    const blizkoHaje = (x: number, z: number) => Math.hypot(x - BOSS_HAJ_POZICE.x, z - BOSS_HAJ_POZICE.z) < 4.5
    const blizkoVesnice = (x: number, z: number) => Math.hypot(x - VESNICE_STRED.x, z - VESNICE_STRED.z) < VESNICE_POLOMER
    const blizkoKrystalu = (x: number, z: number) =>
      Math.hypot(x - KRYSTAL_POZICE.x, z - KRYSTAL_POZICE.z) < KRYSTAL_POLOMER + 1.5
    // Pátá vyloučená zóna, kolem skutečného spawnu hráče (a tedy i
    // appčiny výchozí kamery hned za ním) — viz komentář u
    // SPAWN_POLOMER výš.
    const blizkoSpawnu = (x: number, z: number) =>
      Math.hypot(x - HRAC_SPAWN_POZICE.x, z - HRAC_SPAWN_POZICE.z) < SPAWN_POLOMER
    // Appka si ukládá nově postavené stromy a kameny podle typu do
    // dvou samostatných polí — po nahrání GLB tím umí zaměnit jen
    // primitivy daného typu, bez prohledávání celé skupiny znovu.
    const dekoraceStromy: THREE.Group[] = []
    const dekoraceKameny: THREE.Group[] = []
    for (let i = 0; i < POCET_DEKORACI; i++) {
      let x = 0
      let z = 0
      let pokus = 0
      do {
        const uhel = Math.random() * Math.PI * 2
        const polomer = Math.sqrt(Math.random()) * POLOMER_SVETA * 0.95
        x = Math.cos(uhel) * polomer
        z = Math.sin(uhel) * polomer
        pokus++
      } while (
        pokus < 12 &&
        (volnaZonaKolem(x, z, 3.5) ||
          blizkoHaje(x, z) ||
          blizkoVesnice(x, z) ||
          blizkoKrystalu(x, z) ||
          blizkoSpawnu(x, z))
      )

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
        dekoraceStromy.push(skupina)
      } else {
        const kamen = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.3),
          new THREE.MeshStandardMaterial({ color: '#5a5248', roughness: 1 })
        )
        kamen.position.y = 0.3
        kamen.rotation.set(Math.random(), Math.random(), Math.random())
        skupina.add(kamen)
        dekoraceKameny.push(skupina)
      }
      skupina.position.set(x, 0, z)
      dekorace.add(skupina)
    }

    // --- appka vesnice: dvě chaty + dílna, primitivní "krabice +
    // střecha" náhrady — appka je zamění za GLB (mestecko/zaklad a
    // mestecko/dilna) hned po nahrání níž ---
    const postavChatu = (pozice: Pozice2D): THREE.Group => {
      const skupina = new THREE.Group()
      const zed = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.8, 2.2),
        new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: 0.9 })
      )
      zed.position.y = 0.9
      const strecha = new THREE.Mesh(
        new THREE.ConeGeometry(1.75, 1.3, 4),
        new THREE.MeshStandardMaterial({ color: '#6b3a2a', roughness: 0.85 })
      )
      strecha.position.y = 2.45
      strecha.rotation.y = Math.PI / 4
      skupina.add(zed, strecha)
      skupina.position.set(pozice.x, 0, pozice.z)
      scene.add(skupina)
      return skupina
    }
    const chata1 = postavChatu(VESNICE_CHATA_1)
    const chata2 = postavChatu(VESNICE_CHATA_2)

    const dilna = new THREE.Group()
    const dilnaZed = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.1, 2.6),
      new THREE.MeshStandardMaterial({ color: '#7a7268', roughness: 0.9 })
    )
    dilnaZed.position.y = 1.05
    const dilnaStrecha = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.3, 0.3, 4),
      new THREE.MeshStandardMaterial({ color: '#4a4138', roughness: 0.85 })
    )
    dilnaStrecha.position.y = 2.25
    dilnaStrecha.rotation.y = Math.PI / 4
    dilna.add(dilnaZed, dilnaStrecha)
    dilna.position.set(VESNICE_DILNA.x, 0, VESNICE_DILNA.z)
    scene.add(dilna)

    // Obyvatelé osady — jednoduché nízkopolygonové figurky s vlastním
    // bezpečným okruhem chůze. Není nutné načítat placené 3D assety.
    const obyvatele = OBYVATELE.map((def, i) => {
      const skupina = new THREE.Group()
      const material = new THREE.MeshStandardMaterial({ color: def.barva, roughness: 0.8 })
      const telo = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.82, 4, 8), material)
      telo.position.y = 1.02
      const hlava = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xf1c9a8, roughness: 0.85 }))
      hlava.position.y = 1.84
      const vlasy = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 8),
        new THREE.MeshStandardMaterial({ color: i === 0 ? 0x6d413c : i === 1 ? 0x35343c : 0xa25d31 }))
      vlasy.scale.y = 0.47
      vlasy.position.y = 2.04
      skupina.add(telo, hlava, vlasy)
      skupina.position.set(def.x, 0, def.z)
      scene.add(skupina)
      return { def, skupina, faze: i * 2.3 }
    })

    // Nové stavby se odemykají podle skutečné uložené úrovně osady.
    // Vlastníme jejich meshe v této scéně a aktualizujeme je bez resetu
    // hráče, nepřátel, kamery či WebGL rendereru.
    const noveStavby = new THREE.Group()
    scene.add(noveStavby)
    let posledniUroven = -1
    const obnovStavby = (uroven: number) => {
      if (posledniUroven === uroven) return
      posledniUroven = uroven
      for (const dite of [...noveStavby.children]) {
        noveStavby.remove(dite)
        dite.traverse((obj) => {
          const mesh = obj as THREE.Mesh
          mesh.geometry?.dispose()
          const material = mesh.material as THREE.Material | THREE.Material[] | undefined
          if (Array.isArray(material)) material.forEach((m) => m.dispose())
          else material?.dispose()
        })
      }
      for (const stavba of odemceneStavby(uroven)) {
        const skupina = new THREE.Group()
        const zdi = new THREE.Mesh(
          new THREE.BoxGeometry(stavba.sirka, stavba.vyska, stavba.hloubka),
          new THREE.MeshStandardMaterial({ color: stavba.barvaZdi, roughness: 0.88 })
        )
        zdi.position.y = stavba.vyska / 2
        const strecha = new THREE.Mesh(
          new THREE.ConeGeometry(stavba.sirka * 0.83, 1.15, 4),
          new THREE.MeshStandardMaterial({ color: stavba.barvaStrechy, roughness: 0.83 })
        )
        strecha.position.y = stavba.vyska + 0.58
        strecha.rotation.y = Math.PI / 4
        const dvere = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 1.1, 0.08),
          new THREE.MeshStandardMaterial({ color: '#5a3421', roughness: 0.95 })
        )
        dvere.position.set(0, 0.55, stavba.hloubka / 2 + 0.05)
        skupina.add(zdi, strecha, dvere)
        skupina.position.set(stavba.x, 0, stavba.z)
        noveStavby.add(skupina)
      }
    }
    // Vlastní hráčovy dekorace a stavby, uložené společně s inventářem.
    const postavene = new THREE.Group()
    scene.add(postavene)
    let posledniStavby = useVillageStore.getState().umisteneStavby
    const obnovUmistene = (stavby: typeof posledniStavby) => {
      if (stavby === posledniStavby && postavene.children.length) return
      posledniStavby = stavby
      for (const dite of [...postavene.children]) {
        postavene.remove(dite)
        dite.traverse((obj) => {
          const mesh = obj as THREE.Mesh
          mesh.geometry?.dispose()
          const m = mesh.material as THREE.Material | THREE.Material[] | undefined
          if (Array.isArray(m)) m.forEach((v) => v.dispose())
          else m?.dispose()
        })
      }
      for (const stavba of stavby) {
        const skupina = new THREE.Group()
        if (stavba.typ === 'lucerna') {
          const podstavec = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.4, 8), new THREE.MeshStandardMaterial({ color: '#5b4030' }))
          podstavec.position.y = 0.7
          const svetlo = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffda80', emissive: '#ffb84d', emissiveIntensity: 1.1 }))
          svetlo.position.y = 1.5
          skupina.add(podstavec, svetlo)
        } else {
          const kamen = stavba.typ === 'kamenny_blok'
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.85, 1.1), new THREE.MeshStandardMaterial({ color: kamen ? '#a5a8ad' : '#8b5a31' }))
          mesh.position.y = 0.425
          skupina.add(mesh)
        }
        skupina.position.set(stavba.x, 0, stavba.z)
        postavene.add(skupina)
      }
    }
    obnovUmistene(posledniStavby)
    const odhlasUmistene = useVillageStore.subscribe((stav) => {
      if (stav.umisteneStavby !== posledniStavby) obnovUmistene(stav.umisteneStavby)
    })
    obnovStavby(useVillageStore.getState().uroven)
    const odhlasStavby = useVillageStore.subscribe((stav) => obnovStavby(stav.uroven))

    // --- appka krystal: blízký, hned viditelný orientační bod,
    // appka ho zamění za GLB (prostredi/krystal.glb) po nahrání níž ---
    const krystal = new THREE.Group()
    const krystalMaterial = new THREE.MeshStandardMaterial({
      color: '#7fd8e8',
      emissive: '#3fb8d0',
      emissiveIntensity: 0.8,
      roughness: 0.25,
      metalness: 0.3,
    })
    const krystalJadro = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), krystalMaterial)
    krystalJadro.position.y = 1.1
    krystal.add(krystalJadro, new THREE.PointLight('#3fb8d0', 1.3, 8))
    krystal.position.set(KRYSTAL_POZICE.x, 0, KRYSTAL_POZICE.z)
    scene.add(krystal)

    // --- cesta: pár plochých, světlejších dlažebních pruhů mezi
    // spawnem a vesnicí — appka tím hráči hned ukáže "kam jít", bez
    // nutnosti slepě zkoumat celou mapu ---
    const cestaMaterial = new THREE.MeshStandardMaterial({ color: '#8c7a5c', roughness: 1 })
    const CESTA_BODY: Pozice2D[] = [
      { x: 0, z: -3 },
      { x: 0, z: 1 },
      { x: 0, z: 6 },
      { x: 0, z: 10 },
      VESNICE_STRED,
    ]
    for (let i = 0; i < CESTA_BODY.length - 1; i++) {
      const od = CESTA_BODY[i]
      const doBodu = CESTA_BODY[i + 1]
      const dx = doBodu.x - od.x
      const dz = doBodu.z - od.z
      const delka = Math.hypot(dx, dz)
      const dlazba = new THREE.Mesh(new THREE.PlaneGeometry(1.6, delka), cestaMaterial)
      dlazba.rotation.x = -Math.PI / 2
      // Appka použila stejnou úhlovou konvenci jako hracNatoceni výš
      // (atan2(dx, dz)) — jedna společná dohoda pro "kam to má
      // koukat", ne druhá nezávislá.
      dlazba.rotation.y = Math.atan2(dx, dz)
      dlazba.position.set((od.x + doBodu.x) / 2, 0.01, (od.z + doBodu.z) / 2)
      scene.add(dlazba)
    }

    // Interaktivní surovinové uzly. Vizuální tvary jsou záměrně jednoduché,
    // aby sběr fungoval i bez stažení externích 3D modelů.
    const suroviny: Array<{ typ: 'drevo' | 'kamen' | 'krystaly'; x: number; z: number; mesh: THREE.Group; dostupneOd: number }> = []
    // Dřevo poblíž vesnice, kámen v lese a krystaly na mýtině.
    // Každý uzel se po sebrání obnoví; krystaly mají delší obnovu.
    const poziceSurovin: Array<{ typ: 'drevo' | 'kamen' | 'krystaly'; x: number; z: number }> = [
      { typ: 'drevo', x: 2, z: 12 }, { typ: 'drevo', x: -3, z: 14 },
      { typ: 'drevo', x: 4, z: 16 }, { typ: 'drevo', x: -5, z: 10 },
      { typ: 'kamen', x: -11, z: -1 }, { typ: 'kamen', x: -15, z: -4 },
      { typ: 'kamen', x: -17, z: -1 }, { typ: 'kamen', x: -12, z: -7 },
      { typ: 'krystaly', x: 1, z: 4 }, { typ: 'krystaly', x: -1.5, z: 3 },
    ]
    for (const uzel of poziceSurovin) {
      const mesh = new THREE.Group()
      const geometrie = uzel.typ === 'drevo'
        ? new THREE.CylinderGeometry(0.23, 0.3, 0.9, 7)
        : uzel.typ === 'krystaly' ? new THREE.OctahedronGeometry(0.5) : new THREE.DodecahedronGeometry(0.45)
      const material = new THREE.MeshStandardMaterial({ color: uzel.typ === 'drevo' ? '#a46d39' : uzel.typ === 'krystaly' ? '#62e0e5' : '#91a2ad' })
      const telo = new THREE.Mesh(geometrie, material)
      telo.position.y = uzel.typ === 'drevo' ? 0.48 : 0.43
      mesh.add(telo)
      mesh.position.set(uzel.x, 0, uzel.z)
      scene.add(mesh)
      suroviny.push({ ...uzel, mesh, dostupneOd: 0 })
    }

    // Poklady se zobrazují jen do prvního otevření; stav se ukládá do osady.
    const truhly = POKLADY.map((poklad) => {
      const mesh = new THREE.Group()
      const zaklad = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.48, 0.55),
        new THREE.MeshStandardMaterial({ color: '#754322', roughness: 0.8 }))
      zaklad.position.y = 0.27
      const viko = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.17, 0.61),
        new THREE.MeshStandardMaterial({ color: '#d6ad52', metalness: 0.55, roughness: 0.4 }))
      viko.position.y = 0.59
      mesh.add(zaklad, viko)
      mesh.position.set(poklad.x, 0, poklad.z)
      scene.add(mesh)
      return { poklad, mesh }
    })

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
    for (const spawn of vytvorOblastniSpawny(POCET_SLOTU_NEPRATEL)) {
      const { def, oblastId } = spawn
      const runtime = vytvorNepritelRuntime(def.id, def.maxHp, spawn.pozice)
      const mesh = vytvorNepritelMesh(def)
      // Dva nenáročné 3D indikátory stavů: plamenný prstenec a ledová aura.
      // Patří přímo nepříteli, takže sledují jeho pohyb a při úklidu se uvolní.
      const horiciAura = new THREE.Mesh(
        new THREE.TorusGeometry(0.78 * def.meritko, 0.075 * def.meritko, 8, 24),
        new THREE.MeshBasicMaterial({ color: '#ff6a22', transparent: true, opacity: 0.85, depthWrite: false })
      )
      horiciAura.position.y = 0.55 * def.meritko
      horiciAura.rotation.x = Math.PI / 2
      horiciAura.visible = false
      horiciAura.name = 'buddy-ember-burn'
      const ledovaAura = new THREE.Mesh(
        new THREE.TorusGeometry(0.9 * def.meritko, 0.065 * def.meritko, 8, 24),
        new THREE.MeshBasicMaterial({ color: '#65e8ff', transparent: true, opacity: 0.8, depthWrite: false })
      )
      ledovaAura.position.y = 0.16 * def.meritko
      ledovaAura.rotation.x = Math.PI / 2
      ledovaAura.visible = false
      ledovaAura.name = 'buddy-frost-slow'
      mesh.skupina.add(horiciAura, ledovaAura)
      scene.add(mesh.skupina)
      sloty.push({ def, oblastId, runtime, mesh, hitDoMs: -Infinity })
    }

    // --- boss — stejná vizuální továrna, ale z BossDef (vyšší
    // meritko ho appka vykreslí viditelně větší). Stojí trvale na
    // BOSS_HAJ_POZICE, dokud ho krokAiBosse poprvé nepohne — ten
    // appka hýbe bossem jen po probuzení. ---
    const bossMesh = vytvorNepritelMesh(bossDef)
    bossMesh.skupina.position.set(BOSS_HAJ_POZICE.x, 0, BOSS_HAJ_POZICE.z)
    scene.add(bossMesh.skupina)

    // --- appka teď zkusí nahradit primitivy skutečnými GLB modely
    // z public/buddyworld/ (viz assetLoader.ts a data/assets.ts).
    // Primitivum appka vykreslila hned výš, takže appka nikdy
    // neukáže prázdný snímek, dokud čeká na síť — jakmile se model
    // doopravdy nahraje, stará primitiva se zahodí (geometrie a
    // materiál se uvolní) a appka ji nahradí novým GLB klonem (viz
    // klonGlbModelu v assetLoader.ts). appka jen odstraní primitivní
    // MESH děti dané skupiny — jakékoli světlo v ní zůstává
    // nedotčené, ať appčina ambientní záře kolem skutečného modelu
    // nezmizí.
    //
    // Nepřítele a bosse tahle fáze záměrně nechává primitivní, viz
    // komentář v úvodu souboru výš (TŘETÍ POKRAČOVÁNÍ VÝVOJE) —
    // appka ten krok odkládá, ne riskuje napolo. ---
    const nahradMeshNaGlb = (skupina: THREE.Group, model: THREE.Group) => {
      for (const dite of [...skupina.children]) {
        if (!(dite as THREE.Mesh).isMesh) continue
        skupina.remove(dite)
        const mesh = dite as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(material)) material.forEach((m) => m.dispose())
        else material?.dispose()
      }
      skupina.add(klonGlbModelu(model))
    }

    // Appka sleduje stav GLB assetů jen pro svůj dev diagnostický
    // přehled v HUD.tsx. V produkci se tenhle přehled nikdy
    // nezobrazí, hodnoty se ale počítají i tak, aby appka
    // nepotřebovala druhou větev kódu jen pro dev build.
    const stavGlbAssetu: Record<string, 'nahravaji' | 'ok' | 'selhalo'> = {
      'prostredi.strom': 'nahravaji',
      'prostredi.kamen': 'nahravaji',
      'prostredi.krystal': 'nahravaji',
      'mestecko.zaklad': 'nahravaji',
      'mestecko.dilna': 'nahravaji',
    }
    if (maskot.model) stavGlbAssetu[`maskot.${maskot.id}`] = 'nahravaji'

    nacistGlbModel('/buddyworld/prostredi/strom.glb').then((model) => {
      stavGlbAssetu['prostredi.strom'] = model ? 'ok' : 'selhalo'
      if (odpojeno || !model) return
      for (const strom of dekoraceStromy) nahradMeshNaGlb(strom, model)
    })
    nacistGlbModel('/buddyworld/prostredi/kamen.glb').then((model) => {
      stavGlbAssetu['prostredi.kamen'] = model ? 'ok' : 'selhalo'
      if (odpojeno || !model) return
      for (const kamen of dekoraceKameny) nahradMeshNaGlb(kamen, model)
    })
    nacistGlbModel('/buddyworld/prostredi/krystal.glb').then((model) => {
      stavGlbAssetu['prostredi.krystal'] = model ? 'ok' : 'selhalo'
      if (odpojeno || !model) return
      nahradMeshNaGlb(krystal, model)
    })
    nacistGlbModel('/buddyworld/mestecko/zaklad.glb').then((model) => {
      stavGlbAssetu['mestecko.zaklad'] = model ? 'ok' : 'selhalo'
      if (odpojeno || !model) return
      nahradMeshNaGlb(chata1, model)
      nahradMeshNaGlb(chata2, model)
    })
    nacistGlbModel('/buddyworld/mestecko/dilna.glb').then((model) => {
      stavGlbAssetu['mestecko.dilna'] = model ? 'ok' : 'selhalo'
      if (odpojeno || !model) return
      nahradMeshNaGlb(dilna, model)
    })
    // Buddy je výjimka z generické nahradMeshNaGlb výš — appka chce
    // zachovat záři (buddyZar) i bodové světlo, ne je zahodit spolu
    // s jádrem, takže odstraní jen samotné buddyJadro.
    if (maskot.model) {
      nacistGlbModel(maskot.model).then((model) => {
        stavGlbAssetu[`maskot.${maskot.id}`] = model ? 'ok' : 'selhalo'
        if (odpojeno || !model) return
        buddy.remove(buddyJadro)
        if (buddyJadro.geometry) buddyJadro.geometry.dispose()
        buddyJadroMaterial.dispose()
        buddy.add(klonGlbModelu(model))
      })
    }

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

    const nahledMaterial = new THREE.MeshStandardMaterial({ color: '#62e4a0', transparent: true, opacity: 0.48, depthWrite: false })
    const nahledObjekt = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), nahledMaterial)
    nahledObjekt.position.y = 0.6
    nahledObjekt.visible = false
    scene.add(nahledObjekt)
    let platnyPosledne = false

    let posledniCas = performance.now()
    let posledniNpcId = ''
    let hracPozice: Pozice2D = { ...HRAC_SPAWN_POZICE }
    let posledniKontrolaObjeveniMs = -Infinity
    let hracNatoceni = 0
    let vitezstviDoMs = -Infinity
    let bossOtresDoMs = -Infinity

    // FPS appka počítá jen pro dev diagnostický přehled (HUD.tsx),
    // po celých sekundách, ne po snímku — appka tím v hudSeZmenil níž
    // nevynutí re-render šedesátkrát za sekundu, jen jednou.
    let fpsPocetSnimku = 0
    let fpsOknoOdMs = performance.now()
    let fpsAktualni = 0

    let posledniMinimapaMs = 0
    const krok = (ted: number) => {
      const aktivni = aktivniNahledRef.current
      const x = Math.round((hracPozice.x + Math.sin(hracNatoceni) * 3) * 2) / 2
      const z = Math.round((hracPozice.z + Math.cos(hracNatoceni) * 3) * 2) / 2
      const stav = useVillageStore.getState()
      const platny = !!aktivni && (aktivni.typ
        ? jeVolneMisto(stav.umisteneStavby, x, z) && stav.inventar[aktivni.typ] > 0
        : !!aktivni.id && jeVolneProPresun(stav.umisteneStavby, aktivni.id, x, z))
      if (nahledObjekt) {
        nahledObjekt.visible = !!aktivni
        nahledObjekt.position.set(x, 0, z)
        nahledObjekt.rotation.y = rotaceRef.current
        const typ = aktivni?.typ ?? stav.umisteneStavby.find((b) => b.id === aktivni?.id)?.typ
        nahledObjekt.scale.set(typ === 'lucerna' ? 0.35 : 1, 1, typ === 'lucerna' ? 0.35 : 1)
        nahledMaterial.color.set(platny ? '#62e4a0' : '#ff6868')
      }
      if (platny !== platnyPosledne) { platnyPosledne = platny; setNahledPlatny(platny) }
      if (potvrditRef.current) {
        potvrditRef.current = false
        if (platny && aktivni) {
          const uspesne = aktivni.typ
            ? useVillageStore.getState().postav(aktivni.typ, x, z)
            : useVillageStore.getState().presun(aktivni.id!, x, z)
          if (uspesne) { aktivniNahledRef.current = null; setNahledPlatny(false) }
        }
      }

      if (!bezi) return
      smycka = requestAnimationFrame(krok)

      const dt = Math.min((ted - posledniCas) / 1000, 0.1)
      posledniCas = ted
      const casMs = ted
      bojoveEfekty.krok(dt)
      // Pomalá lokální procházka. Každý obyvatel se drží v okruhu
      // svého výchozího místa, mimo bojové zóny.
      for (const npc of obyvatele) {
        const faze = klidnyRezim ? 0 : ted * 0.00028 + npc.faze
        npc.skupina.position.x = npc.def.x + Math.cos(faze) * 0.65
        npc.skupina.position.z = npc.def.z + Math.sin(faze) * 0.65
        npc.skupina.rotation.y = -faze
      }
      const nejblizsi = obyvatele.find(npc =>
        Math.hypot(npc.skupina.position.x - hracPozice.x, npc.skupina.position.z - hracPozice.z) < 2.5)
      const npcId = nejblizsi?.def.id ?? ''
      if (npcId !== posledniNpcId) {
        posledniNpcId = npcId
        setBlizkyObyvatel(nejblizsi?.def ?? null)
      }

      fpsPocetSnimku++
      if (ted - fpsOknoOdMs >= 1000) {
        fpsAktualni = fpsPocetSnimku
        fpsPocetSnimku = 0
        fpsOknoOdMs = ted
      }

      if (!jeMrtvyHrac(hracStavRef.current)) {
        const dopredny = { x: Math.sin(yaw), z: Math.cos(yaw) }
        // appčin "pravy" vektor appka počítá stejně jako Buddyheimovo
        // usePlayerWorld.ts (pravy.crossVectors(dopredny, nahoru), tady
        // bez Threejs objektu) — appka ho dřív měla s obráceným
        // znaménkem (cross(nahoru, dopredny) místo cross(dopredny,
        // nahoru)), což appku na appčině kameře obracelo doprava/doleva:
        // appčin joystick doprava appku posouval na appčině obrazovce
        // doleva, a appčin joystick doleva naopak doprava. Appčino
        // dopředu/dozadu bylo appkou celou dobu správně.
        const pravy = { x: -dopredny.z, z: dopredny.x }

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

        if (sberPozadavekRef.current) {
          sberPozadavekRef.current = false
          const nyni = performance.now()
          const nejblizsi = suroviny
            .filter((uzel) => nyni >= uzel.dostupneOd)
            .map((uzel) => ({ uzel, vzd: Math.hypot(uzel.x - hracPozice.x, uzel.z - hracPozice.z) }))
            .sort((a, b) => a.vzd - b.vzd)[0]
          const otevrene = useVillageStore.getState().otevrenePoklady
          const truhla = truhly
            .filter(({ poklad }) => !otevrene.includes(poklad.id))
            .map((t) => ({ ...t, vzd: Math.hypot(t.poklad.x - hracPozice.x, t.poklad.z - hracPozice.z) }))
            .sort((a, b) => a.vzd - b.vzd)[0]
          // Jediné tlačítko interakce: vždy vybere nejbližší dostupný objekt.
          if (truhla && truhla.vzd <= 2.4 && (!nejblizsi || truhla.vzd <= nejblizsi.vzd)) {
            useVillageStore.getState().otevriPoklad(truhla.poklad.id)
          } else if (nejblizsi && nejblizsi.vzd <= 2.4) {
            useVillageStore.getState().seberSurovinu(nejblizsi.uzel.typ)
            nejblizsi.uzel.dostupneOd = nyni + (nejblizsi.uzel.typ === 'krystaly' ? 45_000 : 15_000)
          }
        }
        const casSberu = performance.now()
        for (const uzel of suroviny) uzel.mesh.visible = casSberu >= uzel.dostupneOd
        const otevreneTruhly = useVillageStore.getState().otevrenePoklady
        for (const truhla of truhly) truhla.mesh.visible = !otevreneTruhly.includes(truhla.poklad.id)
        // Kontrola pouze 2× za sekundu; záznam a odměna se ukládají jednorázově.
        if (ted - posledniKontrolaObjeveniMs >= 500) {
          posledniKontrolaObjeveniMs = ted
          const osada = useVillageStore.getState()
          const nova = noveObjevenaOblast(hracPozice, osada.objeveneOblasti)
          if (nova) osada.objevOblast(nova)
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

        // Hoření Ember: dotikává po sekundách, nemůže samo udělit finální úder.
        for (const slot of sloty) {
          const hori = emberHoreniRef.current.get(slot.def.id)
          if (!hori) continue
          if (slot.runtime.faze === 'mrtvy' || slot.runtime.hp <= 0) {
            emberHoreniRef.current.delete(slot.def.id)
            continue
          }
          const vysledek = krokHoreni(hori, casMs, slot.runtime.hp)
          slot.runtime = { ...slot.runtime, hp: vysledek.hp }
          if (vysledek.stav) emberHoreniRef.current.set(slot.def.id, vysledek.stav)
          else emberHoreniRef.current.delete(slot.def.id)
        }

        // --- běžné nepřátele — appka je zmrazí/schová, dokud
        // probíhá souboj s bossem ---
        for (const slot of sloty) {
          slot.mesh.skupina.visible = !bossAktivni && slot.runtime.faze !== 'mrtvy'
          if (bossAktivni) continue

          slot.runtime = krokAI(
            slot.runtime, slot.def, hracPozice,
            dt * frostNasobicRychlosti(casMs, frostZpomaleniRef.current.get(slot.def.id) ?? 0)
          )

          const utokSlotu = pokusUtokNepritele(slot.runtime, slot.def, casMs)
          slot.runtime = utokSlotu.nepritel
          if (utokSlotu.provedeno) {
            zpusobPoskozeniHraci(utokSlotu.poskozeni)
          }

          if (melByRespawnovat(slot.runtime, casMs)) {
            emberHoreniRef.current.delete(slot.def.id)
            frostZpomaleniRef.current.delete(slot.def.id)
            slot.runtime = vytvorNepritelRuntime(slot.def.id, slot.def.maxHp, poziceVOblasti(slot.oblastId))
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
            const utokHrace = pokusUtokHrace(bossRef.current, vzdKBossovi, posledniUtokHraceRef.current, casMs, Math.random, zbranRef.current)
            if (utokHrace.provedeno) {
              posledniUtokHraceRef.current = casMs
              bojoveEfekty.utok(zbranRef.current, hrac.position, new THREE.Vector3(bossRef.current.pozice.x, 0, bossRef.current.pozice.z))
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
              const utokHrace = pokusUtokHrace(cilovySlot.runtime, nejmensiVzd, posledniUtokHraceRef.current, casMs, Math.random, zbranRef.current)
              if (utokHrace.provedeno) {
                posledniUtokHraceRef.current = casMs
                bojoveEfekty.utok(zbranRef.current, hrac.position, new THREE.Vector3(cilovySlot.runtime.pozice.x, 0, cilovySlot.runtime.pozice.z))
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

        // Buddyho aktivní schopnost: zasáhne nejbližší živý cíl, maximálně jednou za 12 sekund.
        if (buddySkillPozadavekRef.current) {
          buddySkillPozadavekRef.current = false
          if (!jeMrtvyHrac(hracStavRef.current)) {
            if (bossAktivni) {
              if (buddySkillPripraven(casMs, buddySkillPosledniMsRef.current, vzdKBossovi, bossRef.current.hp > 0, maskot.id)) {
                const vysledek = buddySkillZasah(bossRef.current, casMs, hracStavRef.current.level, maskot.id)
                bossRef.current = vysledek.cil as BossRuntimeStav
                buddySkillPosledniMsRef.current = casMs
                bojoveEfekty.buddy(hrac.position, new THREE.Vector3(bossRef.current.pozice.x, 0, bossRef.current.pozice.z), maskot.id)
                if (maskot.id === 'moss') hracStavRef.current = mossUzdraveni(hracStavRef.current)
                if (vysledek.porazen) {
                  vitezstviDoMs = casMs + 1400
                  hracStavRef.current = pripocistXp(hracStavRef.current, bossDef.odmenaXp)
                  onZabitiBosse(bossDef.odmenaXp)
                }
              }
            } else {
              const kandidati = sloty.filter(slot => slot.runtime.faze !== 'mrtvy')
                .map(slot => ({ slot, vzd: vzdalenost2D(hracPozice, slot.runtime.pozice) }))
                .sort((a, b) => a.vzd - b.vzd)
              const nejblizsi = kandidati[0]
              if (nejblizsi && buddySkillPripraven(casMs, buddySkillPosledniMsRef.current, nejblizsi.vzd, true, maskot.id)) {
                const vysledek = buddySkillZasah(nejblizsi.slot.runtime, casMs, hracStavRef.current.level, maskot.id)
                nejblizsi.slot.runtime = vysledek.cil
                nejblizsi.slot.hitDoMs = casMs + 350
                buddySkillPosledniMsRef.current = casMs
                bojoveEfekty.buddy(hrac.position, new THREE.Vector3(nejblizsi.slot.runtime.pozice.x, 0, nejblizsi.slot.runtime.pozice.z), maskot.id)
                if (maskot.id === 'moss') hracStavRef.current = mossUzdraveni(hracStavRef.current)
                if (maskot.id === 'ember' && !vysledek.porazen) {
                  emberHoreniRef.current.set(nejblizsi.slot.def.id, zacniHoreni(casMs))
                }
                if (maskot.id === 'frost' && !vysledek.porazen) {
                  frostZpomaleniRef.current.set(nejblizsi.slot.def.id, casMs + FROST_ZPOMALENI_MS)
                }
                if (vysledek.porazen) {
                  vitezstviDoMs = casMs + 1400
                  hracStavRef.current = pripocistXp(hracStavRef.current, nejblizsi.slot.def.odmenaXp)
                  onZabitiNepritele(nejblizsi.slot.def.odmenaXp)
                }
              }
            }
          }
        }
        const zbyvaBuddy = Math.max(0, Math.ceil((buddySkillPosledniMsRef.current + cooldownProMaskota(maskot.id) - casMs) / 1000))
        if (zbyvaBuddy !== buddySkillCooldownRef.current) {
          buddySkillCooldownRef.current = zbyvaBuddy
          setBuddySkillCooldown(zbyvaBuddy)
        }

        // --- vykreslení běžných nepřátel ---
        let vBojiNekdo = false
        for (const slot of sloty) {
          slot.mesh.skupina.position.set(slot.runtime.pozice.x, 0, slot.runtime.pozice.z)
          const zije = slot.runtime.faze !== 'mrtvy' && slot.runtime.hp > 0
          const horiciAura = slot.mesh.skupina.getObjectByName('buddy-ember-burn') as THREE.Mesh | undefined
          const ledovaAura = slot.mesh.skupina.getObjectByName('buddy-frost-slow') as THREE.Mesh | undefined
          const hori = zije && emberHoreniRef.current.has(slot.def.id)
          const mrzne = zije && casMs < (frostZpomaleniRef.current.get(slot.def.id) ?? 0)
          if (horiciAura) {
            horiciAura.visible = hori
            if (hori) {
              horiciAura.rotation.z = Math.sin(casMs * 0.006) * 0.25
              horiciAura.scale.setScalar(1 + Math.sin(casMs * 0.013) * 0.13)
            }
          }
          if (ledovaAura) {
            ledovaAura.visible = mrzne
            if (mrzne) ledovaAura.rotation.z = casMs * 0.0008
          }
          if (!mrzne && frostZpomaleniRef.current.has(slot.def.id)) frostZpomaleniRef.current.delete(slot.def.id)
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
        hracPozice = { ...HRAC_SPAWN_POZICE }
        obranaAktivniDoMsRef.current = -Infinity
        obranaCooldownDoMsRef.current = -Infinity
        bossRef.current = obnovBosse(bossDef.id, bossDef.maxHp, BOSS_HAJ_POZICE)
        for (const slot of sloty) {
          slot.runtime = vytvorNepritelRuntime(slot.def.id, slot.def.maxHp, poziceVOblasti(slot.oblastId))
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

      const jePripravenPro = (nepritel: NepritelRuntimeStav, vzd: number): boolean =>
        nepritel.faze !== 'mrtvy' &&
        muzeUtokZbrani(zbranRef.current, hracStavRef.current.level, vzd, posledniUtokHraceRef.current, casMs)
      const utokPripravenNyni = bossAktivniProHud
        ? jePripravenPro(bossRef.current, vzdalenost2D(hracPozice, bossRef.current.pozice))
        : cilNepritele
          ? jePripravenPro(cilNepritele.runtime, vzdalenost2D(hracPozice, cilNepritele.runtime.pozice))
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
        diagnostika: import.meta.env.DEV
          ? {
              sirkaPlatna: container.clientWidth,
              vyskaPlatna: container.clientHeight,
              pocetDekoraciStromy: dekoraceStromy.length,
              pocetDekoraciKameny: dekoraceKameny.length,
              fps: fpsAktualni,
              stavAssetu: { ...stavGlbAssetu },
            }
          : undefined,
      }

      if (hudSeZmenil(hudRef.current, novyHud)) {
        hudRef.current = novyHud
        setHud(novyHud)
      }

      // Minimapa: React aktualizujeme nejvýše 5× za sekundu, nikoliv každý snímek.
      if (ted - posledniMinimapaMs >= 200) {
        posledniMinimapaMs = ted
        setPoziceHrace({ x: hracPozice.x, z: hracPozice.z })
      }
      renderer.render(scene, camera)
    }
    smycka = requestAnimationFrame(krok)

    return () => {
      odpojeno = true
      bezi = false
      cancelAnimationFrame(smycka)
      observer.disconnect()
      odhlasStavby()
      odhlasUmistene()
      document.removeEventListener('visibilitychange', onVisibility)
      container.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)

      bojoveEfekty.uklidit()
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

  return { containerRef, selhalo, nastavJoystick, utocit, pouzijBuddySchopnost, buddySkillCooldown, zvolZbran, obranit, sebrat, postavit, presunout, potvrditStavbu, zrusitNahled, otocitNahled, nahledPlatny, vyzvatBosse, obnovitPoSmrti, hud, blizkyObyvatel, poziceHrace }
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
  (stary.bossFocus?.zuri ?? null) !== (novy.bossFocus?.zuri ?? null) ||
  // appka v produkci má diagnostika vždy undefined na obou stranách
  // (undefined !== undefined je false), takže tahle appka řádka tam
  // žádný extra re-render nevynutí — jen v dev buildu appka jednou
  // za sekundu doopravdy aktualizuje FPS v HUD.tsx.
  (stary.diagnostika?.fps ?? null) !== (novy.diagnostika?.fps ?? null)
