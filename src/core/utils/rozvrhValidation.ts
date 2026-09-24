import * as v from 'valibot'
import { DNY_V_TYDNU, DochazkaZaznam, HodinaRozvrhu } from '@/miniapps/rozvrh/types'

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
  // Nepovinné — starší uložená hodina (před cloudovou synchronizací,
  // viz skolaSync.ts) tahle pole vůbec neměla.
  createdAt: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.nullable(v.number()), null),
})

export const DochazkaZaznamSchema = v.object({
  id: v.string(),
  hodinaId: v.string(),
  datum: v.string(),
  byl: v.boolean(),
  createdAt: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.nullable(v.number()), null),
})

export const RozvrhSchema = v.object({
  hodiny: v.optional(v.array(v.unknown()), []),
  // Nový (pole záznamů, viz DochazkaZaznam v types.ts) i starší (Record
  // klic -> byl, appka nikdy fyzicky nesmazala žádný uložený stav)
  // tvar dochází ve stejném poli — validateRozvrhData níž pozná, který
  // dorazil, a starší tvar tiše převede na ten nový.
  dochazkaZaznamy: v.optional(v.array(v.unknown())),
  dochazka: v.optional(v.record(v.string(), v.unknown())),
})

/** Starší uložený tvar docházky (Record<klic, byl>) na nový (pole
 *  DochazkaZaznam) — appka od teď dál ukládá jen nový tvar, tenhle běží
 *  jen jednou, při prvním načtení po vydání téhle verze. updatedAt: 0
 *  schválně (appka nezná skutečný čas záznamu) — jakýkoli reálný
 *  záznam z cloudu má vždycky vyšší updatedAt, a tak při prvním
 *  sloučení vyhraje, ne že by omylem přebil novější cloudová data. */
const zLegacyDochazky = (dochazka: Record<string, unknown>): DochazkaZaznam[] =>
  Object.entries(dochazka)
    .filter((pair): pair is [string, boolean] => typeof pair[1] === 'boolean')
    .map(([klic, byl]) => {
      const [hodinaId, datum] = klic.split('::')
      return {
        id: klic,
        hodinaId: hodinaId ?? '',
        datum: datum ?? '',
        byl,
        createdAt: new Date(0).toISOString(),
        updatedAt: 0,
        deletedAt: null,
      }
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
      const { id, den, casOd, casDo, predmet, mistnost, vyucujici, createdAt, updatedAt, deletedAt } = jedna.output
      if (!DEN_IDS.includes(den)) return null
      if (!CAS_REGEX.test(casOd) || !CAS_REGEX.test(casDo)) return null
      if (!predmet.trim()) return null
      return {
        id,
        den: den as HodinaRozvrhu['den'],
        casOd,
        casDo,
        predmet,
        mistnost,
        vyucujici,
        createdAt: createdAt ?? new Date().toISOString(),
        updatedAt: typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        deletedAt,
      }
    })
    .filter((h): h is HodinaRozvrhu => h !== null)

  // Docházka na hodinu, co po sanitizaci výš vůbec neexistuje (ani jako
  // smazaná) se tiše zahodí — jinak by se v datech mohly hromadit
  // odkazy na nic. Smazané (deletedAt) hodiny se ale počítají taky —
  // jejich vlastní docházka se má taky měkce smazat, ne zmizet zázrakem
  // beze stopy jen proto, že hodina sama zrovna teď leží v tombstonu.
  const platneIdHodin = new Set(hodiny.map((h) => h.id))

  const surovaDochazkaZaznamy = Array.isArray(result.output.dochazkaZaznamy)
    ? result.output.dochazkaZaznamy
    : result.output.dochazka
      ? zLegacyDochazky(result.output.dochazka)
      : []

  const dochazkaZaznamy: DochazkaZaznam[] = surovaDochazkaZaznamy
    .map((z) => {
      const jedna = v.safeParse(DochazkaZaznamSchema, z)
      if (!jedna.success) return null
      const { id, hodinaId, datum, byl, createdAt, updatedAt, deletedAt } = jedna.output
      if (!platneIdHodin.has(hodinaId)) return null
      return {
        id,
        hodinaId,
        datum,
        byl,
        createdAt: createdAt ?? new Date().toISOString(),
        updatedAt: typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        deletedAt,
      }
    })
    .filter((z): z is DochazkaZaznam => z !== null)

  return { success: true as const, data: { hodiny, dochazkaZaznamy } }
}
