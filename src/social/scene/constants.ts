// ==========================================
// Ambientní koule v pozadí Socialu — data, ne kód.
//
// Pevná sada, ne náhoda při každém načtení: se stejnou appkou by mělo
// pozadí vypadat stejně, ne se pokaždé přeskládat. Barvy jsou ty samé tři
// akcenty, co všude jinde (cyan, violet, magenta) — pozadí má ladit
// s odznaky a tlačítky, ne vypadat jako cizí paleta.
// ==========================================

export interface KouleDef {
  /** Pozice ve scéně — x/y kolem středu, z je hloubka (dál = menší) */
  pozice: [number, number, number]
  polomer: number
  barva: string
  /** Fáze a rychlost vlastního nadechování nahoru/dolů, ať koule
   *  nedýchají všechny ve stejném rytmu. */
  faze: number
  rychlost: number
}

export const KOULE: KouleDef[] = [
  { pozice: [-7, 3, -4], polomer: 1.6, barva: '#35c4f0', faze: 0, rychlost: 0.5 },
  { pozice: [6, -2, -2], polomer: 2.1, barva: '#8a5cf6', faze: 1.4, rychlost: 0.4 },
  { pozice: [-3, -4, -6], polomer: 1.3, barva: '#ec4899', faze: 2.6, rychlost: 0.6 },
  { pozice: [8, 4, -7], polomer: 1.1, barva: '#35c4f0', faze: 3.7, rychlost: 0.45 },
  { pozice: [2, 6, -3], polomer: 0.9, barva: '#8a5cf6', faze: 0.8, rychlost: 0.55 },
  { pozice: [-8, -1, -8], polomer: 1.8, barva: '#ec4899', faze: 4.9, rychlost: 0.35 },
]
