import type { Pozice2D } from '../types'
import { TRI_PECETE_ID } from './triPecete'

/** První navazující výprava po probuzení tří pečetí. */
export const CHRAM_POZICE: Pozice2D = { x: 12, z: -12 }
export const CHRAM_DOSAH = 3.5
export const CHRAM_ODMENA = { drevo: 10, kamen: 15, krystaly: 12 } as const
export const CHRAM_PRIBEH = [
  'Za kamennou branou se ozve hlas prvního strážce: „Tři pečetě obnovily cestu, nikoliv naši sílu.“',
  'Buddy spatří na oltáři mapu údolí. Pod zemí se probouzí něco, co dávní strážci kdysi uzamkli.',
  'Strážce svěří hrdinovi první úkol: připravit vesnici na výpravu do hlubin chrámu.',
] as const
export function vzdalenostOdChramu(pozice: Pozice2D): number {
  return Math.hypot(pozice.x - CHRAM_POZICE.x, pozice.z - CHRAM_POZICE.z)
}
export function lzeProzkoumatChram(udalosti: readonly string[], dokoncen: boolean, pozice: Pozice2D): boolean {
  return udalosti.includes(TRI_PECETE_ID) && !dokoncen && vzdalenostOdChramu(pozice) <= CHRAM_DOSAH
}
export const overDokoncenyChram = (hodnota: unknown): boolean => hodnota === true
