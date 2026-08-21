// ==========================================
// `new Date().toISOString().slice(0, 10)` vypadá jako neškodný způsob,
// jak získat dnešní datum, ale ISO řetězec je vždycky v UTC — mezi
// půlnocí místního času a půlnocí UTC (u nás zhruba hodina až dvě,
// podle letního/zimního času) ukazuje jiný den, než jaký je na
// hodinkách. Streak (checkStreak v gamificationUtils.ts) si tak uměl
// připsat den o pár hodin dřív, nebo naopak nepoznal půlnoc včas.
// ==========================================

/** Dnešní datum ve formátu YYYY-MM-DD podle místního času zařízení. */
export const mistniDatum = (d: Date = new Date()): string => {
  const rok = d.getFullYear()
  const mesic = String(d.getMonth() + 1).padStart(2, '0')
  const den = String(d.getDate()).padStart(2, '0')
  return `${rok}-${mesic}-${den}`
}
