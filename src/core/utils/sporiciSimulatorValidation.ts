import * as v from 'valibot'
import { SporiciScenar } from '@/miniapps/sporici-simulator/types'

// ==========================================
// Ověření uložených scénářů Spořicího simulátoru — stejný "poškozená
// položka se tiše vyřadí, ne celý seznam" vzor jako ostatní miniaplikace.
// ==========================================

export const SporiciScenarSchema = v.object({
  id: v.string(),
  nazev: v.optional(v.string(), ''),
  pocatecniVklad: v.optional(v.number(), 0),
  mesicniVklad: v.optional(v.number(), 0),
  rocniUrokProcenta: v.optional(v.number(), 0),
  pocetLet: v.optional(v.number(), 1),
  createdAt: v.optional(v.string(), ''),
})

export const SporiciSimulatorDataSchema = v.object({
  scenare: v.optional(v.array(v.unknown()), []),
})

const sanitizujScenar = (raw: unknown): SporiciScenar | null => {
  const jeden = v.safeParse(SporiciScenarSchema, raw)
  if (!jeden.success) return null
  const data = jeden.output
  if (!data.nazev) return null
  return {
    ...data,
    pocatecniVklad: Math.max(0, data.pocatecniVklad),
    mesicniVklad: Math.max(0, data.mesicniVklad),
    rocniUrokProcenta: Math.max(0, data.rocniUrokProcenta),
    pocetLet: Math.max(1, Math.round(data.pocetLet)),
  }
}

export const validateSporiciSimulatorData = (data: unknown) => {
  const result = v.safeParse(SporiciSimulatorDataSchema, data)
  if (!result.success) {
    console.warn('Data Spořicího simulátoru neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const scenare = result.output.scenare
    .map(sanitizujScenar)
    .filter((s): s is SporiciScenar => s !== null)

  return { success: true as const, data: { scenare } }
}
