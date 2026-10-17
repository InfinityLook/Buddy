import { OBLASTI_SVETA } from './oblasti'
import type { Pozice2D } from '../types'

/** Cestovní brány uvnitř prototypové mapy. Nejde o nové samostatné levely. */
export const DOSAH_BRANY = 3.5
export interface BranaRegionu { id: string; odkud: string; kam: string; pozice: Pozice2D; cil: Pozice2D }
const oblast = (id: string) => {
  const nalezena = OBLASTI_SVETA.find(o => o.id === id)
  if (!nalezena) throw new Error(`Neznámá oblast: ${id}`)
  return nalezena
}
const brana = (odkud: string, kam: string): BranaRegionu => ({
  id: `${odkud}--${kam}`, odkud, kam,
  pozice: { ...oblast(odkud).stred }, cil: { ...oblast(kam).stred },
})
export const BRANY_REGIONU: readonly BranaRegionu[] = [
  brana('vesnice', 'kristalova-mytina'),
  brana('kristalova-mytina', 'vesnice'),
  brana('kristalova-mytina', 'stiny-lesa'),
  brana('stiny-lesa', 'kristalova-mytina'),
  brana('stiny-lesa', 'haj-strazce'),
  brana('haj-strazce', 'stiny-lesa'),
]
export function branaVDosahu(pozice: Pozice2D, id: string): BranaRegionu | null {
  const nalezena = BRANY_REGIONU.find(b => b.id === id)
  return nalezena && Math.hypot(nalezena.pozice.x - pozice.x, nalezena.pozice.z - pozice.z) <= DOSAH_BRANY ? nalezena : null
}
