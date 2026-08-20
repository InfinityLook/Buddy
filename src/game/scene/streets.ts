import * as THREE from 'three'
import { CITY_INNER, CITY_OUTER, PALETTE } from '../constants'
import { DilGeometrie, matrixFor, mergeToMesh } from './merge'

// ==========================================
// Ulice ve městě.
//
// Bez nich byla zástavba z výšky jen jednolitá skvrna střech. Radiální
// ulice a okružní cesta jí dají čitelný půdorys — oko hned pozná, že jde
// o město, ne o hromadu domů.
//
// Stejný rozvrh používá i rozmisťování domů (buildings.ts), takže
// hodnoty jsou tady a exportují se ven. Dvě nezávislé kopie by se
// rozešly a domy by stály uprostřed cesty.
// ==========================================

/** Kolik ulic vede od arény k hradbám */
export const ULICE_POCET = 8

/** Poloviční šířka radiální ulice ve světových jednotkách */
export const ULICE_POLOSIRKA = 2.8

/** Poloměr okružní cesty a její poloviční šířka */
export const OKRUH_POLOMER = (CITY_INNER + CITY_OUTER) / 2
export const OKRUH_POLOSIRKA = 3.2

/**
 * Leží bod na ulici?
 *
 * Úhlová šířka se počítá z té světové: u arény zabere stejně široká
 * ulice mnohem větší úhel než u hradeb. Kdyby se šířka zadávala v úhlu,
 * byla by uprostřed města jako náměstí a u hradeb jako pěšina.
 */
export const jeNaUlici = (polomer: number, uhel: number): boolean => {
  if (Math.abs(polomer - OKRUH_POLOMER) < OKRUH_POLOSIRKA) return true

  const krok = (Math.PI * 2) / ULICE_POCET
  // Vzdálenost k nejbližší ulici, srovnaná do <-krok/2, krok/2>
  const odchylka = Math.abs(((uhel % krok) + krok * 1.5) % krok - krok / 2)

  return odchylka * polomer < ULICE_POLOSIRKA
}

/** Dlažba ulic — plochý pás těsně nad zemí. */
export const createStreets = (): THREE.Mesh | null => {
  const dily: DilGeometrie[] = []

  // Radiální ulice. Sahají kus za oba okraje zástavby, aby ústily do
  // brány i na náměstí u arény a nekončily ve vzduchu.
  const zacatek = CITY_INNER - 4
  const konec = CITY_OUTER + 6
  const delka = konec - zacatek
  const stred = (zacatek + konec) / 2

  const pas = new THREE.BoxGeometry(1, 0.3, 1)

  for (let i = 0; i < ULICE_POCET; i++) {
    const uhel = (i / ULICE_POCET) * Math.PI * 2
    dily.push({
      geometry: pas,
      matrix: matrixFor(
        { x: Math.cos(uhel) * stred, y: 0.28, z: Math.sin(uhel) * stred },
        -uhel,
        { x: delka, y: 1, z: ULICE_POLOSIRKA * 2 }
      ),
    })
  }

  // Okružní cesta
  const okruh = new THREE.RingGeometry(
    OKRUH_POLOMER - OKRUH_POLOSIRKA,
    OKRUH_POLOMER + OKRUH_POLOSIRKA,
    64
  )
  okruh.rotateX(-Math.PI / 2)
  dily.push({ geometry: okruh, matrix: matrixFor({ x: 0, y: 0.3, z: 0 }) })

  // Náměstí kolem arény
  const namesti = new THREE.RingGeometry(CITY_INNER - 5, CITY_INNER, 64)
  namesti.rotateX(-Math.PI / 2)
  dily.push({ geometry: namesti, matrix: matrixFor({ x: 0, y: 0.3, z: 0 }) })

  return mergeToMesh(
    dily,
    new THREE.MeshStandardMaterial({ color: PALETTE.dlazba, roughness: 1 }),
    // Cesty stín nevrhají — jsou ploché a jejich stín by byly jen
    // artefakty na okrajích.
    { castShadow: false, receiveShadow: true }
  )
}
