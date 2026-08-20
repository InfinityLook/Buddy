import * as THREE from 'three'
import {
  MOUNTAIN_INNER,
  MOUNTAIN_OUTER,
  PALETTE,
  VALLEY_ANGLE,
  VALLEY_WIDTH,
  WALL_RADIUS,
} from '../constants'
import { DilGeometrie, matrixFor, mergeToMesh } from './merge'
import type { Random } from './random'

// ==========================================
// Obloha, světlo, terén a hory kolem města.
//
// Scéna má být západ slunce v horách: teplé světlo z jednoho směru,
// studené stíny a mlha, do které se vzdálené hory ztrácejí. Mlha tu
// není jen pro náladu — schová okraj terénu, takže nemusí být nekonečný.
// ==========================================

/**
 * Kam na obloze stojí slunce.
 *
 * Sdílí ho světlo i shader oblohy. Kdyby měl každý svůj, svítilo by
 * slunce odjinud, než odkud padají stíny — a to je vidět na první pohled.
 */
export const SMER_SLUNCE = new THREE.Vector3(-135, 85, -70).normalize()

/** Obloha jako velká koule s přechodem. Kreslí se zevnitř (BackSide). */
export const createSky = (): THREE.Mesh => {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      barvaHore: { value: new THREE.Color(PALETTE.oblohaHore) },
      barvaStred: { value: new THREE.Color(PALETTE.oblohaStred) },
      barvaDole: { value: new THREE.Color(PALETTE.oblohaDole) },
      barvaSlunce: { value: new THREE.Color(PALETTE.slunce) },
      smerSlunce: { value: SMER_SLUNCE },
    },
    vertexShader: `
      varying vec3 vSvet;
      void main() {
        vSvet = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    // Přechod se počítá z výšky bodu na kouli. Dvě míchání za sebou
    // dávají tři pásma: tmavý zenit, růžový střed a oranžový obzor.
    fragmentShader: `
      uniform vec3 barvaHore;
      uniform vec3 barvaStred;
      uniform vec3 barvaDole;
      uniform vec3 barvaSlunce;
      uniform vec3 smerSlunce;
      varying vec3 vSvet;
      void main() {
        vec3 smer = normalize(vSvet);

        // Obzor je na h = 0.5. Oranžová sahá kus nad něj, jinak by ji
        // schovaly hory a z celé oblohy zůstala jen fialová.
        float h = clamp(smer.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 barva = mix(barvaDole, barvaStred, smoothstep(0.50, 0.60, h));
        barva = mix(barva, barvaHore, smoothstep(0.60, 0.88, h));

        // Slunce: široká záře kolem a ostrý kotouč uvnitř. Bez ní je
        // obloha jen plochý přechod a nikde není poznat, odkud svítí.
        float kSlunci = max(dot(smer, smerSlunce), 0.0);
        barva = mix(barva, barvaSlunce, pow(kSlunci, 4.0) * 0.55);
        barva = mix(barva, barvaSlunce, smoothstep(0.9975, 0.9992, kSlunci));

        gl_FragColor = vec4(barva, 1.0);

        // Převod do výstupního barevného prostoru. Three.js ho svým
        // materiálům přidává sám, vlastnímu shaderu ale ne — bez tohohle
        // řádku se lineární hodnoty pošlou na obrazovku rovnou a západ
        // slunce vyjde jako kalná fialová místo oranžové.
        #include <colorspace_fragment>
      }
    `,
  })

  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 24), material)
  sky.name = 'obloha'
  // Obloha se chová jako pozadí: kreslí se první a bez testu hloubky,
  // takže ji nikdy nemůže nic "předběhnout". Bez toho stačilo, aby
  // kamera couvla dál než poloměr koule, a rovina země se vykreslila
  // přes ni — obzor pak byl ostrá čára uprostřed obrazovky.
  sky.material.depthTest = false
  sky.renderOrder = -1
  sky.frustumCulled = false
  return sky
}

/** Slunce, obloha jako druhý zdroj a mírné doplňkové světlo. */
export const createLighting = (): THREE.Object3D[] => {
  // Slunce nízko nad obzorem, ze stejné strany jako nejsvětlejší část
  // oblohy — jinak by stíny padaly na opačnou stranu, než odkud svítí.
  // Je posunuté i do strany: kdyby svítilo přesně zezadu, díval by se
  // hráč z výchozího pohledu jen na odvrácené, tedy černé stěny.
  const slunce = new THREE.DirectionalLight(PALETTE.slunce, 3.1)
  slunce.position.copy(SMER_SLUNCE).multiplyScalar(180)
  slunce.castShadow = true

  // Stínová kamera musí obepnout jen město. Kdyby pokrývala celou scénu
  // i s horami, stíny by na stejné rozlišení vyšly rozmazané.
  const s = slunce.shadow
  s.mapSize.set(1024, 1024)
  s.camera.near = 40
  s.camera.far = 340
  s.camera.left = -95
  s.camera.right = 95
  s.camera.top = 95
  s.camera.bottom = -95
  s.bias = -0.0006
  s.normalBias = 0.6

  // Obloha je hlavní výplňové světlo. Bez ní zůstane všechno, na co
  // slunce nedosvítí, úplně černé — a to je při západu slunce většina
  // města.
  const obloha = new THREE.HemisphereLight(PALETTE.oblohaDole, PALETTE.zemeSvetla, 1.7)
  const doplnek = new THREE.AmbientLight('#8f88b8', 0.8)

  // Slabý přísvit z opačné strany než slunce. Nevrhá stíny a jen zvedá
  // odvrácené stěny nad úroveň černé, aby na nich byl vidět tvar.
  const odraz = new THREE.DirectionalLight('#9fb6d8', 0.85)
  odraz.position.set(80, 40, 110)

  return [slunce, obloha, doplnek, odraz]
}

/** Rovina, na které město stojí. */
export const createGround = (): THREE.Mesh => {
  // Rovina musí sahat dál, než kam dohlédne mlha — pak její okraj splyne
  // s oparem a není z něj vidět kruh.
  const geometry = new THREE.CircleGeometry(2000, 64)
  geometry.rotateX(-Math.PI / 2)

  const ground = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: PALETTE.zemeSvetla, roughness: 1 })
  )
  ground.receiveShadow = true
  ground.name = 'zeme'
  return ground
}

/**
 * Zvednutá plošina, na které město sedí — okraj hradby tak nevisí ve vzduchu.
 *
 * Kolem její hrany jsou rozeseté balvany. Hladký kužel vypadal jako
 * dort na podnose; kámen z něj udělá skalní ostroh.
 */
export const createPlateau = (random: Random): THREE.Group => {
  const skupina = new THREE.Group()
  skupina.name = 'plosina'

  const plateau = new THREE.Mesh(
    new THREE.CylinderGeometry(WALL_RADIUS + 12, WALL_RADIUS + 20, 6, 48),
    new THREE.MeshStandardMaterial({ color: PALETTE.zemeSvetla, roughness: 1 })
  )
  plateau.position.y = -3
  plateau.receiveShadow = true
  skupina.add(plateau)

  const balvany: DilGeometrie[] = []
  const pocet = 54

  for (let i = 0; i < pocet; i++) {
    const uhel = (i / pocet) * Math.PI * 2 + random.rozsah(-0.05, 0.05)
    // Blízko k patě hradeb, ať čtou jako suť pod městem, a ne jako
    // kameny náhodně rozházené po louce.
    const vzdalenost = WALL_RADIUS + random.rozsah(7, 14)
    const velikost = random.rozsah(2.4, 5.8)

    balvany.push({
      geometry: new THREE.DodecahedronGeometry(velikost, 0),
      matrix: matrixFor(
        {
          x: Math.cos(uhel) * vzdalenost,
          // Zapuštěné do země: nad povrch vykoukne jen vršek, takže
          // balvan neleží na trávě jako odložený kámen.
          y: -velikost * random.rozsah(0.45, 0.75),
          z: Math.sin(uhel) * vzdalenost,
        },
        random.rozsah(0, Math.PI * 2),
        { x: 1, y: random.rozsah(0.5, 0.9), z: 1 }
      ),
    })
  }

  const skala = mergeToMesh(
    balvany,
    new THREE.MeshStandardMaterial({
      color: PALETTE.skala,
      roughness: 1,
      flatShading: true,
    })
  )
  if (skala) skupina.add(skala)

  return skupina
}

/**
 * Hory kolem dokola. Každá je kužel s nepravidelně posunutými vrcholy,
 * aby nevypadaly jako řada stejných špiček.
 */
export const createMountains = (random: Random): THREE.Group => {
  const skupina = new THREE.Group()
  skupina.name = 'hory'

  const materialSkala = new THREE.MeshStandardMaterial({
    color: PALETTE.skala,
    roughness: 1,
    flatShading: true,
  })
  const materialSnih = new THREE.MeshStandardMaterial({
    color: '#e8e4f0',
    roughness: 0.9,
    flatShading: true,
  })

  const skaly: DilGeometrie[] = []
  const snih: DilGeometrie[] = []

  const pocet = 46

  for (let i = 0; i < pocet; i++) {
    // Úhel se rozprostře rovnoměrně a jen lehce rozhodí, aby mezi horami
    // nezůstávaly velké díry na obzoru.
    const uhel = (i / pocet) * Math.PI * 2 + random.rozsah(-0.05, 0.05)

    // Odchylka od směru, ze kterého se hráč dívá. Rozdíl úhlů se srovná
    // do <-π, π>, jinak by dvojice jako 0.1 a 6.2 vyšla jako vzdálená,
    // přestože jde skoro o stejný směr.
    let odchylka = uhel - VALLEY_ANGLE
    odchylka = Math.atan2(Math.sin(odchylka), Math.cos(odchylka))

    // V údolí před městem hory nestojí, na jeho okrajích se zvedají
    // postupně — ostrý předěl by byl vidět jako useknutá stěna.
    const vUdoli = Math.abs(odchylka) < VALLEY_WIDTH
    if (vUdoli && Math.abs(odchylka) < VALLEY_WIDTH * 0.55) continue

    const tlumeni = vUdoli
      ? THREE.MathUtils.smoothstep(Math.abs(odchylka), VALLEY_WIDTH * 0.55, VALLEY_WIDTH)
      : 1

    const vzdalenost = random.rozsah(MOUNTAIN_INNER, MOUNTAIN_OUTER)
    // Vzdálenější hory jsou vyšší, ale mírně — dřív se poměr počítal
    // k vnitřnímu okraji a ty nejzazší z toho vycházely dvaapůlkrát
    // vyšší než ty blízké, což z nich dělalo jehly.
    const dalka = (vzdalenost - MOUNTAIN_INNER) / (MOUNTAIN_OUTER - MOUNTAIN_INNER)
    const vyska = random.rozsah(38, 96) * (0.78 + dalka * 0.55) * (0.35 + tlumeni * 0.65)
    const sirka = random.rozsah(28, 58)

    const geometry = new THREE.ConeGeometry(sirka, vyska, random.cele(5, 7), 1)

    // Rozhození vrcholů dá každé hoře vlastní tvar. Nechávají se být
    // dvě místa: spodní okraj, ať hora nevisí nad zemí, a špička.
    //
    // Špičku tvoří v kuželu několik vrcholů ve stejném bodě, jeden na
    // každý díl pláště. Rozhodit je zvlášť znamená roztrhnout je od sebe
    // a z hory pak trčí svazek tenkých jehel. Posouvají se proto všechny
    // o totéž.
    const pozice = geometry.attributes.position as THREE.BufferAttribute
    const spicka = vyska / 2
    const posunSpickyX = random.rozsah(-4, 4)
    const posunSpickyZ = random.rozsah(-4, 4)

    for (let v = 0; v < pozice.count; v++) {
      const y = pozice.getY(v)
      if (y <= -spicka + 0.01) continue

      if (y >= spicka - 0.01) {
        pozice.setX(v, pozice.getX(v) + posunSpickyX)
        pozice.setZ(v, pozice.getZ(v) + posunSpickyZ)
        continue
      }

      pozice.setX(v, pozice.getX(v) + random.rozsah(-3, 3))
      pozice.setZ(v, pozice.getZ(v) + random.rozsah(-3, 3))
      pozice.setY(v, y + random.rozsah(-2.5, 2.5))
    }
    geometry.computeVertexNormals()

    const x = Math.cos(uhel) * vzdalenost
    const z = Math.sin(uhel) * vzdalenost
    const y = vyska / 2 - 4
    const natoceni = random.rozsah(0, Math.PI * 2)

    skaly.push({ geometry, matrix: matrixFor({ x, y, z }, natoceni) })

    // Sníh dostanou jen ty vysoké — na nižších by vypadal nepatřičně
    if (vyska > 78) {
      // Čepice jde za posunutou špičkou; jinak by zůstala vedle hory
      snih.push({
        geometry: new THREE.ConeGeometry(sirka * 0.34, vyska * 0.24, 6, 1),
        matrix: matrixFor(
          { x: x + posunSpickyX, y: y + vyska * 0.38, z: z + posunSpickyZ },
          natoceni
        ),
      })
    }
  }

  // Hory se nehýbou, takže z nich může být jedno těleso místo padesáti.
  // Stín nevrhají: jsou daleko za městem a do stínové mapy by se stejně
  // nevešly, zato by ji zbytečně roztáhly a rozmazaly stíny ve městě.
  for (const [dily, material] of [
    [skaly, materialSkala],
    [snih, materialSnih],
  ] as const) {
    const mesh = mergeToMesh(dily, material, { castShadow: false, receiveShadow: false })
    if (mesh) skupina.add(mesh)
  }

  return skupina
}

/**
 * Osa řeky. Je vytažená ven, protože se jí musí vyhnout i les — bez
 * sdílené křivky by druhá kopie souřadnic dřív nebo později přestala
 * sedět a stromy by rostly z vody.
 */
export const riverCurve = (): THREE.CatmullRomCurve3 =>
  new THREE.CatmullRomCurve3([
    new THREE.Vector3(-260, 0, -190),
    new THREE.Vector3(-150, 0, -70),
    new THREE.Vector3(-125, 0, 40),
    new THREE.Vector3(-55, 0, 120),
    new THREE.Vector3(40, 0, 155),
    new THREE.Vector3(190, 0, 230),
  ])

export const RIVER_WIDTH = 9

/** Řeka, která se vine mezi horami kolem města. */
export const createRiver = (): THREE.Mesh => {
  const krivka = riverCurve()

  // Řeka je plochý pás položený na zem, ne trubka — z ptačí perspektivy
  // je vidět jen shora a plochý pás stojí zlomek trojúhelníků.
  const body = krivka.getPoints(140)
  const sirka = RIVER_WIDTH

  const pozice: number[] = []
  const indexy: number[] = []

  for (let i = 0; i < body.length; i++) {
    const tecna = krivka.getTangent(i / (body.length - 1))
    // Kolmice v rovině země: tečnu otočíme o 90° kolem svislé osy
    const kolmice = new THREE.Vector3(-tecna.z, 0, tecna.x).normalize()

    const b = body[i]
    pozice.push(
      b.x + kolmice.x * sirka, 0.35, b.z + kolmice.z * sirka,
      b.x - kolmice.x * sirka, 0.35, b.z - kolmice.z * sirka
    )

    if (i < body.length - 1) {
      const o = i * 2
      indexy.push(o, o + 1, o + 2, o + 1, o + 3, o + 2)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pozice, 3))
  geometry.setIndex(indexy)
  geometry.computeVertexNormals()

  const reka = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: '#4a7f9e',
      roughness: 0.18,
      metalness: 0.35,
      side: THREE.DoubleSide,
    })
  )
  reka.name = 'reka'
  return reka
}
