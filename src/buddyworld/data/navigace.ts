import type { Pozice2D } from '../types'
import type { QuestId } from '../quests'
import { OBLASTI_SVETA } from './oblasti'

/** Cíle příběhu odpovídají existujícím lokacím, nikoli imaginárním waypointům. */
const UKOL_CIL: Partial<Record<QuestId, string>> = {
  prvni_kroky: 'vesnice', obrana_osady: 'stiny-lesa', nova_vesnice: 'vesnice',
  zkouska_odvahy: 'haj-strazce', cesta_k_mestu: 'vesnice',
  strazci_udoli: 'stiny-lesa', novy_domov: 'vesnice',
  stiny_se_vraceji: 'haj-strazce', srdce_udoli: 'vesnice',
  hranice_temnoty: 'stiny-lesa', 'posledni_straz': 'haj-strazce', novy_usvit: 'vesnice',
}
export const oblastUkolu = (id: QuestId | undefined): string | null => id ? UKOL_CIL[id] ?? null : null
export const cilNavigace = (id: string | null) => OBLASTI_SVETA.find(o => o.id === id) ?? null
export function navigacniUdaje(pozice: Pozice2D, cil: Pozice2D) {
  const dx = cil.x - pozice.x
  const dz = cil.z - pozice.z
  const vzdalenost = Math.hypot(dx, dz)
  // Souřadnice scény: sever je -Z, východ +X.
  const stupne = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360
  return { vzdalenost, stupne, dosazeno: vzdalenost <= 2.5 }
}
