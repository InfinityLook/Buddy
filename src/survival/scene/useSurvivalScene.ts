import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SurvivalHerniStav } from '../types'
import { MONSTRA } from '../data/monsters'
import { ARENA_POLOMER } from '../engine/engine'

// ==========================================
// Survival Night — 3D aréna "Dark Forest" (bod 5 zadání). Čistý
// Three.js mimo React, stejná zásada vlastnictví jako appčiny další
// tři herní scény (social/scene/useAmbientScene.ts, game/explorace/
// usePlayerWorld.ts, fighting/arena/useSoubojScene.ts): hook si sám
// postaví renderer/scénu/kameru, uklidí ji při odchodu, React dostane
// jen canvas (containerRef) a jednu imperativní metodu.
//
// Nepřátelé jsou SKUTEČNÉ 3D objekty ve scéně (bod 26 zadání: appka
// nesmí kreslit stovky DOM elementů) — jeden InstancedMesh NA TYP
// monstra (8 typů + samostatný Mesh pro bosse, kterého je vždycky
// nejvýš jeden), pozice se každý snímek přepočítávají přímo do matic
// instancí, ne přes React re-render.
//
// Postavy/monstra/boss mají SKUTEČNOU grafiku (Kenney sprity, viz
// public/survival/**, stejný "najdi free asset pack na GitHub
// mirroru" postup jako Souboj vlastní PostavaGrafika.tsx): hráč, 8
// monster a boss jsou textované billboardy — jedna THREE.PlaneGeometry
// na typ (rozměry ze SDÍLENÉHO ořezu přes celou animační sadu, viz
// ANIMACE_* níž — appka NEOŘEZÁVÁ každý snímek zvlášť podle jeho
// vlastního obsahu, protože by pak postava mezi snímky animace mírně
// "poskočila", jak se u chůze mění rozpětí končetin).
//
// KAMERA JE SKUTEČNÁ PRVNÍ OSOBA — appčina dřívější "přes rameno"
// (viz předchozí verze tohohle souboru/CLAUDE.md) byla appčino vlastní
// AskUserQuestion rozhodnutí, ale uživatel ji po vyzkoušení přímo
// odmítl ("ovládání hry je na prd... kamera taky radši ať viděl z
// první osoby") — appka se tentokrát NEPTALA přes AskUserQuestion,
// žádost byla jednoznačná, rovnou to opravila. Kamera sedí PŘESNĚ
// v hráčově pozici ve výšce očí (VYSKA_OCI), žádné odsazení dozadu ani
// lerp na POZICI kamery — appka ji nechává BÝT hráčovýma očima, ne
// kamerou, co ho z dálky sleduje a dohání. appčino vlastní tělo appka
// proto vůbec nevykresluje (stejná "v první osobě nevidíš sám sebe"
// zásada jako appčin Souboj's vlastní Fáze 10) — zůstává jen bodové
// světlo kolem hráče jako osobní "záře" v tmavém lese.
//
// Skutečná oprava "joystick jako pohyb" (appčina druhá výtka) NENÍ ve
// vstupu samotném (VirtualniJoystick.tsx appka nezměnila — jeho x/z
// výstup je správně normalizovaný, appka ho ověřila proti tomu, jak
// stejnou komponentu používá game/explorace/usePlayerWorld.ts) ani
// v tom, JAK engine vstup aplikuje (pořád přímo na světovou pozici,
// beze změny, viz engine.ts's krokHry) — je v tom, jak POMALU appčina
// kamera/natočení dohánělo směr, kterým se hráč zrovna hýbe. Appka
// odvozuje natočení z poziční delty pohybu (dx/dz mezi snímky), ne
// z čistého vstupu, a dřívější pomalý lerp (RYCHLOST_NATOCENI = 6,
// plné otočení ~0.4-0.6s) znamenal, že se natočení "dohání" za
// pohybem, který appčin engine aplikuje OKAMŽITĚ (appka nemá
// setrvačnost pohybu) — appka tak viděla jinam, než doopravdy šla, po
// dobu, než se kamera dotočila. V "přes rameno" to vypadalo jako
// plovoucí zpoždění, v první osobě (appka nemá druhý, tažením
// ovládaný pohled — jen jeden joystick) by to byl doslova pocit
// "appka jde jinam, než se dívá", což appka opravila zrychlením
// natáčení skoro na okamžité (RYCHLOST_NATOCENI = 24, plné otočení za
// pár snímků) — appka ho nenechala doslova nulové, ať appka nemá
// robotické "cuknutí" při každé změně směru, ale žádné znatelné
// zpoždění mezi pohybem a pohledem už zůstat nesmí.
//
// billboardKvaternion appka POŘÁD přepočítává KAŽDÝ SNÍMEK
// (zkopírováním camera.quaternion) — appčina kamera se pořád otáčí
// podle toho, kam hráč jde, jen teď sedí přímo v jeho pozici místo
// za ním.
//
// DRUHÁ, PRAVÁ příčina "joystick jako pohyb" (uživatelovo druhé
// nahlášení, po tomhle souboru): appčin výchozí směr pohledu (dřív -Z,
// Three.js's vlastní kamerová konvence) nesouhlasil s tím, kam
// engine.ts's krokHry doopravdy posílá kladný vstup ze joysticku
// nahoru (+Z, ne -Z — appka to tam nikdy nezměnila, engine zůstává
// čistý/kamera-agnostický). Než appčino dohánějící natočení stihlo
// kameru dotočit, appka viděla přesně opačně, než kam se hráč zrovna
// pohnul — "nahoru = dozadu, dolů = dopředu". Appka teď počáteční
// směr (smerFacingZ i initial camera.lookAt, viz níž) sjednotila na
// +Z, appčinu skutečnou konvenci "dopředu".
//
// Kenney sprity jsou vybrané "nejbližší dostupný vzhled, ne doslovná
// shoda" (stejná zásada jako Souboj kdysi Robot→Bulwark) — appčin mirror
// (github.com/shorepine/kenney) nemá žádný "monstrum/příšera" balíček,
// jen hotové "Enemy sprites" z platformerové sady: crawler→spider (🕷️,
// doslovná shoda), wolf→snake (nejrychlejší dostupný pozemní tvor bez
// psí siluety), bat→bat (🦇, doslovná shoda), shambler→slimeBlock
// (hranaté/těžkopádné, sedí na pomalého "šouravého" zombíka), mage→
// spinner (jediný "magicky" vypadající rotující tvar v balíčku),
// hunter→piranha (útočný lovec, "bite" animace), demon→barnacle
// (nejtrnitější/nejagresivnější tvar pro epický stupeň), eater→ghost
// (👻, sedí přesně na vlastní emoji "Soul Eater"). Boss (Shadow Wolf)
// dostal snakeLava — velký, ohnivě zbarvený had, vizuálně odlišný od
// obyčejného "wolf" hada, ale tematicky navazující. Appka NEBARVÍ
// sprity přes MonstrumDef.barva navrch — každý typ má vlastní, dost
// odlišnou paletu už ze samotné kresby, druhá vrstva tónování by ji jen
// kalila.
//
// ANIMACE (appčino "co dál" — zkusit najít animované varianty): stejný
// Kenney zdroj u většiny monster nabízí i druhou/třetí pózu (chůze,
// útok, rotace) — appka mezi nimi přepíná, ale VŽDY PER TYP, ne per
// instanci (jeden InstancedMesh sdílí jednu texturu pro VŠECHNY svoje
// instance najednou — appka nemá per-instance UV/shader, aby dokázala
// desynchronizovat chůzi každého jedince zvlášť). Menší věrnost než
// skutečná chůze, ale poctivý kompromis dané architektuře — celý typ
// "mrská" pózou najednou, s malým fázovým posunem podle pořadí typu, ať
// aspoň nemrskají všechny typy současně. shambler (slimeBlock) v appčině
// Kenney zdroji žádnou druhou pózu nemá — zůstává statický, appka si
// druhou nevymýšlí. Hráč (Ranger) svůj běžecký cyklus (3 snímky, Kenney
// "Male adventurer" run0-2) po přechodu na první osobu ztratil úplně —
// appka appčino vlastní tělo vůbec nevykresluje (viz komentář u kamery
// výš), takže ranger*.png soubory zůstávají na disku nepoužité, appka
// je nemazala (appka je klidně může znovu potřebovat, vrátí-li se
// někdy appka k třetí osobě — stejná "nech nepoužité pro budoucí
// návrat" zásada jako appčiny jiné mrtvé CSS třídy jinde v appce).
//
// PROSTŘEDÍ: zem/hriště dostaly procedurálně vygenerovanou plátěnou
// (CanvasTexture) skvrnitou texturu místo ploché barvy — appčin Kenney
// mirror nemá žádný skutečně bezešvě opakovatelný trávový/hlínový
// čtverec (jeho izometrické dlaždice jsou nakreslené jako kosočtverečné
// "kostky" pro jiný typ kamery a jejich RepeatWrapping na kruhové ploše
// by ukázal viditelné mezery průhlednosti mezi kachlemi) — appka místo
// riskování špatně padnoucí textury postavila vlastní, zaručeně
// bezešvě dlaždicovatelnou (okrajové skvrny se zabalují na protější
// stranu), stejná "žádná knihovna, appka to umí sama a levně" zásada
// jako appčiny jiné procedurální efekty (konfety, waveform, admin
// panelu sloupcové grafy). Stromy/kameny naopak DOSTALY skutečné Kenney
// sprity (izometrický "Nature Pack" balíček) — jako ploché billboardy,
// stejnou technikou jako postavy/monstra, jen bez animace (appka
// přidala i dvě nové odrůdy dekorace navíc — keř a hříbky — a staré
// ploty jako "ruiny" pro víc rozmanitosti, appčino potvrzené zadání).
// Obloha dostala měsíc + hvězdné pole (appka nemá skutečný skybox
// asset, obojí je procedurální — koule/Points, `fog: false`, ať appčina
// mlha, co končí na ARENA_POLOMER * 2.1, oblohu nepohltí).
//
// Health Orb/Potion pickupy (appčino "co ještě zbývá" — engine/engine.ts's
// vlastní spawnujPickupPodleCasu/sebratPickupy) dostaly stejnou "jeden
// InstancedMesh na typ" léčbu jako nepřátelé, jen s podstatně menší
// kapacitou (appka jich má na zemi nejvýš MAX_PICKUPU_NA_ARENE = 3
// najednou) — appka nechce druhý, nezávislý styl vykreslování jen
// proto, že jde o mnohem míň objektů.
// ==========================================

const KAPACITA_NA_TYP = 40
const PICKUP_KAPACITA = 4

// Kamera v první osobě — appka ji drží PŘESNĚ v hráčově pozici ve
// výšce očí, žádné odsazení dozadu ani samostatná rychlost pro pozici
// kamery (viz komentář v hlavičce souboru).
const VYSKA_OCI = 1.55
const DOHLED_DOPREDU = 5.5
// Appka natáčení zrychlila ze 6 (appčina dřívější "přes rameno"
// hodnota, plné otočení ~0.4-0.6s) na 24 (plné otočení za pár snímků)
// — appka natočení chce prakticky OKAMŽITÉ, protože zpoždění mezi
// "kam appka jde" a "kam appka vidí" je přesně to, na co si uživatel
// stěžoval (viz komentář v hlavičce souboru).
const RYCHLOST_NATOCENI = 24
const ZORNE_POLE_FPS = 70
// Minimální pohyb za snímek, aby appka vůbec přepočítávala natočení —
// pod touhle hranicí appka drží POSLEDNÍ známý směr (stejný "dívej se,
// kam jsi šel, ne kam se náhodou chvěješ" idiom jako appčin Souboj's
// vlastní natoceni z Fáze 14).
const PRAH_POHYBU = 0.0015

const MONSTRUM_IDS = Object.keys(MONSTRA)

// Poměr stran (šířka/výška) SDÍLENÉHO ořezu přes celou animační sadu
// daného typu (idle + všechny alternativní pózy) — appka NEMĚŘÍ každý
// PNG zvlášť, protože jednotlivé pózy chůze/útoku mají jinak rozložené
// končetiny a nezávislý ořez by mezi snímky animace vizuálně "poskočil".
const POMER_STRAN_MONSTRA: Record<string, number> = {
  crawler: 77 / 53,
  wolf: 63 / 23,
  bat: 88 / 47,
  shambler: 51 / 50,
  mage: 63 / 62,
  hunter: 45 / 60,
  demon: 51 / 58,
  eater: 51 / 73,
}
const POMER_STRAN_BOSS = 53 / 147

/** Výška billboardu z appčina vlastního `polomer` (kapsle to dřív měla
 *  podobně — poloměr + délka), ne z pixelové velikosti PNG. */
const vyskaZPolomeru = (polomer: number) => Math.max(0.9, polomer * 3)

/** Kolikrát za sekundu appka přepíná animační snímek — společné pro
 *  hráče/monstra/bosse, ať appka nemá tři nezávisle vyladěné rychlosti
 *  pro tři různé věci, které dělají v podstatě totéž. */
const INTERVAL_ANIMACE_S = 0.28

/** Animační sada NA TYP monstra — appka je přepíná po celé skupině
 *  instancí najednou (viz vysvětlení nahoře v hlavičce souboru), ne
 *  per instanci. Typ bez záznamu (shambler) zůstává statický. */
const ANIMACE_MONSTER: Record<string, string[] | undefined> = {
  crawler: ['crawler.png', 'crawler_walk1.png', 'crawler_walk2.png'],
  wolf: ['wolf.png', 'wolf_walk.png'],
  bat: ['bat.png', 'bat_fly.png'],
  mage: ['mage.png', 'mage_spin.png'],
  hunter: ['hunter.png', 'hunter_down.png'],
  demon: ['demon.png', 'demon_bite.png'],
  eater: ['eater.png', 'eater_normal.png'],
}
const ANIMACE_BOSS = ['boss.png', 'boss_ani.png']

/** Který snímek animační sady se má právě zobrazit — appka dává
 *  každému TYPU malý fázový posun (`offsetS`), ať aspoň netrhají pózu
 *  všechny typy přesně ve stejném okamžiku. */
const indexAnimace = (cas: number, offsetS: number, pocetSnimku: number) =>
  Math.floor((cas + offsetS) / INTERVAL_ANIMACE_S) % Math.max(1, pocetSnimku)

/** Druh dekorace prostředí — appčin Kenney "Isometric Nature" balíček
 *  (viz public/survival/prostredi/**), vybrané "nejbližší dostupný
 *  vzhled" (appka nenašla popisky, jen prohlédla vzorek souborů):
 *  strom_a/b/c tři různé stromy, kamen_a/b dva různé balvany, ker keř,
 *  houba malá hříbková skupinka, plot pozůstatek starého plotu jako
 *  "ruina". Váhy určují, jak často se který druh vylosuje — appka chce
 *  hlavně stromy/kameny (jako dřív), zbytek jen jako doplněk pro víc
 *  rozmanitosti (appčino potvrzené zadání). */
interface DruhDekorace {
  id: string
  vaha: number
  vyska: number
}
const DRUHY_DEKORACI: DruhDekorace[] = [
  { id: 'strom_a', vaha: 3, vyska: 3.0 },
  { id: 'strom_b', vaha: 3, vyska: 3.6 },
  { id: 'strom_c', vaha: 3, vyska: 3.0 },
  { id: 'kamen_a', vaha: 2, vyska: 1.3 },
  { id: 'kamen_b', vaha: 2, vyska: 0.9 },
  { id: 'ker', vaha: 2, vyska: 1.1 },
  { id: 'houba', vaha: 1, vyska: 0.5 },
  { id: 'plot', vaha: 1, vyska: 1.0 },
]
const POMER_STRAN_DEKORACI: Record<string, number> = {
  strom_a: 125 / 248,
  strom_b: 91 / 304,
  strom_c: 75 / 243,
  kamen_a: 56 / 101,
  kamen_b: 42 / 41,
  ker: 125 / 171,
  houba: 31 / 31,
  plot: 97 / 95,
}
const CELKOVA_VAHA_DEKORACI = DRUHY_DEKORACI.reduce((s, d) => s + d.vaha, 0)
const vyberDruhDekorace = (): DruhDekorace => {
  let r = Math.random() * CELKOVA_VAHA_DEKORACI
  for (const d of DRUHY_DEKORACI) {
    if (r < d.vaha) return d
    r -= d.vaha
  }
  return DRUHY_DEKORACI[0]
}

/** Procedurální, ZARUČENĚ bezešvě dlaždicovatelná skvrnitá textura —
 *  appka zabaluje skvrny blízko okraje na protější stranu plátna, ať
 *  RepeatWrapping nikde neukáže viditelný šev. Stejná "žádná knihovna,
 *  appka to umí sama" zásada jako appčiny jiné procedurální efekty. */
const vytvorTexturuSumu = (
  velikost: number,
  barvaZakladu: string,
  barvaSkvrny: string,
  pocetSkvrn: number
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = velikost
  canvas.height = velikost
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = barvaZakladu
    ctx.fillRect(0, 0, velikost, velikost)
    ctx.fillStyle = barvaSkvrny
    for (let i = 0; i < pocetSkvrn; i++) {
      const x = Math.random() * velikost
      const y = Math.random() * velikost
      const r = 1.5 + Math.random() * 5
      ctx.globalAlpha = 0.12 + Math.random() * 0.26
      const kresliBod = (ox: number, oy: number) => {
        ctx.beginPath()
        ctx.arc(ox, oy, r, 0, Math.PI * 2)
        ctx.fill()
      }
      kresliBod(x, y)
      if (x < r) kresliBod(x + velikost, y)
      if (x > velikost - r) kresliBod(x - velikost, y)
      if (y < r) kresliBod(x, y + velikost)
      if (y > velikost - r) kresliBod(x, y - velikost)
    }
    ctx.globalAlpha = 1
  }
  const textura = new THREE.CanvasTexture(canvas)
  textura.wrapS = THREE.RepeatWrapping
  textura.wrapT = THREE.RepeatWrapping
  textura.colorSpace = THREE.SRGBColorSpace
  return textura
}

interface UseSurvivalSceneResult {
  containerRef: React.RefObject<HTMLDivElement>
  selhalo: boolean
  /** Zavolat každý snímek z rAF smyčky vlastněné komponentou. */
  aktualizuj: (stav: SurvivalHerniStav) => void
}

export const useSurvivalScene = (): UseSurvivalSceneResult => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selhalo, setSelhalo] = useState(false)
  const stavRef = useRef<SurvivalHerniStav | null>(null)

  const aktualizuj = (stav: SurvivalHerniStav) => {
    stavRef.current = stav
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
    scene.background = new THREE.Color('#050810')
    scene.fog = new THREE.Fog('#050810', ARENA_POLOMER * 0.7, ARENA_POLOMER * 2.1)

    const camera = new THREE.PerspectiveCamera(
      ZORNE_POLE_FPS,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    )

    // --- textury: appka sbírá VŠECHNY vytvořené (i procedurální
    // CanvasTexture) do jednoho pole, ať je při odchodu doopravdy
    // uvolní — material.dispose() texturu, kterou drží, sám NEuvolní,
    // to je samostatný krok appka dřív dělala jen pro geometrii/
    // materiál (viz scene.traverse níž), textury unikaly. ---
    const vsechnyTextury: THREE.Texture[] = []
    const nacitac = new THREE.TextureLoader()
    const nactiTexturu = (url: string) => {
      const t = nacitac.load(url)
      t.colorSpace = THREE.SRGBColorSpace
      vsechnyTextury.push(t)
      return t
    }

    // --- světla — chladné noční ambientní + teplá záře od "měsíce" ---
    scene.add(new THREE.AmbientLight('#3d5490', 1.05))
    const mesicniSvetlo = new THREE.DirectionalLight('#c3d4f5', 0.85)
    mesicniSvetlo.position.set(-10, 20, -6)
    scene.add(mesicniSvetlo)
    const mesicniZar = new THREE.HemisphereLight('#5a76c2', '#0d1420', 0.6)
    scene.add(mesicniZar)

    // --- obloha: měsíc + hvězdné pole (appčino "lepší obloha" — appka
    // dřív měla jen mlhu a směrové světlo, žádný viditelný zdroj) —
    // `fog: false` na obojím, appčina mlha končí na ARENA_POLOMER * 2.1
    // ~= 31.5, měsíc ve vzdálenosti ~60+ by v ní úplně zmizel.
    //
    // Appčina kamera v první osobě se dívá VODOROVNĚ (žádný náklon
    // dolů jako dřívější "přes rameno") — appka proto drží měsíc
    // i hvězdy NÍZKO nad obzorem (appčin první pokus je dal příliš
    // vysoko/blízko zenitu a reálný screenshot je ukázal úplně mimo
    // zorné pole, appka to opravila podle skutečného úhlu kamery, ne
    // podle odhadu) — appka to při přechodu na první osobu znovu
    // ověřila screenshotem, ne jen dopočítala. ---
    const mesic = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 20, 20),
      new THREE.MeshBasicMaterial({ color: '#e9edf9', fog: false })
    )
    mesic.position.set(-30, 15, -52)
    scene.add(mesic)
    const zarMesice = new THREE.PointLight('#c3d4f5', 0.5, 260)
    zarMesice.position.copy(mesic.position)
    scene.add(zarMesice)

    const pocetHvezd = 420
    const poziceHvezd = new Float32Array(pocetHvezd * 3)
    for (let i = 0; i < pocetHvezd; i++) {
      const theta = Math.random() * Math.PI * 2
      const r = 70 + Math.random() * 45
      const vyska = 8 + Math.random() * 28
      poziceHvezd[i * 3] = Math.cos(theta) * r
      poziceHvezd[i * 3 + 1] = vyska
      poziceHvezd[i * 3 + 2] = Math.sin(theta) * r
    }
    const geometrieHvezd = new THREE.BufferGeometry()
    geometrieHvezd.setAttribute('position', new THREE.BufferAttribute(poziceHvezd, 3))
    const hvezdy = new THREE.Points(
      geometrieHvezd,
      new THREE.PointsMaterial({
        color: '#eef2ff',
        // sizeAttenuation: false — appka chce KONSTANTNÍ velikost v
        // pixelech bez ohledu na vzdálenost (appka se ke hvězdám nikdy
        // "nepřiblíží", jsou efektivně v nekonečnu); s attenuation by na
        // appčinu vzdálenost ~70-115 jednotek byly hvězdy pod 1px a
        // prakticky neviditelné.
        size: 2.2,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.85,
        fog: false,
      })
    )
    scene.add(hvezdy)

    // --- země — procedurální skvrnitá tráva, ne plochá barva; appčin
    // Kenney mirror nemá bezešvě opakovatelný čtverec (jeho izometrické
    // dlaždice jsou pro jiný typ kamery, RepeatWrapping by ukázal
    // mezery), tak appka postavila vlastní ---
    const texturaZeme = vytvorTexturuSumu(256, '#1c2c1a', '#26401f', 900)
    texturaZeme.repeat.set(9, 9)
    const zem = new THREE.Mesh(
      new THREE.CircleGeometry(ARENA_POLOMER * 1.4, 48),
      new THREE.MeshStandardMaterial({ map: texturaZeme, roughness: 1 })
    )
    zem.rotation.x = -Math.PI / 2
    scene.add(zem)

    // --- hrací plocha, o trochu odlišená texturou i tónem ---
    const texturaHriste = vytvorTexturuSumu(256, '#243a24', '#2e4a2c', 700)
    texturaHriste.repeat.set(6, 6)
    const hriste = new THREE.Mesh(
      new THREE.CircleGeometry(ARENA_POLOMER, 48),
      new THREE.MeshStandardMaterial({ map: texturaHriste, roughness: 1 })
    )
    hriste.rotation.x = -Math.PI / 2
    hriste.position.y = 0.01
    scene.add(hriste)

    // --- hranice arény — tenký svítící kruh, ať appka vidí okraj ---
    const hranice = new THREE.Mesh(
      new THREE.RingGeometry(ARENA_POLOMER - 0.15, ARENA_POLOMER + 0.15, 64),
      new THREE.MeshBasicMaterial({ color: '#35c4f0', transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    )
    hranice.rotation.x = -Math.PI / 2
    hranice.position.y = 0.02
    scene.add(hranice)

    // --- dekorace: skutečné texturované billboardy (Kenney "Isometric
    // Nature"), ne primitivní geometrie — appka drží JEDNU geometrii a
    // JEDEN materiál na DRUH dekorace (8 druhů), sdílené přes všechny
    // instance toho druhu; billboardové natočení celé SKUPINY appka
    // řeší jedním kvaternionem za snímek (`dekorace.quaternion`), ne
    // per objekt (viz krok() níž). ---
    const dekorace = new THREE.Group()
    scene.add(dekorace)
    const geometrieDekoraci: Record<string, THREE.PlaneGeometry> = {}
    const materialyDekoraci: Record<string, THREE.MeshBasicMaterial> = {}
    for (const druh of DRUHY_DEKORACI) {
      const sirka = druh.vyska * (POMER_STRAN_DEKORACI[druh.id] ?? 1)
      geometrieDekoraci[druh.id] = new THREE.PlaneGeometry(sirka, druh.vyska)
      materialyDekoraci[druh.id] = new THREE.MeshBasicMaterial({
        map: nactiTexturu(`/survival/prostredi/${druh.id}.png`),
        transparent: false,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      })
    }
    const POCET_DEKORACI = 60
    for (let i = 0; i < POCET_DEKORACI; i++) {
      const uhel = Math.random() * Math.PI * 2
      const polomer = ARENA_POLOMER * (0.75 + Math.random() * 0.6)
      const x = Math.cos(uhel) * polomer
      const z = Math.sin(uhel) * polomer
      const druh = vyberDruhDekorace()
      const mesh = new THREE.Mesh(geometrieDekoraci[druh.id], materialyDekoraci[druh.id])
      mesh.position.y = druh.vyska / 2
      if (Math.random() < 0.5) mesh.scale.x = -1
      const skupina = new THREE.Group()
      skupina.add(mesh)
      skupina.position.set(x, 0, z)
      dekorace.add(skupina)
    }

    // --- malé ohniště blízko okraje hřiště — teplá bodová záře
    // (skutečná 3D geometrie, ne billboard — kužel plamene vypadá
    // správně z libovolného úhlu, nemusí appka natáčet ke kameře) ---
    const ohniste = new THREE.Group()
    const ohnistePlamen = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 1.2 })
    )
    ohnistePlamen.position.y = 0.3
    ohniste.add(ohnistePlamen, new THREE.PointLight('#f59e0b', 1.6, 9))
    ohniste.position.set(ARENA_POLOMER * 0.55, 0, ARENA_POLOMER * 0.3)
    scene.add(ohniste)

    // --- pár náhrobků (hřbitov) opodál na druhé straně — stejným
    // důvodem jako ohniště zůstávají skutečná 3D geometrie ---
    const hrbitov = new THREE.Group()
    for (let i = 0; i < 5; i++) {
      const nahrobek = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.55, 0.12),
        new THREE.MeshStandardMaterial({ color: '#3a3f4a', roughness: 1 })
      )
      nahrobek.position.set((Math.random() - 0.5) * 3, 0.27, (Math.random() - 0.5) * 3)
      nahrobek.rotation.y = Math.random() * 0.4
      hrbitov.add(nahrobek)
    }
    hrbitov.position.set(-ARENA_POLOMER * 0.5, 0, -ARENA_POLOMER * 0.45)
    scene.add(hrbitov)

    // --- hráč — v první osobě appka vlastní tělo vůbec nevykresluje
    // (kamera sedí přímo v jeho pozici, viz komentář v hlavičce
    // souboru) — zůstává jen bodové světlo jako osobní "záře" kolem
    // hráče ---
    const hracSkupina = new THREE.Group()
    hracSkupina.add(new THREE.PointLight('#35c4f0', 1.1, 5))
    scene.add(hracSkupina)

    // --- nepřátelé: 1 InstancedMesh na typ, kapacita KAPACITA_NA_TYP —
    // geometrie i výchozí textura jsou per-typ (poměr stran sdíleného
    // ořezu animační sady); appka navíc pro typy s ANIMACE_MONSTER
    // předem načte VŠECHNY snímky a v krok() celý InstancedMesh (celou
    // skupinu instancí najednou, ne po jedné) přepíná mezi nimi ---
    const instanceNepratel: Record<string, THREE.InstancedMesh> = {}
    const vyskaNepratel: Record<string, number> = {}
    const texturyAnimaceMonster: Record<string, THREE.Texture[]> = {}
    MONSTRUM_IDS.forEach((id) => {
      const def = MONSTRA[id as keyof typeof MONSTRA]
      const vyska = vyskaZPolomeru(def.polomer)
      const sirka = vyska * (POMER_STRAN_MONSTRA[id] ?? 1)
      vyskaNepratel[id] = vyska
      const geometrie = new THREE.PlaneGeometry(sirka, vyska)

      const snimky = ANIMACE_MONSTER[id]
      let uvodniTextura: THREE.Texture
      if (snimky) {
        const textury = snimky.map((f) => nactiTexturu(`/survival/monstra/${f}`))
        texturyAnimaceMonster[id] = textury
        uvodniTextura = textury[0]
      } else {
        uvodniTextura = nactiTexturu(`/survival/monstra/${id}.png`)
      }

      const material = new THREE.MeshBasicMaterial({
        map: uvodniTextura,
        transparent: false,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.InstancedMesh(geometrie, material, KAPACITA_NA_TYP)
      mesh.count = 0
      scene.add(mesh)
      instanceNepratel[id] = mesh
    })

    // --- boss — samostatný, výrazně větší billboard (vždycky jen
    // jeden), taky se dvěma animačními snímky ---
    const bossVyska = 3.9
    const bossSirka = bossVyska * POMER_STRAN_BOSS
    const bossTextury = ANIMACE_BOSS.map((f) => nactiTexturu(`/survival/monstra/${f}`))
    const bossMaterial = new THREE.MeshBasicMaterial({
      map: bossTextury[0],
      transparent: false,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    })
    const bossMesh = new THREE.Mesh(new THREE.PlaneGeometry(bossSirka, bossVyska), bossMaterial)
    bossMesh.visible = false
    const bossHalo = new THREE.PointLight('#ef4444', 1.8, 10)
    bossHalo.visible = false
    scene.add(bossMesh, bossHalo)

    // --- billboard — kvaternion se teď přepočítává KAŽDÝ snímek
    // (zkopírováním camera.quaternion, viz krok()), protože appčina
    // kamera "přes rameno" mění úhel podle toho, kam hráč jde. Appka
    // ale pořád drží JEDEN sdílený THREE.Quaternion (ne nový objekt za
    // snímek/instanci) a jen ho v krok() přepisuje — hodnota pro úplně
    // první snímek (než vůbec existuje stav) odpovídá výchozímu směru
    // pohledu appka nastavuje kameře hned pod tím. ---
    // Appčin výchozí pohled MUSÍ mířit na +Z, ne na Three.js's obvyklé
    // výchozí -Z — engine.ts's krokHry aplikuje kladný vstupSmer.z
    // (joystick nahoru, viz VirtualniJoystick.tsx's vlastní komentář
    // "dy kladné = dolů = dozadu") jako pohyb k VĚTŠÍMU Z, ne menšímu.
    // Appka měla dřív -Z jako výchozí (Three.js's vlastní kamerová
    // konvence, "-Z je dopředu"), což ale nesouhlasilo s engine.ts's
    // vlastní, nezávisle zvolenou konvencí — výsledek: appka viděla
    // přesně OPAČNĚ, než kam se hráč skutečně pohnul, dokud appčino
    // dohánějící natočení (RYCHLOST_NATOCENI) nestihlo dorotovat kameru
    // — u prvního pohybu (spawn) i po každém pusť-a-znovu-zmáčkni to
    // vypadalo jako "nahoru = dozadu, dolů = dopředu", přesně nahlášená
    // chyba. Appka teď oba směry (počáteční smerFacingZ i počáteční
    // lookAt) sjednotila na appčinu SKUTEČNOU konvenci (+Z = dopředu),
    // ať appka od úplně prvního snímku vidí přesně tam, kam se hráč
    // zrovna hýbe, ne opačně.
    const billboardKvaternion = new THREE.Quaternion()
    camera.position.set(0, VYSKA_OCI, 0)
    camera.lookAt(0, VYSKA_OCI, DOHLED_DOPREDU)
    billboardKvaternion.copy(camera.quaternion)
    bossMesh.quaternion.copy(billboardKvaternion)
    dekorace.quaternion.copy(billboardKvaternion)

    // --- pickupy (Health Orb/Potion) — malé zářící koule, 1 InstancedMesh
    // na typ; appka je NEBILLBOARDUJE, sféra vypadá stejně z libovolného
    // úhlu ---
    const kvaternionIdentita = new THREE.Quaternion()
    const geometriePickup = new THREE.SphereGeometry(0.3, 12, 12)
    const materialOrb = new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 1.2 })
    const materialLektvar = new THREE.MeshStandardMaterial({ color: '#a855f7', emissive: '#a855f7', emissiveIntensity: 1.2 })
    const meshOrb = new THREE.InstancedMesh(geometriePickup, materialOrb, PICKUP_KAPACITA)
    meshOrb.count = 0
    const meshLektvar = new THREE.InstancedMesh(geometriePickup, materialLektvar, PICKUP_KAPACITA)
    meshLektvar.count = 0
    scene.add(meshOrb, meshLektvar)

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

    let smycka = 0
    let bezi = true
    const hodiny = new THREE.Clock()
    const matice = new THREE.Matrix4()
    const meritko = new THREE.Vector3(1, 1, 1)
    let posledniHracX = 0
    let posledniHracZ = 0
    let smerFacingX = 0
    // +1, ne -1 — appčina skutečná konvence "dopředu" je +Z (viz
    // komentář u počátečního camera.lookAt výš), tenhle výchozí směr
    // musí souhlasit s tím tam.
    let smerFacingZ = 1

    const krok = () => {
      if (!bezi) return
      smycka = requestAnimationFrame(krok)
      const dt = Math.min(hodiny.getDelta(), 0.1)
      const cas = hodiny.elapsedTime
      const stav = stavRef.current

      if (stav) {
        // --- hráč: pozice + odvození směru pohledu ---
        hracSkupina.position.x = stav.hrac.pozice.x
        hracSkupina.position.z = stav.hrac.pozice.z

        const dx = stav.hrac.pozice.x - posledniHracX
        const dz = stav.hrac.pozice.z - posledniHracZ
        posledniHracX = stav.hrac.pozice.x
        posledniHracZ = stav.hrac.pozice.z
        const delkaPohybu = Math.hypot(dx, dz)

        if (delkaPohybu > PRAH_POHYBU) {
          const cilX = dx / delkaPohybu
          const cilZ = dz / delkaPohybu
          const lerpN = Math.min(1, RYCHLOST_NATOCENI * dt)
          smerFacingX += (cilX - smerFacingX) * lerpN
          smerFacingZ += (cilZ - smerFacingZ) * lerpN
          const delkaSmeru = Math.hypot(smerFacingX, smerFacingZ) || 1
          smerFacingX /= delkaSmeru
          smerFacingZ /= delkaSmeru
        }
        // Jinak appka drží poslední smerFacingX/Z beze změny — "dívej
        // se, kam jsi šel", stejný idiom jako appčin Souboj.

        // --- kamera = hráčovy oči: PŘESNĚ jeho pozice, žádný lerp,
        // žádné odsazení dozadu (appčina bývalá "přes rameno" tohle
        // dolerpovávala, což byla přesně ta pomalu dohánějící kamera,
        // na kterou si uživatel stěžoval) — pohled kus PŘED hráče podle
        // odvozeného směru pohybu. ---
        camera.position.set(hracSkupina.position.x, VYSKA_OCI, hracSkupina.position.z)
        const cilPohleduX = hracSkupina.position.x + smerFacingX * DOHLED_DOPREDU
        const cilPohleduZ = hracSkupina.position.z + smerFacingZ * DOHLED_DOPREDU
        camera.lookAt(cilPohleduX, VYSKA_OCI, cilPohleduZ)

        // Billboard se přepočítává TADY, jednou za snímek, ne per
        // instanci — appka jen zkopíruje aktuální natočení kamery a
        // použije ho pro VŠECHNY roviny níž (nepřátelé/boss/dekorace —
        // appčino vlastní tělo appka nevykresluje, viz komentář
        // v hlavičce souboru), protože appčina kamera dynamicky mění
        // úhel.
        billboardKvaternion.copy(camera.quaternion)
        dekorace.quaternion.copy(billboardKvaternion)

        // --- nepřátelé podle typu ---
        const podleTypu: Record<string, typeof stav.aktivniNepratele> = {}
        for (const id of MONSTRUM_IDS) podleTypu[id] = []
        let boss: (typeof stav.aktivniNepratele)[number] | null = null

        for (const nepritel of stav.aktivniNepratele) {
          if (nepritel.jeBoss) {
            boss = nepritel
            continue
          }
          if (podleTypu[nepritel.defId]) podleTypu[nepritel.defId].push(nepritel)
        }

        MONSTRUM_IDS.forEach((id, typIndex) => {
          const mesh = instanceNepratel[id]
          const seznam = podleTypu[id].slice(0, KAPACITA_NA_TYP)
          mesh.count = seznam.length

          const snimky = texturyAnimaceMonster[id]
          if (snimky && seznam.length > 0) {
            const chtenaTextura = snimky[indexAnimace(cas, typIndex * 0.37, snimky.length)]
            const material = mesh.material as THREE.MeshBasicMaterial
            if (material.map !== chtenaTextura) {
              material.map = chtenaTextura
              material.needsUpdate = true
            }
          }

          const zakladniY = vyskaNepratel[id] / 2
          seznam.forEach((n, i) => {
            const houpani = klidnyRezim ? 0 : Math.sin(cas * 6 + i) * 0.05
            matice.compose(new THREE.Vector3(n.pozice.x, zakladniY + houpani, n.pozice.z), billboardKvaternion, meritko)
            mesh.setMatrixAt(i, matice)
          })
          mesh.instanceMatrix.needsUpdate = true
        })

        if (boss) {
          bossMesh.visible = true
          bossHalo.visible = true
          bossMesh.position.set(boss.pozice.x, bossVyska / 2, boss.pozice.z)
          bossHalo.position.set(boss.pozice.x, bossVyska * 0.3, boss.pozice.z)
          bossMesh.quaternion.copy(billboardKvaternion)

          const chtenaTexturaBoss = bossTextury[indexAnimace(cas, 0, bossTextury.length)]
          if (bossMaterial.map !== chtenaTexturaBoss) {
            bossMaterial.map = chtenaTexturaBoss
            bossMaterial.needsUpdate = true
          }

          if (!klidnyRezim) {
            bossMesh.scale.setScalar(1 + Math.sin(cas * 3) * 0.05)
          }
        } else {
          bossMesh.visible = false
          bossHalo.visible = false
        }

        // --- pickupy — jemné houpání nahoru/dolů, ať appka nevypadá
        // jako statická rekvizita položená na zemi ---
        const orby = stav.pickupy.filter((p) => p.typ === 'orb').slice(0, PICKUP_KAPACITA)
        const lektvary = stav.pickupy.filter((p) => p.typ === 'lektvar').slice(0, PICKUP_KAPACITA)
        meshOrb.count = orby.length
        orby.forEach((p, i) => {
          const houpani = klidnyRezim ? 0 : Math.sin(cas * 3 + i) * 0.15
          matice.compose(new THREE.Vector3(p.pozice.x, 0.6 + houpani, p.pozice.z), kvaternionIdentita, meritko)
          meshOrb.setMatrixAt(i, matice)
        })
        meshOrb.instanceMatrix.needsUpdate = true
        meshLektvar.count = lektvary.length
        lektvary.forEach((p, i) => {
          const houpani = klidnyRezim ? 0 : Math.sin(cas * 3 + i) * 0.15
          matice.compose(new THREE.Vector3(p.pozice.x, 0.6 + houpani, p.pozice.z), kvaternionIdentita, meritko)
          meshLektvar.setMatrixAt(i, matice)
        })
        meshLektvar.instanceMatrix.needsUpdate = true
      }

      renderer.render(scene, camera)
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
      vsechnyTextury.forEach((t) => t.dispose())
      texturaZeme.dispose()
      texturaHriste.dispose()

      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return { containerRef, selhalo, aktualizuj }
}
