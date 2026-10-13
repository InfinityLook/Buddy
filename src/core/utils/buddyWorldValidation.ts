import * as v from 'valibot'
import { MASKOTI, VYCHOZI_MASKOT_ID } from '@/buddyworld/data/maskoti'
import { MAX_LEVEL } from '@/buddyworld/leveling'

// ==========================================
// Ověření uloženého postupu v Buddy Worldu. Poškozené nebo mimo
// rozsah hodnoty padají na bezpečný výchozí stav po jedné, appka
// nezahazuje celý uložený postup — stejná zásada jako
// gameCharacterValidation.ts jinde v appce.
// ==========================================

const PLATNA_MASKOT_ID = MASKOTI.map((m) => m.id)

const jeCisloVRozsahu = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max

export const BuddyWorldSchema = v.object({
  level: v.optional(v.unknown()),
  xp: v.optional(v.unknown()),
  aktivniMaskotId: v.optional(v.unknown()),
  odemceneMaskoty: v.optional(v.array(v.unknown()), []),
})

export const validateBuddyWorldData = (data: unknown) => {
  const result = v.safeParse(BuddyWorldSchema, data)
  if (!result.success) {
    console.warn('Data postupu v Buddy Worldu neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const level = jeCisloVRozsahu(result.output.level, 1, MAX_LEVEL) ? Math.floor(result.output.level as number) : 1
  const xp = jeCisloVRozsahu(result.output.xp, 0, 100000) ? Math.floor(result.output.xp as number) : 0
  const aktivniMaskotId =
    typeof result.output.aktivniMaskotId === 'string' && PLATNA_MASKOT_ID.includes(result.output.aktivniMaskotId)
      ? result.output.aktivniMaskotId
      : VYCHOZI_MASKOT_ID

  const odemceneMaskoty = [
    ...new Set(
      (result.output.odemceneMaskoty ?? []).filter(
        (id): id is string => typeof id === 'string' && PLATNA_MASKOT_ID.includes(id)
      )
    ),
  ]
  if (!odemceneMaskoty.includes(VYCHOZI_MASKOT_ID)) odemceneMaskoty.push(VYCHOZI_MASKOT_ID)

  return { success: true as const, data: { level, xp, aktivniMaskotId, odemceneMaskoty } }
}
