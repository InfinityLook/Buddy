import * as v from 'valibot'

// ==========================================
// Ověření dat appky Komiks (Writer's Room). Stejná "poškozená položka
// se zahodí po jedné" zásada jako bookWriterValidation.ts/
// screenplayWriterValidation.ts vedle.
// ==========================================

const sanitizujRadek = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (
    typeof d.id !== 'string' ||
    typeof d.postava !== 'string' ||
    typeof d.text !== 'string' ||
    (d.typ !== 'dialog' && d.typ !== 'popisek')
  ) {
    return null
  }
  return { id: d.id, typ: d.typ as 'dialog' | 'popisek', postava: d.postava, text: d.text }
}

const sanitizujPanel = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.vizual !== 'string') return null
  const radky = Array.isArray(d.radky) ? d.radky.map(sanitizujRadek).filter((r): r is NonNullable<typeof r> => r !== null) : []
  return { id: d.id, vizual: d.vizual, radky }
}

const sanitizujStranu = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.cislo !== 'number' || !Number.isFinite(d.cislo)) return null
  const panely = Array.isArray(d.panely) ? d.panely.map(sanitizujPanel).filter((p): p is NonNullable<typeof p> => p !== null) : []
  return { id: d.id, cislo: d.cislo, panely }
}

const sanitizujKomiks = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.nazev !== 'string' || typeof d.createdAt !== 'string') return null
  const strany = Array.isArray(d.strany) ? d.strany.map(sanitizujStranu).filter((s): s is NonNullable<typeof s> => s !== null) : []
  return { id: d.id, nazev: d.nazev, strany, createdAt: d.createdAt }
}

const ComicWriterSchema = v.object({
  komiksy: v.optional(v.array(v.unknown()), []),
})

export const validateComicWriterData = (data: unknown) => {
  const result = v.safeParse(ComicWriterSchema, data)
  if (!result.success) {
    console.warn('Data Komiksu neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  return {
    success: true as const,
    data: {
      komiksy: result.output.komiksy.map(sanitizujKomiks).filter((k): k is NonNullable<typeof k> => k !== null),
    },
  }
}
