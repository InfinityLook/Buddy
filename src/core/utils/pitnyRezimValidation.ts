import * as v from 'valibot'

// ==========================================
// Ověření Fitness Roomova pitného režimu — dvě nezávislé hodnoty
// (denní počty sklenic podle data, cíl sklenic na den), stejný
// "poškozená položka/klíč se tiše vyřadí" tvar jako
// cvicebniPlanValidation.ts (denní záznam) a fitnessCilValidation.ts
// (jednoduchý cíl) vedle.
// ==========================================

const jeKladneCeleCislo = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0 && Number.isInteger(x)

const jePlatnyDatumKlic = (klic: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(klic)

export const validatePitnyRezimPocty = (data: unknown) => {
  const result = v.safeParse(v.record(v.string(), v.unknown()), data)
  if (!result.success) {
    console.warn('Data pitného režimu neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const pocty: Record<string, number> = {}
  for (const [klic, hodnota] of Object.entries(result.output)) {
    if (!jePlatnyDatumKlic(klic)) continue
    if (!jeKladneCeleCislo(hodnota)) continue
    pocty[klic] = hodnota
  }
  return { success: true as const, data: pocty }
}

export const validatePitnyRezimCil = (x: unknown): number | null =>
  typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : null
