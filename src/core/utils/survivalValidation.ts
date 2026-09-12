import * as v from 'valibot'

// ==========================================
// Validace Survival Night's trvalého stavu (core/store/useSurvivalStore.ts).
// Stejný vzor jako walletValidation.ts/gamificationValidation.ts —
// poškozená/chybějící položka dostane bezpečnou výchozí hodnotu,
// nikdy nespadne celý store.
// ==========================================

export const SurvivalSchema = v.object({
  gold: v.optional(v.number([v.minValue(0)]), 0),
  krystal: v.optional(v.number([v.minValue(0)]), 0),
  nejvyssiVlna: v.optional(v.number([v.minValue(0)]), 0),
  celkemBehu: v.optional(v.number([v.minValue(0)]), 0),
  nejlepsiSkore: v.optional(v.number([v.minValue(0)]), 0),
  bossPorazenoCelkem: v.optional(v.number([v.minValue(0)]), 0),
  celkemPrezitySekund: v.optional(v.number([v.minValue(0)]), 0),
  odemceneZbrane: v.optional(v.array(v.string()), ['iron_sword']),
  odemcenePostavy: v.optional(v.array(v.string()), ['ranger']),
  vybranaZbran: v.optional(v.string(), 'iron_sword'),
})

export const validateSurvivalData = (data: unknown) => {
  const result = v.safeParse(SurvivalSchema, data)
  if (result.success) {
    return { success: true as const, data: result.output }
  }
  console.warn('Data Survival Night neodpovídají schématu (byla poškozena nebo změněna):', result.issues)
  return { success: false as const, issues: result.issues }
}
