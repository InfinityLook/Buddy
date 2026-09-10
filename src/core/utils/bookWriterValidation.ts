import * as v from 'valibot'
import { jePlatnyStav } from '@/flagships/writer-room/writerRoomStav'

// ==========================================
// Ověření dat appky Kniha (Writer's Room) načtených z úložiště. Stejná
// "poškozená položka se zahodí, ne že by shodila celý seznam" zásada
// jako musicStudioValidation.ts/gameCharacterValidation.ts.
// ==========================================

const sanitizujKapitolu = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.nazev !== 'string' || typeof d.text !== 'string' || typeof d.createdAt !== 'string') {
    return null
  }
  // stav/poznamka/stitky jsou novější pole — starší uložená kapitola je
  // nemá vůbec, fallback na "Nápad"/prázdnou poznámku/prázdné štítky,
  // stejně jako u upravenoAt/cilSlov jinde v tomhle souboru.
  const stav = jePlatnyStav(d.stav) ? d.stav : 'napad'
  const poznamka = typeof d.poznamka === 'string' ? d.poznamka : ''
  const stitky = typeof d.stitky === 'string' ? d.stitky : ''
  return { id: d.id, nazev: d.nazev, text: d.text, createdAt: d.createdAt, stav, poznamka, stitky }
}

// Exportováno navíc pro obnovu z ručního checkpointu
// (useWriterCheckpoints.ts) — stejná sanitizace, co appka už používá
// pro `merge` při načtení z úložiště, ať se hluboká validace snímku
// díla nepíše podruhé.
export const sanitizujKnihu = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.nazev !== 'string' || typeof d.createdAt !== 'string') return null
  const jePlatnyCil = (x: unknown): x is number | null => x === null || (typeof x === 'number' && Number.isFinite(x))
  if (!jePlatnyCil(d.cilSlov)) return null

  const kapitoly = Array.isArray(d.kapitoly) ? d.kapitoly.map(sanitizujKapitolu).filter((k): k is NonNullable<typeof k> => k !== null) : []

  // upravenoAt je novější pole — starší uložený stav ho nemá vůbec,
  // fallback na createdAt (kniha se "naposledy upravila" v okamžiku
  // založení, pokud appka jinak neví o ničem novějším).
  const upravenoAt = typeof d.upravenoAt === 'string' ? d.upravenoAt : d.createdAt

  return { id: d.id, nazev: d.nazev, cilSlov: d.cilSlov, kapitoly, createdAt: d.createdAt, upravenoAt }
}

const BookWriterSchema = v.object({
  knihy: v.optional(v.array(v.unknown()), []),
})

export const validateBookWriterData = (data: unknown) => {
  const result = v.safeParse(BookWriterSchema, data)
  if (!result.success) {
    console.warn('Data Knihy neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  return {
    success: true as const,
    data: {
      knihy: result.output.knihy.map(sanitizujKnihu).filter((k): k is NonNullable<typeof k> => k !== null),
    },
  }
}
