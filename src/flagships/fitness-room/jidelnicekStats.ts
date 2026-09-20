import type { JidloZaznam } from '@/core/utils/jidelnicekValidation'

// ==========================================
// Odvozené hodnoty nad Jídelníčkem (useJidelnicek.ts) — čisté funkce,
// stejný důvod jako fitnessStats.ts/telesneMiryStats.ts vedle:
// testovatelné bez komponenty, žádné riziko rozjetí zobrazeného čísla
// od skutečné historie záznamů.
// ==========================================

const dnesniDatumIso = (ted = new Date()): string => {
  const rok = ted.getFullYear()
  const mesic = String(ted.getMonth() + 1).padStart(2, '0')
  const den = String(ted.getDate()).padStart(2, '0')
  return `${rok}-${mesic}-${den}`
}

/** Součet kalorií snězených daný den ('YYYY-MM-DD', výchozí dnešek). */
export const spocitejKalorieDne = (zaznamy: JidloZaznam[], datum = dnesniDatumIso()): number =>
  zaznamy.filter((z) => z.datum === datum).reduce((soucet, z) => soucet + z.kcal, 0)

export { dnesniDatumIso }
