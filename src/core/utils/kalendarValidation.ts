import * as v from 'valibot'
import { BARVY_DNE, BarvaDneZaznam, MOZNOSTI_OPAKOVANI, Udalost } from '@/miniapps/kalendar/types'

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
  // Nepovinné a s výchozí hodnotou 'zadne' — starší uložená událost
  // tohle pole vůbec neměla, opakování tedy nikdy nevzniklo, dokud pro
  // ni odpovídá to samé, co dřív dělala jediná existující chování.
  opakovani: v.optional(v.picklist(MOZNOSTI_OPAKOVANI), 'zadne'),
  // Nepovinné — starší uložená událost (před cloudovou synchronizací,
  // viz skolaSync.ts) tahle pole vůbec neměla.
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.nullable(v.number()), null),
})

export const BarvaDneZaznamSchema = v.object({
  id: v.string(),
  datum: v.string(),
  barva: v.string(),
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.nullable(v.number()), null),
})

export const KalendarSchema = v.object({
  udalosti: v.optional(v.array(v.unknown()), []),
  // Nový (pole záznamů, viz BarvaDneZaznam v types.ts) i starší (Record
  // datum -> barva) tvar dochází ve stejném poli — validateKalendarData
  // níž pozná, který dorazil, a starší tvar tiše převede na ten nový.
  barvyDniZaznamy: v.optional(v.array(v.unknown())),
  barvyDni: v.optional(v.record(v.string(), v.unknown())),
})

/** Starší uložený tvar barev dní (Record<datum, barva>) na nový (pole
 *  BarvaDneZaznam) — updatedAt: 0 schválně (appka nezná skutečný čas
 *  záznamu), stejná úvaha jako Rozvrhova zLegacyDochazky. */
const zLegacyBarevDni = (barvyDni: Record<string, unknown>): BarvaDneZaznam[] =>
  Object.entries(barvyDni)
    .filter((pair): pair is [string, string] => typeof pair[1] === 'string' && (BARVY_DNE as readonly string[]).includes(pair[1]))
    .map(([datum, barva]) => ({
      id: datum,
      datum,
      barva: barva as BarvaDneZaznam['barva'],
      updatedAt: 0,
      deletedAt: null,
    }))

export const validateKalendarData = (data: unknown) => {
  const result = v.safeParse(KalendarSchema, data)
  if (!result.success) {
    console.warn('Data Kalendáře neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  // Poškozené/neplatné jednotlivé události se tiše vyřadí, ne aby
  // shodily celý seznam — stejná odolnost jako u ostatních storů.
  const udalosti: Udalost[] = result.output.udalosti
    .map((u) => {
      const jedna = v.safeParse(UdalostSchema, u)
      if (!jedna.success) return null
      const { id, datum, nazev, popis, createdAt, opakovani, updatedAt, deletedAt } = jedna.output
      return {
        id,
        datum,
        nazev,
        popis,
        createdAt,
        opakovani,
        updatedAt: typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        deletedAt,
      }
    })
    .filter((u): u is Udalost => u !== null)

  // Stejně tak barva u jednoho dne mimo pevnou paletu (BARVY_DNE) se
  // jen tiše vynechá, ne aby to shodilo celou mapu.
  const surovaBarvyDniZaznamy = Array.isArray(result.output.barvyDniZaznamy)
    ? result.output.barvyDniZaznamy
    : result.output.barvyDni
      ? zLegacyBarevDni(result.output.barvyDni)
      : []

  const barvyDniZaznamy: BarvaDneZaznam[] = surovaBarvyDniZaznamy
    .map((z) => {
      const jedna = v.safeParse(BarvaDneZaznamSchema, z)
      if (!jedna.success) return null
      const { id, datum, barva, updatedAt, deletedAt } = jedna.output
      if (!(BARVY_DNE as readonly string[]).includes(barva)) return null
      return {
        id,
        datum,
        barva: barva as BarvaDneZaznam['barva'],
        updatedAt: typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        deletedAt,
      }
    })
    .filter((z): z is BarvaDneZaznam => z !== null)

  return { success: true as const, data: { udalosti, barvyDniZaznamy } }
}
