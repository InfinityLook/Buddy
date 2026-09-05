import * as v from 'valibot'

// ==========================================
// Ověření dat appky Kniha (Writer's Room) načtených z úložiště. Stejná
// "poškozená položka se zahodí, ne že by shodila celý seznam" zásada
// jako musicStudioValidation.ts/gameCharacterValidation.ts.
// ==========================================

const sanitizujKapitolu = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.nazev !== 'string' || typeof d.text !== 'string' || typeof d.createdAt !== 'string') {
    return null
  }
  return { id: d.id, nazev: d.nazev, text: d.text, createdAt: d.createdAt }
}

const sanitizujKnihu = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.nazev !== 'string' || typeof d.createdAt !== 'string') return null
  const jePlatnyCil = (x: unknown): x is number | null => x === null || (typeof x === 'number' && Number.isFinite(x))
  if (!jePlatnyCil(d.cilSlov)) return null

  const kapitoly = Array.isArray(d.kapitoly) ? d.kapitoly.map(sanitizujKapitolu).filter((k): k is NonNullable<typeof k> => k !== null) : []

  return { id: d.id, nazev: d.nazev, cilSlov: d.cilSlov, kapitoly, createdAt: d.createdAt }
}

const BookWriterSchema = v.object({
  knihy: v.optional(v.array(v.unknown()), []),
})

export const validateBookWriterData = (data: unknown) => {
  const result = v.safeParse(BookWriterSchema, data)
  if (!result.success) {
    console.warn('Data Knihy neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  return {
    success: true as const,
    data: {
      knihy: result.output.knihy.map(sanitizujKnihu).filter((k): k is NonNullable<typeof k> => k !== null),
    },
  }
}
