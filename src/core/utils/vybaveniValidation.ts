import * as v from 'valibot'
import { VYBAVENI } from '@/game/data/equipment'
import { POSTAVA_IDS } from './gameCharacterValidation'

// ==========================================
// Ověření vybavení načteného z úložiště — stejný vzor jako
// core/utils/inventarValidation.ts/questValidation.ts: neplatné/
// neznámé id se tiše vyřadí, platná id se odvozují přímo z VYBAVENI/
// POSTAVA_IDS, žádný zdvojený seznam.
// ==========================================

const jePlatneVybaveniId = (id: unknown): id is string => typeof id === 'string' && VYBAVENI.some((p) => p.id === id)

const jePlatnaPostavaId = (id: unknown): id is string =>
  typeof id === 'string' && (POSTAVA_IDS as readonly string[]).includes(id)

export const VybaveniSchema = v.object({
  vlastnene: v.optional(v.array(v.unknown()), []),
  nasazene: v.optional(v.record(v.string(), v.unknown()), {}),
})

export const validateVybaveniData = (data: unknown) => {
  const result = v.safeParse(VybaveniSchema, data)
  if (!result.success) {
    console.warn('Data vybavení neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const vlastnene = [...new Set(result.output.vlastnene.filter(jePlatneVybaveniId))]

  const nasazene: Record<string, string> = {}
  for (const [postavaId, vybaveniId] of Object.entries(result.output.nasazene)) {
    if (jePlatnaPostavaId(postavaId) && jePlatneVybaveniId(vybaveniId) && vlastnene.includes(vybaveniId)) {
      nasazene[postavaId] = vybaveniId
    }
  }

  return { success: true as const, data: { vlastnene, nasazene } }
}
