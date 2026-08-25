import * as v from 'valibot'
import { QUESTS } from '@/game/data/quests'

// ==========================================
// Ověření dokončených questů načtených z úložiště — stejný vzor jako
// core/utils/gameCharacterValidation.ts: neplatné/neznámé id se tiše
// vyřadí z pole místo aby shodily celý stav. Platná id se odvozují
// přímo z QUESTS, takže smazání/přejmenování questu v datech ho
// automaticky vyřadí i tady, žádný zdvojený seznam id.
// ==========================================

const jePlatneId = (id: unknown): id is string => typeof id === 'string' && QUESTS.some((q) => q.id === id)

export const QuestSchema = v.object({
  dokoncene: v.optional(v.array(v.unknown()), []),
})

export const validateQuestData = (data: unknown) => {
  const result = v.safeParse(QuestSchema, data)
  if (!result.success) {
    console.warn('Data questů neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const dokoncene = [...new Set(result.output.dokoncene.filter(jePlatneId))]
  return { success: true as const, data: { dokoncene } }
}
