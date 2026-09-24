import * as v from 'valibot'
import { MAX_ZNAMKA, MIN_ZNAMKA, Predmet, Znamka } from '@/miniapps/znamky/types'

// ==========================================
// Ověření uložených Známek — stejný "poškozená položka se tiše
// vyřadí, ne celý seznam" vzor jako Kalendář/Rozvrh. Sanitizuje se
// dvouúrovňově: nejdřív předmět jako celek, pak jeho vlastní pole
// znamky — jedna poškozená známka nesmí strhnout zbytek předmětu.
// ==========================================

export const ZnamkaSchema = v.object({
  id: v.string(),
  hodnota: v.number(),
  vaha: v.optional(v.number([v.minValue(0)]), 1),
  popis: v.optional(v.string(), ''),
  datum: v.optional(v.string(), ''),
})

export const PredmetSchema = v.object({
  id: v.string(),
  nazev: v.string(),
  kredity: v.optional(v.number([v.minValue(0)]), 0),
  znamky: v.optional(v.array(v.unknown()), []),
  // Nepovinné — starší uložený předmět žádný cíl neměl, což pro něj
  // znamená přesně to samé, co dřív jediné existující chování (žádný
  // progres bar cíle se nezobrazuje).
  cil: v.optional(v.nullable(v.number([v.minValue(MIN_ZNAMKA), v.maxValue(MAX_ZNAMKA)])), null),
  // Nepovinné — starší uložený předmět (před cloudovou synchronizací,
  // viz skolaSync.ts) tahle pole vůbec neměl.
  createdAt: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.nullable(v.number()), null),
})

export const ZnamkyDataSchema = v.object({
  predmety: v.optional(v.array(v.unknown()), []),
})

const sanitizujZnamku = (raw: unknown): Znamka | null => {
  const jedna = v.safeParse(ZnamkaSchema, raw)
  if (!jedna.success) return null
  const { id, hodnota, vaha, popis, datum } = jedna.output
  // Mimo českou stupnici 1–5 se známka tiše zahodí, ne shodí celý předmět.
  if (!Number.isFinite(hodnota) || hodnota < MIN_ZNAMKA || hodnota > MAX_ZNAMKA) return null
  return { id, hodnota, vaha, popis, datum }
}

const sanitizujPredmet = (raw: unknown): Predmet | null => {
  const jedna = v.safeParse(PredmetSchema, raw)
  if (!jedna.success) return null
  const { id, nazev, kredity, znamky, cil, createdAt, updatedAt, deletedAt } = jedna.output
  if (!nazev.trim()) return null
  return {
    id,
    nazev,
    kredity,
    znamky: znamky.map(sanitizujZnamku).filter((z): z is Znamka => z !== null),
    cil,
    // Stejný fallback jako Kniha/Scenar/Komiks/Goal — starší uložený
    // předmět tahle pole vůbec neměl.
    createdAt: createdAt ?? new Date().toISOString(),
    updatedAt: typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    deletedAt,
  }
}

export const validateZnamkyData = (data: unknown) => {
  const result = v.safeParse(ZnamkyDataSchema, data)
  if (!result.success) {
    console.warn('Data Známek neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const predmety = result.output.predmety
    .map(sanitizujPredmet)
    .filter((p): p is Predmet => p !== null)

  return { success: true as const, data: { predmety } }
}
