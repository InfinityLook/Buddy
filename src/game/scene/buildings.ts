import * as THREE from 'three'
import { CITY_INNER, CITY_OUTER, PALETTE } from '../constants'
import { jeNaUlici } from './streets'
import type { Random } from './random'

// ==========================================
// Domy v pásu mezi arénou a hradbou.
//
// Domů jsou stovky a každý zvlášť by znamenal stovky kreslicích volání.
// Proto jsou to instancované meshe — zdi, dva druhy střech a osvětlená
// okna — a každá instance má vlastní polohu, natočení i barvu.
//
// Střechy jsou schválně dvojí: sedlová a jehlanová. Když byly všechny
// jehlanové, vypadalo město z výšky jako pole stejných špiček.
// ==========================================

const STRECHY = [PALETTE.strechaMed, PALETTE.strechaModra, PALETTE.strechaSeda] as const
const ZDI = [PALETTE.domZed, PALETTE.domZedSvetla] as const

type DruhStrechy = 'sedlova' | 'jehlanova'

interface Dum {
  x: number
  z: number
  sirka: number
  hloubka: number
  vyska: number
  natoceni: number
  druhStrechy: DruhStrechy
  vyskaStrechy: number
  maOkno: boolean
  barvaZdi: THREE.Color
  barvaStrechy: THREE.Color
}

/**
 * Sedlová střecha: trojúhelník protažený do délky.
 *
 * Hřeben vede podél osy Z, základna je široká 1 v ose X a vysoká 1 —
 * měřítko instance z toho udělá konkrétní rozměr.
 */
const sedlovaGeometrie = (): THREE.BufferGeometry => {
  const tvar = new THREE.Shape()
  tvar.moveTo(-0.5, 0)
  tvar.lineTo(0.5, 0)
  tvar.lineTo(0, 1)
  tvar.closePath()

  const geometry = new THREE.ExtrudeGeometry(tvar, { depth: 1, bevelEnabled: false })
  // ExtrudeGeometry táhne od z=0 dopředu; posunutím se hřeben vystředí
  geometry.translate(0, 0, -0.5)
  return geometry
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
  // Rozestupy jsou těsné schválně. Při volnějším rozvržení vypadalo
  // město z ptačí perspektivy jako pár domků rozházených po dlažbě —
  // středověké město stojí namačkané, jinak nemá smysl obehnat ho hradbou.
  const rozestupRad = 5.2

  for (let polomer = CITY_INNER; polomer < CITY_OUTER; polomer += rozestupRad) {
    const obvod = 2 * Math.PI * polomer
    const pocet = Math.floor(obvod / 5.1)
    // Každá řada se pootočí, aby domy nestály v rovných paprscích
    const posun = random.rozsah(0, Math.PI * 2)

    for (let i = 0; i < pocet; i++) {
      // Mezery v zástavbě dělají dvorky a průchody
      if (random.sance(0.06)) continue

      const uhel = posun + (i / pocet) * Math.PI * 2
      const r = polomer + random.rozsah(-1.1, 1.1)

      // Na ulici se nestaví
      if (jeNaUlici(r, uhel)) continue

      const sirka = random.rozsah(2.9, 4.3)
      const hloubka = random.rozsah(2.9, 4.3)

      domy.push({
        x: Math.cos(uhel) * r,
        z: Math.sin(uhel) * r,
        sirka,
        hloubka,
        vyska: random.rozsah(3.5, 9),
        // Domy stojí čelem ke středu, jen lehce rozhozené
        natoceni: -uhel + random.rozsah(-0.22, 0.22),
        druhStrechy: random.sance(0.62) ? 'sedlova' : 'jehlanova',
        vyskaStrechy: random.rozsah(1.8, 3.2),
        maOkno: random.sance(0.5),
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

  const sedlove = domy.filter((d) => d.druhStrechy === 'sedlova')
  const jehlanove = domy.filter((d) => d.druhStrechy === 'jehlanova')
  const sOknem = domy.filter((d) => d.maOkno)

  const zdi = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.95 }),
    domy.length
  )
  const strechySedlove = new THREE.InstancedMesh(
    sedlovaGeometrie(),
    new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }),
    Math.max(1, sedlove.length)
  )
  // Jehlan je kužel se čtyřmi stranami
  const strechyJehlanove = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.78, 1, 4),
    new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }),
    Math.max(1, jehlanove.length)
  )
  // Svítící okna. Nejsou to díry ve zdi, ale destičky těsně před ní —
  // na téhle vzdálenosti je rozdíl nepoznat a ušetří to řezání geometrie.
  const okna = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: PALETTE.okno, toneMapped: false }),
    Math.max(1, sOknem.length)
  )

  const matice = new THREE.Matrix4()
  const pozice = new THREE.Vector3()
  const rotace = new THREE.Quaternion()
  const meritko = new THREE.Vector3()
  const osaY = new THREE.Vector3(0, 1, 0)

  let iSedlova = 0
  let iJehlanova = 0
  let iOkno = 0

  domy.forEach((dum, i) => {
    rotace.setFromAxisAngle(osaY, dum.natoceni)

    pozice.set(dum.x, dum.vyska / 2, dum.z)
    meritko.set(dum.sirka, dum.vyska, dum.hloubka)
    zdi.setMatrixAt(i, matice.compose(pozice, rotace, meritko))
    zdi.setColorAt(i, dum.barvaZdi)

    if (dum.druhStrechy === 'sedlova') {
      // Sedlová sedí přímo na zdech a jen lehce přečnívá do stran
      pozice.set(dum.x, dum.vyska, dum.z)
      meritko.set(dum.sirka * 1.12, dum.vyskaStrechy, dum.hloubka * 1.08)
      strechySedlove.setMatrixAt(iSedlova, matice.compose(pozice, rotace, meritko))
      strechySedlove.setColorAt(iSedlova, dum.barvaStrechy)
      iSedlova++
    } else {
      pozice.set(dum.x, dum.vyska + dum.vyskaStrechy / 2, dum.z)
      // Jehlan má hranu proti ose, pootočení o 45° ho srovná se stěnami
      rotace.setFromAxisAngle(osaY, dum.natoceni + Math.PI / 4)
      meritko.set(dum.sirka * 1.28, dum.vyskaStrechy, dum.hloubka * 1.28)
      strechyJehlanove.setMatrixAt(iJehlanova, matice.compose(pozice, rotace, meritko))
      strechyJehlanove.setColorAt(iJehlanova, dum.barvaStrechy)
      iJehlanova++
      rotace.setFromAxisAngle(osaY, dum.natoceni)
    }

    if (dum.maOkno) {
      const smerVen = new THREE.Vector3(Math.cos(-dum.natoceni), 0, Math.sin(-dum.natoceni))
      pozice.set(
        dum.x + smerVen.x * (dum.hloubka / 2 + 0.06),
        dum.vyska * random.rozsah(0.4, 0.7),
        dum.z + smerVen.z * (dum.hloubka / 2 + 0.06)
      )
      rotace.setFromAxisAngle(osaY, -dum.natoceni + Math.PI / 2)
      meritko.set(random.rozsah(0.7, 1.2), random.rozsah(0.7, 1.1), 1)
      okna.setMatrixAt(iOkno, matice.compose(pozice, rotace, meritko))
      iOkno++
      rotace.setFromAxisAngle(osaY, dum.natoceni)
    }
  })

  // Nevyužité instance by se jinak nakreslily s jednotkovou maticí
  // ve středu města jako hromada u počátku.
  strechySedlove.count = iSedlova
  strechyJehlanove.count = iJehlanova
  okna.count = iOkno

  for (const mesh of [zdi, strechySedlove, strechyJehlanove]) {
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.instanceMatrix.needsUpdate = true
  }
  okna.instanceMatrix.needsUpdate = true

  skupina.add(zdi, strechySedlove, strechyJehlanove, okna)

  // Okna se do trefy nepočítají — jsou to tenké destičky bez objemu
  return { group: skupina, targets: [zdi, strechySedlove, strechyJehlanove] }
}
