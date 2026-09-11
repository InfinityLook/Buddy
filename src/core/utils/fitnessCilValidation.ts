import * as v from 'valibot'

// ==========================================
// Ověření Fitness Roomova cíle — stejný "kladné číslo nebo null, nikdy
// nic jiného" tvar jako School Roomův skolaCilValidation.ts. v.unknown()
// na všech polích schválně, nikdy v.nullable(v.number()) — poškozená
// hodnota špatného typu (třeba řetězec) by jinak shodila validaci CELÉHO
// objektu, ne jen spadla na null.
// ==========================================

const jePlatnyCil = (x: unknown): x is number | null =>
  x === null || (typeof x === 'number' && Number.isFinite(x) && x > 0)

const FitnessCilSchema = v.object({
  cilKcal: v.optional(v.unknown()),
  cilTreninkMin: v.optional(v.unknown()),
  cilTreninkuTydne: v.optional(v.unknown()),
})

export const validateFitnessCilData = (data: unknown) => {
  const result = v.safeParse(FitnessCilSchema, data)
  if (!result.success) {
    console.warn('Data fitness cíle neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  return {
    success: true as const,
    data: {
      cilKcal: jePlatnyCil(result.output.cilKcal) ? result.output.cilKcal : null,
      cilTreninkMin: jePlatnyCil(result.output.cilTreninkMin) ? result.output.cilTreninkMin : null,
      cilTreninkuTydne: jePlatnyCil(result.output.cilTreninkuTydne) ? result.output.cilTreninkuTydne : null,
    },
  }
}
