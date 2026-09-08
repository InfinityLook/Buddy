import * as v from 'valibot'
import { BARVY_DNE } from '@/miniapps/kalendar/types'

// ==========================================
// Ověření uložených událostí Kalendáře — stejný "nedůvěřuj uloženým
// datům naslepo" vzor jako u ostatních miniaplikací (viz questValidation.ts).
// ==========================================

export const UdalostSchema = v.object({
  id: v.string(),
  datum: v.string(),
  nazev: v.string(),
  popis: v.optional(v.string(), ''),
  createdAt: v.optional(v.number(), 0),
})

export const KalendarSchema = v.object({
  udalosti: v.optional(v.array(v.unknown()), []),
  // Mapa datum -> barva, nepovinná (starší uložený stav ji vůbec neměl).
  // Přijde jako obecný objekt (JSON nemá Record typ), ověřuje se až níž
  // položku po položce, stejně jako pole udalosti.
  barvyDni: v.optional(v.record(v.string(), v.unknown()), {}),
})

export const validateKalendarData = (data: unknown) => {
  const result = v.safeParse(KalendarSchema, data)
  if (!result.success) {
    console.warn('Data Kalendáře neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  // Poškozené/neplatné jednotlivé události se tiše vyřadí, ne aby
  // shodily celý seznam — stejná odolnost jako u ostatních storů.
  const udalosti = result.output.udalosti
    .map((u) => {
      const jedna = v.safeParse(UdalostSchema, u)
      return jedna.success ? jedna.output : null
    })
    .filter((u): u is v.Output<typeof UdalostSchema> => u !== null)

  // Stejně tak barva u jednoho dne mimo pevnou paletu (BARVY_DNE) se
  // jen tiše vynechá, ne aby to shodilo celou mapu.
  const barvyDni: Record<string, (typeof BARVY_DNE)[number]> = {}
  for (const [datum, barva] of Object.entries(result.output.barvyDni)) {
    if (typeof barva === 'string' && (BARVY_DNE as readonly string[]).includes(barva)) {
      barvyDni[datum] = barva as (typeof BARVY_DNE)[number]
    }
  }

  return { success: true as const, data: { udalosti, barvyDni } }
}
