import * as v from 'valibot'

// ==========================================
// Ověření vytvořených postav načtených z úložiště. Neznámé/poškozené id
// se z pole potichu vyřadí, ne že by shodilo celé pole na prázdné —
// jedna poškozená položka nemá smysl brát hráči zbytek rozdělané party.
// Proto se pole postav neověřuje jako celek přes v.array(v.picklist(...))
// (valibot by při jediné špatné položce shodil celé pole) — ověří se jen
// tvar (je to pole?) a každá položka se profiltruje ručně.
// ==========================================

export const POSTAVA_IDS = ['andel', 'aryn', 'gron', 'mya', 'loxen'] as const
export type PostavaIdValidni = (typeof POSTAVA_IDS)[number]

const jePlatneId = (id: unknown): id is PostavaIdValidni =>
  typeof id === 'string' && (POSTAVA_IDS as readonly string[]).includes(id)

export const GameCharacterSchema = v.object({
  postavy: v.optional(v.array(v.unknown()), []),
})

export const validateGameCharacterData = (data: unknown) => {
  const result = v.safeParse(GameCharacterSchema, data)
  if (!result.success) {
    console.warn('Data vytvořených postav neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  // Neplatná id se vyřadí; případné duplicity taky (starý formát mohl
  // ukládat jen jedno id, ale nová postava se nikdy nepřidává dvakrát).
  const postavy = [...new Set(result.output.postavy.filter(jePlatneId))]
  return { success: true as const, data: { postavy } }
}
