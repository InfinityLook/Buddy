import * as THREE from 'three'
import { MOUNTAIN_OUTER, WALL_RADIUS } from '../constants'
import { RIVER_WIDTH, riverCurve } from './environment'
import type { Random } from './random'

// ==========================================
// Jehličnaté lesy kolem města.
//
// Bez nich je popředí velká prázdná plocha jedné barvy. Stromů jsou
// tisíce, takže stejně jako domy jedou přes instancování — jinak by
// scéna spadla na pár snímků za vteřinu.
// ==========================================

const POCET = 1400
const VOLNO_KOLEM_HRADEB = 14
const VOLNO_U_REKY = RIVER_WIDTH + 7

export const createForest = (random: Random): THREE.Group => {
  const skupina = new THREE.Group()
  skupina.name = 'les'

  // Osa řeky ve vzorcích. Vzdálenost k ní se počítá na tyhle body, ne
  // na spojitou křivku — pro rozhodnutí "roste tu strom?" to stačí
  // a je to o řád levnější.
  const rekaBody = riverCurve().getPoints(90)

  const kmeny = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.35, 0.5, 1, 5),
    new THREE.MeshStandardMaterial({ color: '#4a3a2e', roughness: 1 }),
    POCET
  )
  const koruny = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1, 1, 6),
    new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }),
    POCET
  )

  const matice = new THREE.Matrix4()
  const pozice = new THREE.Vector3()
  const rotace = new THREE.Quaternion()
  const meritko = new THREE.Vector3()
  const osaY = new THREE.Vector3(0, 1, 0)

  const zelene = ['#2f4a33', '#3a5a3c', '#26402f', '#44603f']

  let umisteno = 0
  let pokusy = 0

  while (umisteno < POCET && pokusy < POCET * 6) {
    pokusy++

    const uhel = random.rozsah(0, Math.PI * 2)
    // Odmocnina srovná hustotu: bez ní by se stromy nakupily u středu,
    // protože stejný rozsah poloměru pokrývá u okraje mnohem víc plochy.
    const t = Math.sqrt(random.dalsi())
    const polomer = WALL_RADIUS + VOLNO_KOLEM_HRADEB + t * (MOUNTAIN_OUTER - WALL_RADIUS)

    const x = Math.cos(uhel) * polomer
    const z = Math.sin(uhel) * polomer

    // Ve vodě strom nestojí
    let uReky = false
    for (const bod of rekaBody) {
      if (Math.hypot(bod.x - x, bod.z - z) < VOLNO_U_REKY) {
        uReky = true
        break
      }
    }
    if (uReky) continue

    const vyska = random.rozsah(4, 9)
    const sirka = vyska * random.rozsah(0.24, 0.34)

    rotace.setFromAxisAngle(osaY, random.rozsah(0, Math.PI * 2))

    const vyskaKmene = vyska * 0.3
    pozice.set(x, vyskaKmene / 2, z)
    meritko.set(1, vyskaKmene, 1)
    kmeny.setMatrixAt(umisteno, matice.compose(pozice, rotace, meritko))

    pozice.set(x, vyskaKmene + (vyska * 0.85) / 2, z)
    meritko.set(sirka, vyska * 0.85, sirka)
    koruny.setMatrixAt(umisteno, matice.compose(pozice, rotace, meritko))
    koruny.setColorAt(umisteno, new THREE.Color(random.vyber(zelene)))

    umisteno++
  }

  // Nevyužité instance by se jinak nakreslily ve středu města
  kmeny.count = umisteno
  koruny.count = umisteno

  // Stromy stín přijímají, ale nevrhají: tisíc dalších objektů ve
  // stínové mapě by bylo znát na výkonu a v téhle vzdálenosti to nikdo
  // nepozná.
  kmeny.receiveShadow = true
  koruny.receiveShadow = true

  kmeny.instanceMatrix.needsUpdate = true
  koruny.instanceMatrix.needsUpdate = true

  skupina.add(kmeny, koruny)
  return skupina
}
