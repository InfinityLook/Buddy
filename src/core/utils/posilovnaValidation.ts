import * as v from 'valibot'

// ==========================================
// Ověření uložené historie Posilovny — stejný "poškozená položka se
// tiše vyřadí, ne celé pole" vzor jako behaniValidation.ts/ostatní
// miniaplikace.
// ==========================================

const SerieSchema = v.object({
  vahaKg: v.number(),
  opakovani: v.number(),
})

const CvikVSezeniSchema = v.object({
  nazev: v.string(),
  serie: v.array(SerieSchema),
})

export const PosilovaciSezeniSchema = v.object({
  id: v.string(),
  cviky: v.array(CvikVSezeniSchema),
  // Chybějící poznámka ve starším uloženém záznamu spadne na prázdný
  // řetězec, ne na chybu celé položky.
  poznamka: v.optional(v.string(), ''),
  createdAt: v.string(),
})

export const SablonaTreninkuSchema = v.object({
  id: v.string(),
  nazev: v.string(),
  cviky: v.array(v.string()),
})

export const PosilovnaStateSchema = v.object({
  sezeni: v.optional(v.array(v.unknown()), []),
  sablony: v.optional(v.array(v.unknown()), []),
})

export const validatePosilovnaData = (data: unknown) => {
  const result = v.safeParse(PosilovnaStateSchema, data)
  if (!result.success) {
    console.warn('Data Posilovny neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const sezeni = result.output.sezeni
    .map((s) => {
      const jedno = v.safeParse(PosilovaciSezeniSchema, s)
      return jedno.success ? jedno.output : null
    })
    .filter((s): s is v.Output<typeof PosilovaciSezeniSchema> => s !== null)

  const sablony = result.output.sablony
    .map((s) => {
      const jedna = v.safeParse(SablonaTreninkuSchema, s)
      return jedna.success ? jedna.output : null
    })
    .filter((s): s is v.Output<typeof SablonaTreninkuSchema> => s !== null)

  return { success: true as const, data: { sezeni, sablony } }
}
