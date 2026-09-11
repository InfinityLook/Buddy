import * as v from 'valibot'

// ==========================================
// Ověření Fitness Roomova cvičebního plánu (useCvicebniPlan.ts) — stejný
// "poškozená položka se tiše vyřadí, ne celý záznam" tvar jako
// telesneMiryValidation.ts vedle, jen tady se vyřazuje jednotlivý DEN
// plánu, ne položka pole.
//
// Vlastní plochá sada řetězců místo importu TypCviku z miniapps/form-check/
// types — core/utils/ tady záměrně nezávisí na konkrétní miniapce (stejná
// nezávislost, jakou má telesneMiryValidation.ts/fitnessCilValidation.ts
// vedle), přijatá malá duplikace stejná jako u BARVY_UZLU jinde v appce.
// ==========================================

export type DenVTydnu = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type HodnotaPlanu = 'dřep' | 'klik' | 'výpad' | 'prkno' | 'odpocinek'

const PLATNE_HODNOTY: HodnotaPlanu[] = ['dřep', 'klik', 'výpad', 'prkno', 'odpocinek']

export const validateCvicebniPlanData = (data: unknown) => {
  const result = v.safeParse(v.record(v.string(), v.unknown()), data)
  if (!result.success) {
    console.warn('Data cvičebního plánu neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const plan: Partial<Record<DenVTydnu, HodnotaPlanu>> = {}
  for (const [klic, hodnota] of Object.entries(result.output)) {
    const den = Number(klic)
    if (!Number.isInteger(den) || den < 1 || den > 7) continue
    if (!PLATNE_HODNOTY.includes(hodnota as HodnotaPlanu)) continue
    plan[den as DenVTydnu] = hodnota as HodnotaPlanu
  }
  return { success: true as const, data: plan }
}
