export interface MindNode {
  id: string
  text: string
  parentId: string | null
  childrenIds: string[]
  /** Volitelná barva uzlu — pevná paleta (viz BARVY_UZLU), null/chybí = bez barvy. */
  barva?: BarvaUzlu | null
  /** Volitelná delší poznámka k tématu — zobrazuje se jen v panelu vybraného uzlu. */
  poznamka?: string
  /** Volitelný krátký štítek, volný text — zobrazuje se jen v panelu vybraného uzlu. */
  tag?: string
}

// Pevná paleta barev uzlu — appka má přesně šest hlavních akcentových
// barev (viz styles/global.css's --accent-*), stejná sada jako Kalendářovo
// BARVY_DNE — "pevná nabídka, ne libovolný vstup" (stejný duch jako
// Social's IKONY_SKUPIN/EMOJI_REAKCI). Vlastní kopie, ne import z
// Kalendáře — miniaplikace mají zůstat samostatné, i když sdílí stejnou
// šestici hodnot.
export const BARVY_UZLU = ['cyan', 'violet', 'magenta', 'green', 'orange', 'red'] as const
export type BarvaUzlu = (typeof BARVY_UZLU)[number]
