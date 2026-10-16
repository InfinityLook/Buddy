import { UKOLY, type QuestDefinition, type QuestId } from './quests'
import type { VillageProgress } from './villageProgress'

/** První nedokončený úkol pro danou postavu; návaznost příběhu zůstává zachována. */
export function ukolProObyvatele(jmeno: string, splnene: readonly QuestId[]): QuestDefinition | null {
  const ids = new Set(splnene)
  const dalsi = UKOLY.find(q => !ids.has(q.id))
  return dalsi?.zadavatel.endsWith(jmeno) ? dalsi : null
}

export function stavUkolu(ukol: QuestDefinition, stav: VillageProgress): 'pripraveno' | 'probíhá' {
  return ukol.hotovo(stav) ? 'pripraveno' : 'probíhá'
}
