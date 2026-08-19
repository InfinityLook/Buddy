import * as THREE from 'three'
import { CITY_INNER, CITY_OUTER, PALETTE } from '../constants'
import type { Random } from './random'

// ==========================================
// Domy v pásu mezi arénou a hradbou.
//
// Domů jsou stovky a každý zvlášť by znamenal stovky kreslicích volání.
// Proto jsou to tři instancované meshe — zdi, střechy a osvětlená okna —
// a každá instance má vlastní polohu, natočení i barvu. Na telefonu je
// to rozdíl mezi plynulým během a diashow.
// ==========================================

const STRECHY = [PALETTE.strechaMed, PALETTE.strechaModra, PALETTE.strechaSeda] as const
const ZDI = [PALETTE.domZed, PALETTE.domZedSvetla] as const

interface Dum {
  x: number
  z: number
  sirka: number
  hloubka: number
  vyska: number
  natoceni: number
  barvaZdi: THREE.Color
  barvaStrechy: THREE.Color
}

/**
 * Rozmístí domy do prstence kolem arény.
 *
 * Domy se skládají po soustředných řadách a v každé řadě se rozestup
 * dopočítá z obvodu — jinak by u vnitřního okraje stály namačkané
 * na sobě a u hradby by mezi nimi zůstávaly prázdné pruhy.
 */
const rozmistiDomy = (random: Random): Dum[] => {
  const domy: Dum[] = []
  const rozestupRad = 6.4

  for (let polomer = CITY_INNER; polomer < CITY_OUTER; polomer += rozestupRad) {
    const obvod = 2 * Math.PI * polomer
    const pocet = Math.floor(obvod / 6.2)
    // Každá řada se pootočí, aby domy nestály v rovných paprscích
    const posun = random.rozsah(0, Math.PI * 2)

    for (let i = 0; i < pocet; i++) {
      // Mezery v zástavbě dělají ulice a náměstíčka
      if (random.sance(0.14)) continue

      const uhel = posun + (i / pocet) * Math.PI * 2
      const r = polomer + random.rozsah(-1.5, 1.5)

      domy.push({
        x: Math.cos(uhel) * r,
        z: Math.sin(uhel) * r,
        sirka: random.rozsah(3.2, 5),
        hloubka: random.rozsah(3.2, 5),
        vyska: random.rozsah(3.5, 8.5),
        // Domy stojí čelem ke středu, jen lehce rozhozené
        natoceni: -uhel + random.rozsah(-0.25, 0.25),
        barvaZdi: new THREE.Color(random.vyber(ZDI)),
        barvaStrechy: new THREE.Color(random.vyber(STRECHY)),
      })
    }
  }

  return domy
}

export const createBuildings = (
  random: Random
): { group: THREE.Group; targets: THREE.Object3D[] } => {
  const domy = rozmistiDomy(random)
  const skupina = new THREE.Group()
  skupina.name = 'mesto'

  const zdi = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.95 }),
    domy.length
  )
  // Střecha je čtyřboký jehlan, tedy kužel se čtyřmi stranami
  const strechy = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.78, 1, 4),
    new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }),
    domy.length
  )
  // Svítící okna. Nejsou to díry ve zdi, ale destičky těsně před ní —
  // na téhle vzdálenosti je rozdíl nepoznat a ušetří to řezání geometrie.
  const okna = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: PALETTE.okno, toneMapped: false }),
    domy.length
  )

  const matice = new THREE.Matrix4()
  const pozice = new THREE.Vector3()
  const rotace = new THREE.Quaternion()
  const meritko = new THREE.Vector3()
  const osaY = new THREE.Vector3(0, 1, 0)

  let poctOken = 0

  domy.forEach((dum, i) => {
    rotace.setFromAxisAngle(osaY, dum.natoceni)

    pozice.set(dum.x, dum.vyska / 2, dum.z)
    meritko.set(dum.sirka, dum.vyska, dum.hloubka)
    zdi.setMatrixAt(i, matice.compose(pozice, rotace, meritko))
    zdi.setColorAt(i, dum.barvaZdi)

    const vyskaStrechy = random.rozsah(1.8, 3.2)
    pozice.set(dum.x, dum.vyska + vyskaStrechy / 2, dum.z)
    // Jehlan má hranu proti ose, pootočení o 45° ho srovná se stěnami
    rotace.setFromAxisAngle(osaY, dum.natoceni + Math.PI / 4)
    meritko.set(dum.sirka * 1.28, vyskaStrechy, dum.hloubka * 1.28)
    strechy.setMatrixAt(i, matice.compose(pozice, rotace, meritko))
    strechy.setColorAt(i, dum.barvaStrechy)

    // Okno dostane jen část domů, ať město nesvítí jako vánoční stromek
    if (random.sance(0.45)) {
      const smerVen = new THREE.Vector3(Math.cos(-dum.natoceni), 0, Math.sin(-dum.natoceni))
      pozice.set(
        dum.x + smerVen.x * (dum.hloubka / 2 + 0.06),
        dum.vyska * random.rozsah(0.4, 0.7),
        dum.z + smerVen.z * (dum.hloubka / 2 + 0.06)
      )
      rotace.setFromAxisAngle(osaY, -dum.natoceni + Math.PI / 2)
      meritko.set(random.rozsah(0.7, 1.2), random.rozsah(0.7, 1.1), 1)
      okna.setMatrixAt(poctOken, matice.compose(pozice, rotace, meritko))
      poctOken++
    }
  })

  // Nevyužité instance by se jinak nakreslily s jednotkovou maticí
  // ve středu města jako svítící čtverec.
  okna.count = poctOken

  zdi.castShadow = true
  zdi.receiveShadow = true
  strechy.castShadow = true
  strechy.receiveShadow = true

  zdi.instanceMatrix.needsUpdate = true
  strechy.instanceMatrix.needsUpdate = true
  okna.instanceMatrix.needsUpdate = true

  skupina.add(zdi, strechy, okna)

  // Okna se do trefy nepočítají — jsou to tenké destičky bez objemu
  return { group: skupina, targets: [zdi, strechy] }
}
