import * as v from 'valibot'
import { DNY_V_TYDNU, HodinaRozvrhu } from '@/miniapps/rozvrh/types'

// ==========================================
// Ověření uloženého Rozvrhu — stejný "poškozená položka se tiše
// vyřadí, ne celý seznam" vzor jako Kalendář a ostatní miniaplikace.
// ==========================================

const CAS_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
const DEN_IDS: number[] = DNY_V_TYDNU.map((d) => d.id)

export const HodinaRozvrhuSchema = v.object({
  id: v.string(),
  den: v.number(),
  casOd: v.string(),
  casDo: v.string(),
  predmet: v.string(),
  mistnost: v.optional(v.string(), ''),
  vyucujici: v.optional(v.string(), ''),
})

export const RozvrhSchema = v.object({
  hodiny: v.optional(v.array(v.unknown()), []),
  // Mapa klic (hodinaId::datum) -> byl/nebyl, nepovinná — starší
  // uložený stav ji vůbec neměl. Přijde jako obecný objekt, ověřuje se
  // až níž položku po položce, stejně jako u Kalendáře's barvyDni.
  dochazka: v.optional(v.record(v.string(), v.unknown()), {}),
})

export const validateRozvrhData = (data: unknown) => {
  const result = v.safeParse(RozvrhSchema, data)
  if (!result.success) {
    console.warn('Data Rozvrhu neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const hodiny: HodinaRozvrhu[] = result.output.hodiny
    .map((h) => {
      const jedna = v.safeParse(HodinaRozvrhuSchema, h)
      if (!jedna.success) return null
      const { id, den, casOd, casDo, predmet, mistnost, vyucujici } = jedna.output
      if (!DEN_IDS.includes(den)) return null
      if (!CAS_REGEX.test(casOd) || !CAS_REGEX.test(casDo)) return null
      if (!predmet.trim()) return null
      return { id, den: den as HodinaRozvrhu['den'], casOd, casDo, predmet, mistnost, vyucujici }
    })
    .filter((h): h is HodinaRozvrhu => h !== null)

  // Docházka na hodinu, co po sanitizaci výš vůbec neexistuje, se tiše
  // zahodí — jinak by se v datech mohly hromadit odkazy na nic.
  const platneIdHodin = new Set(hodiny.map((h) => h.id))
  const dochazka: Record<string, boolean> = {}
  for (const [klic, byl] of Object.entries(result.output.dochazka)) {
    if (typeof byl !== 'boolean') continue
    const hodinaId = klic.split('::')[0]
    if (!platneIdHodin.has(hodinaId)) continue
    dochazka[klic] = byl
  }

  return { success: true as const, data: { hodiny, dochazka } }
}
