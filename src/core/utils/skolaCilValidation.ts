import * as v from 'valibot'

// ==========================================
// Ověření School Roomova studijního cíle — stejný "kladné číslo nebo
// null, nikdy nic jiného" tvar jako Writer's Roomův
// writerRoomCilValidation.ts. v.unknown() na obou polích schválně,
// nikdy v.nullable(v.number()) — poškozená hodnota špatného typu
// (třeba řetězec) by jinak shodila validaci CELÉHO objektu, ne jen
// spadla na null.
// ==========================================

const jePlatnyCil = (x: unknown): x is number | null =>
  x === null || (typeof x === 'number' && Number.isFinite(x) && x >= 0)

// Cílový průměr žije na stejné škále jako Známky (1 výborně–5
// nedostatečně) — mimo ten rozsah by "cíl" nedával žádný smysl, tak se
// stejně jako u ostatních polí tiše vrátí null, poškozená stará data
// nemají shodit celý store.
const jePlatnyCilPrumeru = (x: unknown): x is number | null =>
  x === null || (typeof x === 'number' && Number.isFinite(x) && x >= 1 && x <= 5)

const SkolaCilSchema = v.object({
  cilDenniMinut: v.optional(v.unknown()),
  cilTydenniMinut: v.optional(v.unknown()),
  cilPrumeru: v.optional(v.unknown()),
})

export const validateSkolaCilData = (data: unknown) => {
  const result = v.safeParse(SkolaCilSchema, data)
  if (!result.success) {
    console.warn('Data studijního cíle neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  return {
    success: true as const,
    data: {
      cilDenniMinut: jePlatnyCil(result.output.cilDenniMinut) ? result.output.cilDenniMinut : null,
      cilTydenniMinut: jePlatnyCil(result.output.cilTydenniMinut) ? result.output.cilTydenniMinut : null,
      cilPrumeru: jePlatnyCilPrumeru(result.output.cilPrumeru) ? result.output.cilPrumeru : null,
    },
  }
}
