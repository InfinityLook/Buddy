import type { Pozice2D } from '../types'

/** První čtyři orientační oblasti světa. Jsou vizuální, nikoli uzamčené levely. */
export interface OblastSveta {
  id: string
  nazev: string
  stred: Pozice2D
  polomer: number
  barva: string
  symbol: string
  popis: string
}

export const OBLASTI_SVETA: readonly OblastSveta[] = [
  { id: 'ruiny', nazev: 'Zapomenuté ruiny', stred: {x:-24,z:-17}, polomer:9, barva:'#9b8eaf', symbol:'◇', popis:'Runy, fragmenty a paměť strážců.' },
  { id: 'chram', nazev: 'Starý chrám', stred: {x:12,z:-12}, polomer:9, barva:'#b8a4e0', symbol:'△', popis:'Oltář, tři runy a chrámová aréna.' },
  { id: 'vesnice', nazev: 'Buddyho vesnice', stred: { x: 0, z: 13 }, polomer: 8.5, barva: '#a3ba70', symbol: '⌂', popis: 'Bezpečný domov a stavění.' },
  { id: 'kristalova-mytina', nazev: 'Krystalová mýtina', stred: { x: 0, z: 4 }, polomer: 3.2, barva: '#63c9ce', symbol: '✦', popis: 'Místo tajemného krystalu.' },
  { id: 'stiny-lesa', nazev: 'Stíny lesa', stred: { x: -13, z: -3 }, polomer: 7, barva: '#66769a', symbol: '✧', popis: 'Nebezpečné lesní stezky.' },
  { id: 'haj-strazce', nazev: 'Háj strážce', stred: { x: 0, z: -18.72 }, polomer: 5, barva: '#9271a4', symbol: '◆', popis: 'Sídlo lesního bosse.' },
]

/** Vrací nejbližší oblast, pouze pokud hráč stojí uvnitř její hranice. */
export function oblastNaPozici(pozice: Pozice2D): OblastSveta | null {
  let nejblizsi: OblastSveta | null = null
  let pomer = Infinity
  for (const oblast of OBLASTI_SVETA) {
    const vzdalenost = Math.hypot(pozice.x - oblast.stred.x, pozice.z - oblast.stred.z)
    const relativni = vzdalenost / oblast.polomer
    if (relativni <= 1 && relativni < pomer) {
      nejblizsi = oblast
      pomer = relativni
    }
  }
  return nejblizsi
}
