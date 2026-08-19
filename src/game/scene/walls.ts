import * as THREE from 'three'
import {
  GATE_COUNT,
  PALETTE,
  TOWER_COUNT,
  WALL_HEIGHT,
  WALL_RADIUS,
  WALL_THICKNESS,
} from '../constants'
import { DilGeometrie, matrixFor, mergeToMesh } from './merge'

// ==========================================
// Hradba kolem města, věže a brány.
//
// Hradba je prstenec složený z dílů mezi věžemi. Nedělá se jako jeden
// prsten, protože brány jsou v něm dírou a v souvislém prstenci by
// nešly vyříznout bez práce s geometrií navíc.
//
// Nic z toho ale nejsou samostatné meshe: díly se posbírají i s polohou
// a na konci se slučují podle materiálu do čtyř těles. Samotného cimbuří
// jsou přes dvě stovky kousků a jako jednotlivé meshe stálo víc
// kreslicích volání než celý zbytek scény dohromady.
// ==========================================

const materialHradba = new THREE.MeshStandardMaterial({
  color: PALETTE.hradba,
  roughness: 0.95,
})
const materialVez = new THREE.MeshStandardMaterial({
  color: PALETTE.vez,
  roughness: 0.92,
})
const materialStrecha = new THREE.MeshStandardMaterial({
  color: PALETTE.strechaSeda,
  roughness: 0.85,
})
const materialBrana = new THREE.MeshStandardMaterial({
  color: PALETTE.hradbaTmava,
  roughness: 0.9,
})

// Tvary se vytvoří jednou a pak už se jen umisťují maticemi
const zubGeom = new THREE.BoxGeometry(1.6, 1.5, WALL_THICKNESS * 0.75)
const jednotkovyKvadr = new THREE.BoxGeometry(1, 1, 1)

/**
 * Cimbuří podél horní hrany dílu hradby.
 *
 * `zaklad` je poloha a natočení dílu; zuby se do ní umisťují po místní
 * ose X, takže stačí matice dílu vynásobit posunem.
 */
const crenellations = (
  dily: DilGeometrie[],
  zaklad: THREE.Matrix4,
  delka: number,
  posunX = 0
): void => {
  const zubSirka = 1.6
  const krok = zubSirka + 1.5
  const pocet = Math.max(2, Math.floor(delka / krok))
  // Zbytek se rozdělí na obě strany, aby řada zubů seděla na střed dílu
  const zacatek = -((pocet - 1) * krok) / 2

  for (let i = 0; i < pocet; i++) {
    const mistni = new THREE.Matrix4().makeTranslation(
      posunX + zacatek + i * krok,
      WALL_HEIGHT / 2 + 0.75,
      0
    )
    dily.push({ geometry: zubGeom, matrix: zaklad.clone().multiply(mistni) })
  }
}

export const createWalls = (): { group: THREE.Group; targets: THREE.Object3D[] } => {
  const skupina = new THREE.Group()
  skupina.name = 'hradby'

  const hradba: DilGeometrie[] = []
  const veze: DilGeometrie[] = []
  const strechy: DilGeometrie[] = []
  const brany: DilGeometrie[] = []

  const krok = (Math.PI * 2) / TOWER_COUNT
  // Brány se rozmístí co nejdál od sebe mezi věžemi
  const branyNa = new Set(
    Array.from({ length: GATE_COUNT }, (_, i) => Math.round((i * TOWER_COUNT) / GATE_COUNT))
  )

  for (let i = 0; i < TOWER_COUNT; i++) {
    const uhel = i * krok

    // --- věž ---
    const vyskaVeze = i % 3 === 0 ? 16 : 13
    const polomer = 3.4
    const patVeze = new THREE.Vector3(
      Math.cos(uhel) * WALL_RADIUS,
      0,
      Math.sin(uhel) * WALL_RADIUS
    )

    veze.push({
      geometry: new THREE.CylinderGeometry(polomer, polomer * 1.12, vyskaVeze, 8),
      matrix: matrixFor({ x: patVeze.x, y: vyskaVeze / 2, z: patVeze.z }),
    })
    // Ochoz přečnívá přes tělo, takže je věž nahoře znát i z dálky
    veze.push({
      geometry: new THREE.CylinderGeometry(polomer * 1.25, polomer * 1.25, 1.2, 8),
      matrix: matrixFor({ x: patVeze.x, y: vyskaVeze, z: patVeze.z }),
    })
    strechy.push({
      geometry: new THREE.ConeGeometry(polomer * 1.35, vyskaVeze * 0.45, 8),
      matrix: matrixFor({
        x: patVeze.x,
        y: vyskaVeze + 0.6 + (vyskaVeze * 0.45) / 2,
        z: patVeze.z,
      }),
    })

    // --- díl hradby mezi touhle věží a tou následující ---
    const stred = uhel + krok / 2
    // Tětiva mezi patami věží, ne délka oblouku — jinak by se díly
    // překrývaly a v rozích prosvítaly.
    const delka = 2 * WALL_RADIUS * Math.sin(krok / 2)

    const zaklad = matrixFor(
      { x: Math.cos(stred) * WALL_RADIUS, y: 0, z: Math.sin(stred) * WALL_RADIUS },
      -stred + Math.PI / 2
    )

    if (branyNa.has(i)) {
      // V dílu s bránou jsou jen dva kusy hradby po stranách průchodu
      const kus = (delka - 14) / 2

      for (const strana of [-1, 1]) {
        const posunX = strana * (7 + kus / 2)
        const mistni = new THREE.Matrix4()
          .makeTranslation(posunX, WALL_HEIGHT / 2, 0)
          .scale(new THREE.Vector3(kus, WALL_HEIGHT, WALL_THICKNESS))
        hradba.push({ geometry: jednotkovyKvadr, matrix: zaklad.clone().multiply(mistni) })
        crenellations(hradba, zaklad, kus, posunX)
      }

      // --- brána ---
      const sirkaPruchodu = 7
      const vyskaBrany = WALL_HEIGHT + 3

      for (const strana of [-1, 1]) {
        const mistni = new THREE.Matrix4()
          .makeTranslation(strana * (sirkaPruchodu / 2 + 1.5), vyskaBrany / 2, 0)
          .scale(new THREE.Vector3(3, vyskaBrany, WALL_THICKNESS + 1.5))
        brany.push({ geometry: jednotkovyKvadr, matrix: zaklad.clone().multiply(mistni) })
      }

      const preklad = new THREE.Matrix4()
        .makeTranslation(0, vyskaBrany + 1.25, 0)
        .scale(new THREE.Vector3(sirkaPruchodu + 6, 2.5, WALL_THICKNESS + 1.5))
      brany.push({ geometry: jednotkovyKvadr, matrix: zaklad.clone().multiply(preklad) })
    } else {
      const mistni = new THREE.Matrix4()
        .makeTranslation(0, WALL_HEIGHT / 2, 0)
        .scale(new THREE.Vector3(delka, WALL_HEIGHT, WALL_THICKNESS))
      hradba.push({ geometry: jednotkovyKvadr, matrix: zaklad.clone().multiply(mistni) })
      crenellations(hradba, zaklad, delka)
    }
  }

  for (const [dily, material] of [
    [hradba, materialHradba],
    [veze, materialVez],
    [strechy, materialStrecha],
    [brany, materialBrana],
  ] as const) {
    const mesh = mergeToMesh(dily, material)
    if (mesh) skupina.add(mesh)
  }

  return { group: skupina, targets: [skupina] }
}
