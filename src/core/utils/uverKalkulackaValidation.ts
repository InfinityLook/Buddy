import * as v from 'valibot'
import { Dluh } from '@/miniapps/uver-kalkulacka/types'

// ==========================================
// Ověření uložených dluhů Splátkového kalkulátoru — stejný "poškozená
// položka se tiše vyřadí, ne celý seznam" vzor jako ostatní miniaplikace.
// ==========================================

export const DluhSchema = v.object({
  id: v.string(),
  nazev: v.optional(v.string(), ''),
  zustatek: v.optional(v.number(), 0),
  urokRocniProcenta: v.optional(v.number(), 0),
  minimalniSplatka: v.optional(v.number(), 1),
})

export const UverKalkulackaDataSchema = v.object({
  dluhy: v.optional(v.array(v.unknown()), []),
})

const sanitizujDluh = (raw: unknown): Dluh | null => {
  const jeden = v.safeParse(DluhSchema, raw)
  if (!jeden.success) return null
  const data = jeden.output
  if (!data.nazev || data.zustatek <= 0) return null
  return {
    ...data,
    urokRocniProcenta: Math.max(0, data.urokRocniProcenta),
    minimalniSplatka: Math.max(1, data.minimalniSplatka),
  }
}

export const validateUverKalkulackaData = (data: unknown) => {
  const result = v.safeParse(UverKalkulackaDataSchema, data)
  if (!result.success) {
    console.warn('Data Splátkového kalkulátoru neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const dluhy = result.output.dluhy.map(sanitizujDluh).filter((d): d is Dluh => d !== null)

  return { success: true as const, data: { dluhy } }
}
