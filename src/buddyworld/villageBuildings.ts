/** Pozice mimo hlavní cestu a start; nezabírají místo bossova háje. */
export interface VillageBuilding {
  id: string
  nazev: string
  odUrovne: number
  x: number
  z: number
  sirka: number
  hloubka: number
  vyska: number
  barvaZdi: string
  barvaStrechy: string
}

export const VESNICKE_STAVBY: readonly VillageBuilding[] = [
  { id: 'farma', nazev: 'Farma', odUrovne: 2, x: -12, z: 13, sirka: 2.5, hloubka: 2.2, vyska: 1.9, barvaZdi: '#b89b65', barvaStrechy: '#8c512b' },
  { id: 'sklad', nazev: 'Sklad', odUrovne: 2, x: 12, z: 13, sirka: 2.4, hloubka: 2.4, vyska: 1.8, barvaZdi: '#8e7656', barvaStrechy: '#62432e' },
  { id: 'kovarna', nazev: 'Kovárna', odUrovne: 3, x: -12, z: 18, sirka: 2.7, hloubka: 2.3, vyska: 2.0, barvaZdi: '#817b78', barvaStrechy: '#503c36' },
  { id: 'obchod', nazev: 'Obchod', odUrovne: 3, x: 12, z: 18, sirka: 2.7, hloubka: 2.3, vyska: 2.0, barvaZdi: '#c19b72', barvaStrechy: '#704c40' },
  { id: 'radnice', nazev: 'Radnice', odUrovne: 4, x: -15, z: 8, sirka: 3.2, hloubka: 3.0, vyska: 3.0, barvaZdi: '#b6b0a1', barvaStrechy: '#42606e' },
  { id: 'trziste', nazev: 'Tržiště', odUrovne: 4, x: 15, z: 8, sirka: 3.0, hloubka: 2.6, vyska: 1.8, barvaZdi: '#c7a875', barvaStrechy: '#9a4946' },
  { id: 'magicka_vez', nazev: 'Magická věž', odUrovne: 5, x: -17, z: 17, sirka: 2.5, hloubka: 2.5, vyska: 4.0, barvaZdi: '#8174a4', barvaStrechy: '#51417d' },
  { id: 'hrad', nazev: 'Hrad', odUrovne: 5, x: 17, z: 17, sirka: 3.5, hloubka: 3.4, vyska: 3.5, barvaZdi: '#a7a8b0', barvaStrechy: '#525c75' },
]

export const odemceneStavby = (uroven: number): VillageBuilding[] =>
  VESNICKE_STAVBY.filter((stavba) => Number.isInteger(uroven) && uroven >= stavba.odUrovne)
