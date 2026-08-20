import * as THREE from 'three'
import { SMER_SLUNCE } from './environment'
import type { Random } from './random'

// ==========================================
// Mraky nad krajinou.
//
// Prázdná obloha vypadá jako plochý přechod. Pár protáhlých chuchvalců
// jí dá měřítko a hloubku — a hlavně ukáže, kde je nahoře vítr.
//
// Nejsou to placky natočené ke kameře: kamera se otáčí kolem města a
// otáčející se placky by byly nápadné. Jsou to zploštělé koule s nízkým
// počtem dílků, které vypadají dobře ze všech stran.
// ==========================================

const POCET = 60

export const createClouds = (random: Random): THREE.Group => {
  const skupina = new THREE.Group()
  skupina.name = 'mraky'

  const mraky = new THREE.InstancedMesh(
    // Dost dílků na to, aby zploštělá koule neměla znatelný
    // šestiúhelníkový obrys, ale ne víc — mraků je šedesát.
    new THREE.SphereGeometry(1, 11, 6),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      toneMapped: false,
      // Mlha by mraky obarvila na barvu obzoru a zmizely by. Hloubku
      // jim dělá barva podle strany, ze které na ně svítí slunce.
      fog: false,
    }),
    POCET
  )
  mraky.renderOrder = 1

  const matice = new THREE.Matrix4()
  const pozice = new THREE.Vector3()
  const rotace = new THREE.Quaternion()
  const meritko = new THREE.Vector3()
  const osaY = new THREE.Vector3(0, 1, 0)
  const barva = new THREE.Color()

  const osvicena = new THREE.Color('#ffdcae')
  const odvracena = new THREE.Color('#a3778c')

  // Chuchvalce se skládají z několika koulí u sebe, aby neměly tvar
  // jediné hladké bubliny.
  const chuchvalcu = 14
  const naChuchvalec = Math.floor(POCET / chuchvalcu)

  let i = 0

  for (let c = 0; c < chuchvalcu && i < POCET; c++) {
    const uhel = random.rozsah(0, Math.PI * 2)
    // Nízko a daleko. Kamera se dívá shora dolů, takže nad obzorem je
    // v záběru jen úzký pruh oblohy — mrak výš by nikdo nikdy neuviděl.
    const vzdalenost = random.rozsah(450, 950)
    const vyska = random.rozsah(55, 165)

    const stredX = Math.cos(uhel) * vzdalenost
    const stredZ = Math.sin(uhel) * vzdalenost

    // Jak moc je chuchvalec ke slunci — z toho se míchá jeho barva
    const kSlunci = Math.max(
      0,
      new THREE.Vector3(stredX, vyska, stredZ).normalize().dot(SMER_SLUNCE)
    )
    barva.copy(odvracena).lerp(osvicena, Math.pow((kSlunci + 1) / 2, 2.2))

    const velikost = random.rozsah(26, 58)

    for (let k = 0; k < naChuchvalec && i < POCET; k++) {
      pozice.set(
        stredX + random.rozsah(-velikost, velikost),
        vyska + random.rozsah(-velikost * 0.12, velikost * 0.12),
        stredZ + random.rozsah(-velikost * 0.5, velikost * 0.5)
      )
      rotace.setFromAxisAngle(osaY, random.rozsah(0, Math.PI * 2))
      // Zploštění ve svislé ose je to, co z koule udělá mrak
      const r = velikost * random.rozsah(0.45, 0.85)
      meritko.set(r, r * random.rozsah(0.22, 0.34), r * random.rozsah(0.7, 1))

      mraky.setMatrixAt(i, matice.compose(pozice, rotace, meritko))
      mraky.setColorAt(i, barva)
      i++
    }
  }

  mraky.count = i
  mraky.instanceMatrix.needsUpdate = true

  skupina.add(mraky)
  return skupina
}
