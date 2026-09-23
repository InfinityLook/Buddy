import * as v from 'valibot'

// ==========================================
// Ověření Fitness Roomova deníku spánku — appka nemá senzor spánku
// nikde v kódu, takže jde o čistě ruční záznam (hodiny spánku podle
// data) plus vlastní cíl, stejný "dvě nezávislé hodnoty, stejný
// poškozená-položka-se-tiše-vyřadí tvar" vzor jako
// pitnyRezimValidation.ts vedle — spánek je Fitness Roomova druhá
// appka s identickou "denní počet + vlastní cíl" strukturou.
// ==========================================

const jePlatnyPocetHodin = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 24

const jePlatnyDatumKlic = (klic: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(klic)

export const validateSpanekHodiny = (data: unknown) => {
  const result = v.safeParse(v.record(v.string(), v.unknown()), data)
  if (!result.success) {
    console.warn('Data spánku neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const hodiny: Record<string, number> = {}
  for (const [klic, hodnota] of Object.entries(result.output)) {
    if (!jePlatnyDatumKlic(klic)) continue
    if (!jePlatnyPocetHodin(hodnota)) continue
    hodiny[klic] = hodnota
  }
  return { success: true as const, data: hodiny }
}

/** Cíl hodin spánku — appka nedovolí víc než 24 h, stejně jako u
 *  jednotlivých záznamů výš. */
export const validateSpanekCil = (x: unknown): number | null =>
  typeof x === 'number' && Number.isFinite(x) && x > 0 && x <= 24 ? x : null
