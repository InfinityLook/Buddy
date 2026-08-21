import * as v from 'valibot'

// ==========================================
// Ověření vytvořených postav a jejich postupu (úroveň/XP/dovednosti)
// načtených z úložiště. Neplatné položky se vyřazují/opravují po
// jedné, ne že by shodily celý stav — jedna poškozená postava nebo
// jedno mimo rozsah číslo nemá brát hráči zbytek party ani postup
// u ostatních postav.
//
// MAX_UROVEN/MAX_DOVEDNOST_RANK jsou schválně zdvojené z game/leveling.ts
// — core/utils validátory se nikde jinde do src/game/ nedívají, drží se
// jen valibotu, a tenhle soubor tu konvenci dodržuje taky.
// ==========================================

const MAX_UROVEN = 10
const MAX_DOVEDNOST_RANK = 3

export const POSTAVA_IDS = ['kael', 'lyra', 'rayen', 'elara', 'drakon'] as const
export type PostavaIdValidni = (typeof POSTAVA_IDS)[number]

interface PostavaProgres {
  uroven: number
  xp: number
  dovednostniBody: number
  dovednosti: { vydrz: number; sila: number; presnost: number }
}

const jePlatneId = (id: unknown): id is PostavaIdValidni =>
  typeof id === 'string' && (POSTAVA_IDS as readonly string[]).includes(id)

const jeCisloVRozsahu = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max

/** Opraví jeden záznam postupu — mimo-rozsahové nebo chybějící hodnoty
 *  padají zpátky na výchozí, ne že by zahodily celý záznam postavy. */
const sanitizujProgres = (data: unknown): PostavaProgres => {
  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}

  const uroven = jeCisloVRozsahu(d.uroven, 1, MAX_UROVEN) ? Math.floor(d.uroven) : 1
  const xp = jeCisloVRozsahu(d.xp, 0, 100000) ? Math.floor(d.xp) : 0
  const dovednostniBody = jeCisloVRozsahu(d.dovednostniBody, 0, MAX_UROVEN) ? Math.floor(d.dovednostniBody) : 0

  const dov = d.dovednosti && typeof d.dovednosti === 'object' ? (d.dovednosti as Record<string, unknown>) : {}
  const stupen = (hodnota: unknown) => (jeCisloVRozsahu(hodnota, 0, MAX_DOVEDNOST_RANK) ? Math.floor(hodnota) : 0)

  return {
    uroven,
    xp,
    dovednostniBody,
    dovednosti: { vydrz: stupen(dov.vydrz), sila: stupen(dov.sila), presnost: stupen(dov.presnost) },
  }
}

export const GameCharacterSchema = v.object({
  postavy: v.optional(v.array(v.unknown()), []),
  progres: v.optional(v.record(v.string(), v.unknown()), {}),
})

export const validateGameCharacterData = (data: unknown) => {
  const result = v.safeParse(GameCharacterSchema, data)
  if (!result.success) {
    console.warn('Data vytvořených postav neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const postavy = [...new Set(result.output.postavy.filter(jePlatneId))]

  const progres: Record<string, PostavaProgres> = {}
  for (const [id, hodnota] of Object.entries(result.output.progres)) {
    if (jePlatneId(id)) progres[id] = sanitizujProgres(hodnota)
  }

  return { success: true as const, data: { postavy, progres } }
}
