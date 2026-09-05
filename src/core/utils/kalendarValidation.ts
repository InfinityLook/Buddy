import * as v from 'valibot'

// ==========================================
// Ověření uložených událostí Kalendáře — stejný "nedůvěřuj uloženým
// datům naslepo" vzor jako u ostatních miniaplikací (viz questValidation.ts).
// ==========================================

export const UdalostSchema = v.object({
  id: v.string(),
  datum: v.string(),
  nazev: v.string(),
  popis: v.optional(v.string(), ''),
  createdAt: v.optional(v.number(), 0),
})

export const KalendarSchema = v.object({
  udalosti: v.optional(v.array(v.unknown()), []),
})

export const validateKalendarData = (data: unknown) => {
  const result = v.safeParse(KalendarSchema, data)
  if (!result.success) {
    console.warn('Data Kalendáře neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  // Poškozené/neplatné jednotlivé události se tiše vyřadí, ne aby
  // shodily celý seznam — stejná odolnost jako u ostatních storů.
  const udalosti = result.output.udalosti
    .map((u) => {
      const jedna = v.safeParse(UdalostSchema, u)
      return jedna.success ? jedna.output : null
    })
    .filter((u): u is v.Output<typeof UdalostSchema> => u !== null)

  return { success: true as const, data: { udalosti } }
}
