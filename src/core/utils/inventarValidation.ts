import * as v from 'valibot'
import { LUP } from '@/game/data/items'

// ==========================================
// Ověření obsahu batohu načteného z úložiště — stejný vzor jako
// core/utils/questValidation.ts: neplatné/neznámé id se tiše vyřadí
// místo aby shodily celý stav. Platná id se odvozují přímo z LUP,
// žádný zdvojený seznam. Počty se navíc ořezávají na celé nezáporné
// číslo — záporný nebo neceločíselný počet by v UI nedával smysl.
// ==========================================

const jePlatneId = (id: unknown): id is string => typeof id === 'string' && LUP.some((l) => l.id === id)

export const InventarSchema = v.object({
  predmety: v.optional(v.record(v.string(), v.unknown()), {}),
})

export const validateInventarData = (data: unknown) => {
  const result = v.safeParse(InventarSchema, data)
  if (!result.success) {
    console.warn('Data batohu neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const predmety: Record<string, number> = {}
  for (const [id, pocet] of Object.entries(result.output.predmety)) {
    if (!jePlatneId(id)) continue
    const cislo = typeof pocet === 'number' && Number.isFinite(pocet) ? Math.max(0, Math.floor(pocet)) : 0
    if (cislo > 0) predmety[id] = cislo
  }

  return { success: true as const, data: { predmety } }
}
