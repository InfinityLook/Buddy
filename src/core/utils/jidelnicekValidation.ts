import * as v from 'valibot'

// ==========================================
// Ověření Fitness Roomova jídelníčku — stejný "poškozená položka se
// tiše vyřadí, ne celé pole" tvar jako Form Checkova sanitizujSezeni /
// telesneMiryValidation.ts vedle.
// ==========================================

export interface JidloZaznam {
  id: string
  datum: string
  nazev: string
  kcal: number
}

const jeKladneCislo = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0

export const validateJidelnicekData = (data: unknown) => {
  const result = v.safeParse(v.array(v.unknown()), data)
  if (!result.success) {
    console.warn('Data jídelníčku neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const zaznamy: JidloZaznam[] = result.output
    .filter(
      (z): z is Record<string, unknown> =>
        !!z &&
        typeof z === 'object' &&
        typeof (z as Record<string, unknown>).id === 'string' &&
        typeof (z as Record<string, unknown>).datum === 'string' &&
        typeof (z as Record<string, unknown>).nazev === 'string' &&
        jeKladneCislo((z as Record<string, unknown>).kcal)
    )
    .map((z) => ({
      id: z.id as string,
      datum: z.datum as string,
      nazev: z.nazev as string,
      kcal: z.kcal as number,
    }))

  return { success: true as const, data: zaznamy }
}
