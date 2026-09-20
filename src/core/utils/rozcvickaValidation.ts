import * as v from 'valibot'

// ==========================================
// Ověření uloženého stavu RozcvickaCasovac.tsx (useRozcvickaStore.ts) —
// stejný "pole jednotlivě, v.unknown() + ruční predikát, ne v.nullable
// napřímo" tvar jako fitnessCilValidation.ts vedle: poškozená hodnota
// špatného typu spadne na bezpečnou výchozí, ne že by shodila celý objekt.
// ==========================================

const jePlatnyDen = (x: unknown): x is string | null =>
  x === null || (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x))

const jePlatnyPocet = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0

const RozcvickaSchema = v.object({
  posledniOdmenenyDen: v.optional(v.unknown()),
  pocetDokoncenychCelkem: v.optional(v.unknown()),
})

export const validateRozcvickaData = (data: unknown) => {
  const result = v.safeParse(RozcvickaSchema, data)
  if (!result.success) {
    console.warn('Data rozcvičky/jógy neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  return {
    success: true as const,
    data: {
      posledniOdmenenyDen: jePlatnyDen(result.output.posledniOdmenenyDen)
        ? result.output.posledniOdmenenyDen
        : null,
      pocetDokoncenychCelkem: jePlatnyPocet(result.output.pocetDokoncenychCelkem)
        ? result.output.pocetDokoncenychCelkem
        : 0,
    },
  }
}
