import * as v from 'valibot'

// ==========================================
// Ověření Fitness Roomova deníku tělesných měr — stejný "poškozená
// položka se tiše vyřadí, ne celé pole" tvar jako Form Checkova
// sanitizujSezeni, jen tady navíc s v.array() jako vstupní hlídkou, že
// jde vůbec o pole (stejný pár jako u fitnessCilValidation.ts vedle).
// ==========================================

export interface ZaznamMiry {
  id: string
  datum: string
  vahaKg: number | null
  obvodPasuCm: number | null
}

const jeKladneCisloNeboNull = (x: unknown): x is number | null =>
  x === null || (typeof x === 'number' && Number.isFinite(x) && x > 0)

export const validateTelesneMiryData = (data: unknown) => {
  const result = v.safeParse(v.array(v.unknown()), data)
  if (!result.success) {
    console.warn('Data tělesných měr neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const zaznamy: ZaznamMiry[] = result.output
    .filter(
      (z): z is Record<string, unknown> =>
        !!z &&
        typeof z === 'object' &&
        typeof (z as Record<string, unknown>).id === 'string' &&
        typeof (z as Record<string, unknown>).datum === 'string'
    )
    .map((z) => ({
      id: z.id as string,
      datum: z.datum as string,
      vahaKg: jeKladneCisloNeboNull(z.vahaKg) ? (z.vahaKg as number | null) : null,
      obvodPasuCm: jeKladneCisloNeboNull(z.obvodPasuCm) ? (z.obvodPasuCm as number | null) : null,
    }))

  return { success: true as const, data: zaznamy }
}
