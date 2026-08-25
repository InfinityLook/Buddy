import * as v from 'valibot'
import { QUESTS } from '@/game/data/quests'

// ==========================================
// Ověření questového postupu načteného z úložiště — stejný vzor jako
// core/utils/gameCharacterValidation.ts: neplatné/neznámé id se tiše
// vyřadí z pole místo aby shodily celý stav. Platná id se odvozují
// přímo z QUESTS (questy i jejich cíle), takže smazání/přejmenování
// questu nebo cíle v datech ho automaticky vyřadí i tady, žádný
// zdvojený seznam id.
//
// splneneCile je navíc ověřené na dvou úrovních — nejdřív že questId
// existuje, pak že každé cilId doopravdy patří TOMU konkrétnímu
// questu (cíle dvou různých questů mají oddělené prostory id).
// ==========================================

const jePlatneQuestId = (id: unknown): id is string => typeof id === 'string' && QUESTS.some((q) => q.id === id)

export const QuestSchema = v.object({
  aktivni: v.optional(v.array(v.unknown()), []),
  dokoncene: v.optional(v.array(v.unknown()), []),
  splneneCile: v.optional(v.record(v.string(), v.array(v.unknown())), {}),
})

export const validateQuestData = (data: unknown) => {
  const result = v.safeParse(QuestSchema, data)
  if (!result.success) {
    console.warn('Data questů neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const aktivni = [...new Set(result.output.aktivni.filter(jePlatneQuestId))]
  const dokoncene = [...new Set(result.output.dokoncene.filter(jePlatneQuestId))]

  const splneneCile: Record<string, string[]> = {}
  for (const [questId, cileRaw] of Object.entries(result.output.splneneCile)) {
    if (!jePlatneQuestId(questId)) continue
    const platnaCilId = new Set(QUESTS.find((q) => q.id === questId)!.cile.map((c) => c.id))
    const cile = [...new Set(cileRaw.filter((c): c is string => typeof c === 'string' && platnaCilId.has(c)))]
    if (cile.length > 0) splneneCile[questId] = cile
  }

  return { success: true as const, data: { aktivni, dokoncene, splneneCile } }
}
