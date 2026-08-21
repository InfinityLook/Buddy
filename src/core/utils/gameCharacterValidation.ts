import * as v from 'valibot'

// ==========================================
// Ověření zvolené postavy načtené z úložiště. Neznámé/poškozené id
// znamená "postava nevybrána", ne pád na výchozí postavu — hráč pak
// prostě znovu uvidí výběr, což je bezpečnější než mu tiše přiřadit
// někoho, koho nezvolil.
// ==========================================

export const GameCharacterSchema = v.object({
  postavaId: v.optional(
    v.nullable(v.picklist(['andel', 'aryn', 'gron', 'mya', 'loxen'])),
    null
  ),
})

export const validateGameCharacterData = (data: unknown) => {
  const result = v.safeParse(GameCharacterSchema, data)
  if (result.success) {
    return { success: true as const, data: result.output }
  }
  console.warn('Data zvolené postavy neodpovídají schématu:', result.issues)
  return { success: false as const, issues: result.issues }
}
