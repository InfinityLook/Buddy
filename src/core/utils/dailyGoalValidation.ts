import * as v from 'valibot'

// ==========================================
// Ověření Hubova "Dnešního cíle" (Krok 13) — appka bez validního pole
// spadne na přesně stejný "ještě nic dnes nesplněno" výchozí stav, co
// appka ukazuje úplně prvnímu uživateli, co tuhle appku vůbec otevře,
// ať poškozená záloha nikdy neukáže ani falešně splněno, ani appku
// nezhavaruje.
// ==========================================

const jePlatneDatum = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)

export const validateDailyGoalDatum = (data: unknown): string | null => {
  const result = v.safeParse(v.nullable(v.unknown()), data)
  if (!result.success || result.output === null) return null
  return jePlatneDatum(result.output) ? result.output : null
}

export const validateDailyGoalSplneno = (data: unknown): boolean => {
  const result = v.safeParse(v.boolean(), data)
  return result.success ? result.output : false
}
