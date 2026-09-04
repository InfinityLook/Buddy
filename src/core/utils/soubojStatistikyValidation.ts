import * as v from 'valibot'
import { POSTAVY } from '@/fighting/combat/postavy'

// ==========================================
// Ověření statistik Souboje načtených z úložiště — stejný vzor jako
// core/utils/inventarValidation.ts/questValidation.ts: neplatné id
// nebo poškozené číslo se tiše vyřadí/vynuluje, místo aby shodily
// celý stav. Platná id se odvozují přímo z POSTAVY, žádný zdvojený
// seznam.
// ==========================================

const jePlatnaPostava = (id: unknown): id is string => typeof id === 'string' && id in POSTAVY

const bezpecneCislo = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0)

export const SoubojStatistikySchema = v.object({
  vysledky: v.optional(v.record(v.string(), v.unknown()), {}),
})

export const validateSoubojStatistikyData = (data: unknown) => {
  const result = v.safeParse(SoubojStatistikySchema, data)
  if (!result.success) {
    console.warn('Statistiky Souboje neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const vysledky: Record<string, { vyhry: number; prohry: number; remizy: number }> = {}
  for (const [id, zaznam] of Object.entries(result.output.vysledky)) {
    if (!jePlatnaPostava(id)) continue
    const z = zaznam as Record<string, unknown> | null | undefined
    vysledky[id] = {
      vyhry: bezpecneCislo(z?.vyhry),
      prohry: bezpecneCislo(z?.prohry),
      remizy: bezpecneCislo(z?.remizy),
    }
  }

  return { success: true as const, data: { vysledky } }
}
