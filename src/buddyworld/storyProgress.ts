import { UKOLY, type QuestId } from './quests'

export interface PribehStav {
  dokonceno: number
  celkem: number
  procent: number
  kapitola: 1 | 2
  dokoncenaHra: boolean
  dalsiUkol: QuestId | null
}

/** Completion requires all quests, not only the final quest flag. */
export function zjistiPribeh(splnene: readonly QuestId[]): PribehStav {
  const ids = new Set(splnene)
  let dokonceno = 0
  for (const ukol of UKOLY) {
    if (!ids.has(ukol.id)) break
    dokonceno++
  }
  const celkem = UKOLY.length
  return {
    dokonceno, celkem,
    procent: celkem ? Math.round(dokonceno / celkem * 100) : 100,
    kapitola: dokonceno < 8 ? 1 : 2,
    dokoncenaHra: dokonceno === celkem,
    dalsiUkol: dokonceno < celkem ? UKOLY[dokonceno].id : null,
  }
}
