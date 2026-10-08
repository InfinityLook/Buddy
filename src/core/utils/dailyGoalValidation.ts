import * as v from 'valibot'

// ==========================================
// Appka tu dřív validovala celé Hubovo "Dnešního cíle" (Krok 13) — tu
// kartu i celý její useDailyGoalStore.ts uživatel appku požádal
// odstranit úplně, zbyl jen tenhle jeden, dál potřebný kousek:
// validateDailyGoalDatum, co appka znovupoužívá i v
// useStreakWarningStore.ts (viz appčin vlastní komentář tam) pro
// úplně stejný nullable "YYYY-MM-DD" tvar. Appka si název souboru i
// funkce schválně nechala, i když appka Dnešní cíl samotný nemá — oba
// jen říkají, kde se tenhle validátor poprvé narodil, ne co dnes
// validuje jako jediné.
// ==========================================

const jePlatneDatum = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)

export const validateDailyGoalDatum = (data: unknown): string | null => {
  const result = v.safeParse(v.nullable(v.unknown()), data)
  if (!result.success || result.output === null) return null
  return jePlatneDatum(result.output) ? result.output : null
}
