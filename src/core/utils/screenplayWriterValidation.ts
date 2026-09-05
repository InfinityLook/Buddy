import * as v from 'valibot'
import { TYPY_MIST } from '@/miniapps/screenplay-writer/types'

// ==========================================
// Ověření dat appky Scénář (Writer's Room). Stejná "poškozená položka
// se zahodí po jedné" zásada jako bookWriterValidation.ts vedle.
// ==========================================

const sanitizujPrvek = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string') return null

  if (d.typ === 'akce') {
    if (typeof d.text !== 'string') return null
    return { id: d.id, typ: 'akce' as const, text: d.text }
  }
  if (d.typ === 'dialog') {
    if (typeof d.postava !== 'string' || typeof d.text !== 'string' || typeof d.poznamka !== 'string') return null
    return { id: d.id, typ: 'dialog' as const, postava: d.postava, text: d.text, poznamka: d.poznamka }
  }
  return null
}

const sanitizujScenu = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (
    typeof d.id !== 'string' ||
    typeof d.misto !== 'string' ||
    typeof d.cas !== 'string' ||
    typeof d.createdAt !== 'string' ||
    typeof d.typMista !== 'string' ||
    !TYPY_MIST.includes(d.typMista as (typeof TYPY_MIST)[number])
  ) {
    return null
  }

  const prvky = Array.isArray(d.prvky) ? d.prvky.map(sanitizujPrvek).filter((p): p is NonNullable<typeof p> => p !== null) : []

  return { id: d.id, typMista: d.typMista as (typeof TYPY_MIST)[number], misto: d.misto, cas: d.cas, prvky, createdAt: d.createdAt }
}

const sanitizujScenar = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.nazev !== 'string' || typeof d.createdAt !== 'string') return null

  const sceny = Array.isArray(d.sceny) ? d.sceny.map(sanitizujScenu).filter((s): s is NonNullable<typeof s> => s !== null) : []

  return { id: d.id, nazev: d.nazev, sceny, createdAt: d.createdAt }
}

const ScreenplayWriterSchema = v.object({
  scenare: v.optional(v.array(v.unknown()), []),
})

export const validateScreenplayWriterData = (data: unknown) => {
  const result = v.safeParse(ScreenplayWriterSchema, data)
  if (!result.success) {
    console.warn('Data Scénáře neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  return {
    success: true as const,
    data: {
      scenare: result.output.scenare.map(sanitizujScenar).filter((s): s is NonNullable<typeof s> => s !== null),
    },
  }
}
