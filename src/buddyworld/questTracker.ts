import { UKOLY, type QuestDefinition, type QuestId } from './quests'
import type { VillageProgress } from './villageProgress'

export interface AktivniUkol {
  ukol: QuestDefinition
  index: number
  celkem: number
  pripraveno: boolean
  postup: string
}

/** Jeden sdílený zdroj pravdy pro HUD i deník; žádné přeskakování příběhu. */
export function aktivniUkol(splnene: readonly QuestId[], stav: VillageProgress): AktivniUkol | null {
  const hotove = new Set(splnene)
  const index = UKOLY.findIndex(q => !hotove.has(q.id))
  if (index < 0) return null
  const ukol = UKOLY[index]
  const cil = CILE[ukol.id]
  const skutecnost = cil ? Math.min(cil.hodnota(stav), cil.pozadovano) : 0
  return { ukol, index: index + 1, celkem: UKOLY.length,
    pripraveno: ukol.hotovo(stav),
    postup: cil ? `${skutecnost}/${cil.pozadovano}` : ukol.cil }
}

type Cil = { hodnota: (stav: VillageProgress) => number; pozadovano: number }
const CILE: Partial<Record<QuestId, Cil>> = {
  obrana_osady: { hodnota: s => s.porazeniNepratele, pozadovano: 3 },
  nova_vesnice: { hodnota: s => s.uroven, pozadovano: 2 },
  zkouska_odvahy: { hodnota: s => s.porazeniBossove, pozadovano: 1 },
  cesta_k_mestu: { hodnota: s => s.uroven, pozadovano: 3 },
  strazci_udoli: { hodnota: s => s.porazeniNepratele, pozadovano: 10 },
  novy_domov: { hodnota: s => s.uroven, pozadovano: 4 },
  stiny_se_vraceji: { hodnota: s => s.porazeniBossove, pozadovano: 2 },
  srdce_udoli: { hodnota: s => s.uroven, pozadovano: 5 },
  hranice_temnoty: { hodnota: s => s.porazeniNepratele, pozadovano: 20 },
  posledni_straz: { hodnota: s => s.porazeniBossove, pozadovano: 3 },
}
