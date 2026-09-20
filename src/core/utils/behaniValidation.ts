import * as v from 'valibot'

// ==========================================
// Ověření uložené historie Běhání/Kardio — stejný "poškozená položka se
// tiše vyřadí, ne celé pole" vzor jako kalendarValidation.ts/ostatní
// miniaplikace.
// ==========================================

const GpsBodSchema = v.object({
  lat: v.number(),
  lng: v.number(),
  cas: v.number(),
})

export const BehSezeniSchema = v.object({
  id: v.string(),
  typ: v.picklist(['beh', 'chuze', 'kolo']),
  vzdalenostM: v.number(),
  trvaniSekund: v.number(),
  odhadKcal: v.number(),
  trasa: v.array(GpsBodSchema),
  createdAt: v.string(),
})

export const BehaniStateSchema = v.object({
  sezeni: v.optional(v.array(v.unknown()), []),
})

export const validateBehaniData = (data: unknown) => {
  const result = v.safeParse(BehaniStateSchema, data)
  if (!result.success) {
    console.warn('Data Běhání/Kardio neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const sezeni = result.output.sezeni
    .map((s) => {
      const jedno = v.safeParse(BehSezeniSchema, s)
      return jedno.success ? jedno.output : null
    })
    .filter((s): s is v.Output<typeof BehSezeniSchema> => s !== null)

  return { success: true as const, data: { sezeni } }
}
