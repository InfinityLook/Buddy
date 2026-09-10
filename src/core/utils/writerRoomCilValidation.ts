import * as v from 'valibot'

// ==========================================
// Ověření dat psacího cíle Writer's Roomu (useWriterRoomCil.ts). Obě
// pole jsou volitelná čísla nebo null — poškozená/neplatná hodnota
// spadne na null (žádný cíl), stejná "bezpečný směr je nic nepovolit"
// zásada jako roleUtils.ts jinde v appce, tady aplikovaná na osobní
// preferenci, ne na oprávnění.
// ==========================================

const jePlatnyCil = (x: unknown): x is number | null =>
  x === null || (typeof x === 'number' && Number.isFinite(x) && x >= 0)

const WriterRoomCilSchema = v.object({
  cilDenne: v.optional(v.unknown()),
  cilTydenne: v.optional(v.unknown()),
})

export const validateWriterRoomCilData = (data: unknown) => {
  const result = v.safeParse(WriterRoomCilSchema, data)
  if (!result.success) {
    console.warn('Data psacího cíle Writer\'s Roomu neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  return {
    success: true as const,
    data: {
      cilDenne: jePlatnyCil(result.output.cilDenne) ? result.output.cilDenne : null,
      cilTydenne: jePlatnyCil(result.output.cilTydenne) ? result.output.cilTydenne : null,
    },
  }
}
