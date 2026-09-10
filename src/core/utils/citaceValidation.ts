import * as v from 'valibot'
import { Citace, TYPY_ZDROJE } from '@/miniapps/citace/types'

// ==========================================
// Ověření uložených Citací — stejný "poškozená položka se tiše
// vyřadí" vzor jako ostatní miniaplikace.
// ==========================================

const PLATNE_TYPY = TYPY_ZDROJE.map((t) => t.id)

export const CitaceSchema = v.object({
  id: v.string(),
  typ: v.string(),
  autor: v.optional(v.string(), ''),
  nazev: v.optional(v.string(), ''),
  rok: v.optional(v.string(), ''),
  vydavatelNeboWeb: v.optional(v.string(), ''),
  url: v.optional(v.string(), ''),
  datumCitace: v.optional(v.string(), ''),
  createdAt: v.optional(v.string(), ''),
})

export const CitaceDataSchema = v.object({
  citace: v.optional(v.array(v.unknown()), []),
})

const sanitizujCitaci = (raw: unknown): Citace | null => {
  const jedna = v.safeParse(CitaceSchema, raw)
  if (!jedna.success) return null
  const data = jedna.output
  if (!(PLATNE_TYPY as string[]).includes(data.typ)) return null
  return { ...data, typ: data.typ as Citace['typ'] }
}

export const validateCitaceData = (data: unknown) => {
  const result = v.safeParse(CitaceDataSchema, data)
  if (!result.success) {
    console.warn('Data Citací neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const citace = result.output.citace
    .map(sanitizujCitaci)
    .filter((c): c is Citace => c !== null)

  return { success: true as const, data: { citace } }
}
