import * as v from 'valibot'
import { POSTAVY } from '@/fighting/combat/postavy'
import type { PostavaId } from '@/fighting/combat/postavy'

/** Kolik posledních zápasů appka drží v historii — definováno tady,
 *  ne v useSoubojStatistikyStore.ts, ať se předejde kruhovému importu
 *  (store už importuje validaci odsud, ne naopak). */
export const MAX_HISTORIE = 10

// ==========================================
// Ověření statistik Souboje načtených z úložiště — stejný vzor jako
// core/utils/inventarValidation.ts/questValidation.ts: neplatné id
// nebo poškozené číslo se tiše vyřadí/vynuluje, místo aby shodily
// celý stav. Platná id se odvozují přímo z POSTAVY, žádný zdvojený
// seznam.
//
// Deváté kolo vylepšení přidalo `historie` (SoubojHistorieZaznam[])
// — stejná disciplína, jen navíc filtruje celý ZÁZNAM pryč (ne jen
// jedno číslo v něm), pokud má neplatnou postavu nebo výsledek mimo
// ta tři povolená slova — a ořízne na MAX_HISTORIE i tady, kdyby se
// nějak (ručně upravená záloha) dostalo víc položek, než kolik jich
// store sám kdy uloží.
// ==========================================

const jePlatnaPostava = (id: unknown): id is PostavaId => typeof id === 'string' && id in POSTAVY

const bezpecneCislo = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0)

const PLATNE_VYSLEDKY = ['vyhra', 'prohra', 'remiza'] as const
type PlatnyVysledek = (typeof PLATNE_VYSLEDKY)[number]
const jePlatnyVysledek = (x: unknown): x is PlatnyVysledek => PLATNE_VYSLEDKY.includes(x as PlatnyVysledek)

export const SoubojStatistikySchema = v.object({
  vysledky: v.optional(v.record(v.string(), v.unknown()), {}),
  historie: v.optional(v.array(v.unknown()), []),
})

export const validateSoubojStatistikyData = (data: unknown) => {
  const result = v.safeParse(SoubojStatistikySchema, data)
  if (!result.success) {
    console.warn('Statistiky Souboje neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const vysledky: Record<string, { vyhry: number; prohry: number; remizy: number }> = {}
  for (const [id, zaznam] of Object.entries(result.output.vysledky)) {
    if (!jePlatnaPostava(id)) continue
    const z = zaznam as Record<string, unknown> | null | undefined
    vysledky[id] = {
      vyhry: bezpecneCislo(z?.vyhry),
      prohry: bezpecneCislo(z?.prohry),
      remizy: bezpecneCislo(z?.remizy),
    }
  }

  const historie: { postavaId: PostavaId; vysledek: PlatnyVysledek; kdy: number }[] = []
  for (const polozka of result.output.historie) {
    const z = polozka as Record<string, unknown> | null | undefined
    if (!jePlatnaPostava(z?.postavaId) || !jePlatnyVysledek(z?.vysledek)) continue
    historie.push({ postavaId: z.postavaId, vysledek: z.vysledek, kdy: bezpecneCislo(z?.kdy) })
  }

  return { success: true as const, data: { vysledky, historie: historie.slice(0, MAX_HISTORIE) } }
}
