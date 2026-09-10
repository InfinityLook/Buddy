import * as v from 'valibot'
import { jePlatnyStav } from '@/flagships/writer-room/writerRoomStav'

// ==========================================
// Ověření dat appky Komiks (Writer's Room). Stejná "poškozená položka
// se zahodí po jedné" zásada jako bookWriterValidation.ts/
// screenplayWriterValidation.ts vedle.
// ==========================================

const sanitizujRadek = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (
    typeof d.id !== 'string' ||
    typeof d.postava !== 'string' ||
    typeof d.text !== 'string' ||
    (d.typ !== 'dialog' && d.typ !== 'popisek')
  ) {
    return null
  }
  return { id: d.id, typ: d.typ as 'dialog' | 'popisek', postava: d.postava, text: d.text }
}

const sanitizujPanel = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.vizual !== 'string') return null
  const radky = Array.isArray(d.radky) ? d.radky.map(sanitizujRadek).filter((r): r is NonNullable<typeof r> => r !== null) : []
  // createdAt je novější pole (viz Panel v types.ts) — starší panel ho
  // nemá, fallback na epoch, ať prostě nikdy nespadne do "dnešní"
  // statistiky místo aby zahodil celý panel.
  const createdAt = typeof d.createdAt === 'string' ? d.createdAt : '1970-01-01T00:00:00.000Z'
  return { id: d.id, vizual: d.vizual, radky, createdAt }
}

const sanitizujStranu = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.cislo !== 'number' || !Number.isFinite(d.cislo)) return null
  const panely = Array.isArray(d.panely) ? d.panely.map(sanitizujPanel).filter((p): p is NonNullable<typeof p> => p !== null) : []
  // stav/poznamka jsou novější pole — starší uložená strana je nemá
  // vůbec, stejný fallback jako u Kapitoly/Scény vedle.
  const stav = jePlatnyStav(d.stav) ? d.stav : 'napad'
  const poznamka = typeof d.poznamka === 'string' ? d.poznamka : ''
  return { id: d.id, cislo: d.cislo, panely, stav, poznamka }
}

// Exportováno navíc pro obnovu z ručního checkpointu
// (useWriterCheckpoints.ts) — viz stejný komentář u sanitizujKnihu v
// bookWriterValidation.ts.
export const sanitizujKomiks = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.nazev !== 'string' || typeof d.createdAt !== 'string') return null
  const strany = Array.isArray(d.strany) ? d.strany.map(sanitizujStranu).filter((s): s is NonNullable<typeof s> => s !== null) : []
  // Stejný fallback jako u Knihy/Scénáře — starší uložený komiks
  // upravenoAt vůbec nemá.
  const upravenoAt = typeof d.upravenoAt === 'string' ? d.upravenoAt : d.createdAt
  const cilStran = typeof d.cilStran === 'number' && Number.isFinite(d.cilStran) ? d.cilStran : null

  // postavyPoznamky je novější pole (bible postav) — stejný fallback a
  // po-položce ověření jako u Scénáře v screenplayWriterValidation.ts.
  const postavyPoznamkyRaw = d.postavyPoznamky
  const postavyPoznamky: Record<string, string> = {}
  if (postavyPoznamkyRaw && typeof postavyPoznamkyRaw === 'object') {
    for (const [jmeno, poznamka] of Object.entries(postavyPoznamkyRaw as Record<string, unknown>)) {
      if (typeof poznamka === 'string') postavyPoznamky[jmeno] = poznamka
    }
  }

  return { id: d.id, nazev: d.nazev, strany, createdAt: d.createdAt, upravenoAt, cilStran, postavyPoznamky }
}

const ComicWriterSchema = v.object({
  komiksy: v.optional(v.array(v.unknown()), []),
})

export const validateComicWriterData = (data: unknown) => {
  const result = v.safeParse(ComicWriterSchema, data)
  if (!result.success) {
    console.warn('Data Komiksu neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  return {
    success: true as const,
    data: {
      komiksy: result.output.komiksy.map(sanitizujKomiks).filter((k): k is NonNullable<typeof k> => k !== null),
    },
  }
}
