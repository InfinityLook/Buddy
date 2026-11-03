import * as v from 'valibot'
import { DNY_V_TYDNU, DochazkaZaznam, HodinaRozvrhu, Prazdniny, Presun, Semestr, ZrusenaHodina } from '@/miniapps/rozvrh/types'

// ==========================================
// Ověření uloženého Rozvrhu — stejný "poškozená položka se tiše
// vyřadí, ne celý seznam" vzor jako Kalendář a ostatní miniaplikace.
// ==========================================

const CAS_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
const DATUM_REGEX = /^\d{4}-\d{2}-\d{2}$/
const DEN_IDS: number[] = DNY_V_TYDNU.map((d) => d.id)
const TYDEN_CYKLY = ['kazdy', 'sudy', 'lichy'] as const

export const HodinaRozvrhuSchema = v.object({
  id: v.string(),
  den: v.number(),
  casOd: v.string(),
  casDo: v.string(),
  predmet: v.string(),
  mistnost: v.optional(v.string(), ''),
  vyucujici: v.optional(v.string(), ''),
  // Nepovinné — starší hodina (před Fází 3) tyden vůbec neměla, appka
  // ji odjakživa počítala jako 'kazdy' (viz tydenHodiny v types.ts).
  tyden: v.optional(v.picklist(TYDEN_CYKLY)),
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

export const PrazdninySchema = v.object({
  id: v.string(),
  nazev: v.string(),
  datumOd: v.string(),
  datumDo: v.string(),
  createdAt: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.nullable(v.number()), null),
})

export const ZrusenaHodinaSchema = v.object({
  id: v.string(),
  hodinaId: v.string(),
  datum: v.string(),
  createdAt: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.nullable(v.number()), null),
})

export const PresunSchema = v.object({
  id: v.string(),
  hodinaId: v.string(),
  puvodniDatum: v.string(),
  novyDatum: v.string(),
  novyCasOd: v.string(),
  novyCasDo: v.string(),
  createdAt: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.nullable(v.number()), null),
})

export const SemestrSchema = v.object({
  id: v.string(),
  nazev: v.string(),
  datumOd: v.string(),
  datumDo: v.string(),
  // Zmrzlý snímek — appka validuje jen tvar pole, jednotlivé hodiny
  // uvnitř sanitizuje stejnou HodinaRozvrhuSchema jako živý rozvrh
  // (viz validateRozvrhData), ne nutně dvakrát přesně stejně striktně.
  hodiny: v.optional(v.array(v.unknown()), []),
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
  // Fáze 3 (Školní roky/prázdniny/zrušení/přesuny) — nepovinné, starší
  // uložená data tahle pole vůbec neměla.
  prazdniny: v.optional(v.array(v.unknown()), []),
  zruseneHodiny: v.optional(v.array(v.unknown()), []),
  presuny: v.optional(v.array(v.unknown()), []),
  semestry: v.optional(v.array(v.unknown()), []),
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

/** Jedno pole hodin na HodinaRozvrhu[] sanitizované — appka ji volá
 *  jak pro živý rozvrh, tak pro zmrzlý snímek uvnitř každého
 *  archivovaného Semestru (sanitizujHodiny), ať obojí prochází
 *  přesně tou samou kontrolou, ne dvěma nezávislými kopiemi, co by se
 *  časem mohly rozejít. */
const sanitizujHodiny = (surove: unknown[]): HodinaRozvrhu[] =>
  surove
    .map((h): HodinaRozvrhu | null => {
      const jedna = v.safeParse(HodinaRozvrhuSchema, h)
      if (!jedna.success) return null
      const { id, den, casOd, casDo, predmet, mistnost, vyucujici, tyden, createdAt, updatedAt, deletedAt } =
        jedna.output
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
        tyden,
        createdAt: createdAt ?? new Date().toISOString(),
        updatedAt: typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        deletedAt,
      }
    })
    .filter((h): h is HodinaRozvrhu => h !== null)

export const validateRozvrhData = (data: unknown) => {
  const result = v.safeParse(RozvrhSchema, data)
  if (!result.success) {
    console.warn('Data Rozvrhu neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const hodiny: HodinaRozvrhu[] = sanitizujHodiny(result.output.hodiny)

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

  const prazdniny: Prazdniny[] = result.output.prazdniny
    .map((p) => {
      const jedna = v.safeParse(PrazdninySchema, p)
      if (!jedna.success) return null
      const { id, nazev, datumOd, datumDo, createdAt, updatedAt, deletedAt } = jedna.output
      if (!nazev.trim()) return null
      if (!DATUM_REGEX.test(datumOd) || !DATUM_REGEX.test(datumDo)) return null
      // 'YYYY-MM-DD' porovnává chronologicky i jako prostý řetězec —
      // stejné pravidlo, jaké už pridatPrazdniny hlídá při vytváření
      // (viz useRozvrh.ts), tady navíc kvůli poškozeným/starším datům.
      if (datumOd > datumDo) return null
      return {
        id,
        nazev,
        datumOd,
        datumDo,
        createdAt: createdAt ?? new Date().toISOString(),
        updatedAt: typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        deletedAt,
      }
    })
    .filter((p): p is Prazdniny => p !== null)

  // Zrušení/přesun na hodinu, co po sanitizaci výš vůbec neexistuje
  // (ani jako smazaná), se tiše zahodí — stejný důvod jako docházka
  // výš.
  const zruseneHodiny: ZrusenaHodina[] = result.output.zruseneHodiny
    .map((z) => {
      const jedna = v.safeParse(ZrusenaHodinaSchema, z)
      if (!jedna.success) return null
      const { id, hodinaId, datum, createdAt, updatedAt, deletedAt } = jedna.output
      if (!platneIdHodin.has(hodinaId)) return null
      if (!DATUM_REGEX.test(datum)) return null
      return {
        id,
        hodinaId,
        datum,
        createdAt: createdAt ?? new Date().toISOString(),
        updatedAt: typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        deletedAt,
      }
    })
    .filter((z): z is ZrusenaHodina => z !== null)

  const presuny: Presun[] = result.output.presuny
    .map((p) => {
      const jedna = v.safeParse(PresunSchema, p)
      if (!jedna.success) return null
      const { id, hodinaId, puvodniDatum, novyDatum, novyCasOd, novyCasDo, createdAt, updatedAt, deletedAt } =
        jedna.output
      if (!platneIdHodin.has(hodinaId)) return null
      if (!DATUM_REGEX.test(puvodniDatum) || !DATUM_REGEX.test(novyDatum)) return null
      if (!CAS_REGEX.test(novyCasOd) || !CAS_REGEX.test(novyCasDo)) return null
      return {
        id,
        hodinaId,
        puvodniDatum,
        novyDatum,
        novyCasOd,
        novyCasDo,
        createdAt: createdAt ?? new Date().toISOString(),
        updatedAt: typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        deletedAt,
      }
    })
    .filter((p): p is Presun => p !== null)

  const semestry: Semestr[] = result.output.semestry
    .map((s) => {
      const jedna = v.safeParse(SemestrSchema, s)
      if (!jedna.success) return null
      const { id, nazev, datumOd, datumDo, hodiny: hodinySnimku, createdAt, updatedAt, deletedAt } = jedna.output
      if (!nazev.trim()) return null
      if (!DATUM_REGEX.test(datumOd) || !DATUM_REGEX.test(datumDo)) return null
      return {
        id,
        nazev,
        datumOd,
        datumDo,
        hodiny: sanitizujHodiny(hodinySnimku),
        createdAt: createdAt ?? new Date().toISOString(),
        updatedAt: typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        deletedAt,
      }
    })
    .filter((s): s is Semestr => s !== null)

  return { success: true as const, data: { hodiny, dochazkaZaznamy, prazdniny, zruseneHodiny, presuny, semestry } }
}
