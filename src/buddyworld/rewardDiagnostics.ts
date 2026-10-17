import { stavOdmeny } from './rewardJournal'
/** Read-only audit of quest completion and durable reward markers.
 * Does not mutate state or automatically replay rewards: replay could duplicate XP/resources.
 * A marker means reserved, not proof that all effects were persisted. */
export interface OdmenyStorage { getItem(key: string): string | null }
export interface NesouladOdmen {
  vyprava: string
  druh: 'dokonceno-bez-rezervace' | 'rezervovano-bez-dokonceni' | 'neplatny-zaznam' | 'odmena-ceka-na-kontrolu'
}
export const KONTROLOVANE_ODMENY = [
  ['buddyworld-ztracene-svetlo-v1', 'buddyworld-ztracene-svetlo-odmena-v1'],
  ['buddyworld-ozveny-krystalu-v1', 'buddyworld-ozveny-krystalu-odmena-v1'],
  ['buddyworld-srdce-mytiny-v1', 'buddyworld-srdce-mytiny-odmena-v1'],
] as const
export function diagnostikaOdmen(storage: OdmenyStorage): NesouladOdmen[] {
  const chyby: NesouladOdmen[] = []
  for (const [questKey, rewardKey] of KONTROLOVANE_ODMENY) {
    try {
      const raw = storage.getItem(questKey)
      const rewardState = stavOdmeny(storage, rewardKey)
      const marked = rewardState === 'dokonceno' || rewardState === 'rezervovano'
      if (rewardState === 'rezervovano' || rewardState === 'neznamy') chyby.push({ vyprava: questKey, druh: 'odmena-ceka-na-kontrolu' })
      if (raw === null) {
        if (marked) chyby.push({ vyprava: questKey, druh: 'rezervovano-bez-dokonceni' })
        continue
      }
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || typeof (parsed as { odmenaPrevzata?: unknown }).odmenaPrevzata !== 'boolean') {
        chyby.push({ vyprava: questKey, druh: 'neplatny-zaznam' }); continue
      }
      const completed = (parsed as { odmenaPrevzata: boolean }).odmenaPrevzata
      if (completed && !marked) chyby.push({ vyprava: questKey, druh: 'dokonceno-bez-rezervace' })
      if (!completed && marked) chyby.push({ vyprava: questKey, druh: 'rezervovano-bez-dokonceni' })
    } catch {
      chyby.push({ vyprava: questKey, druh: 'neplatny-zaznam' })
    }
  }
  return chyby
}
