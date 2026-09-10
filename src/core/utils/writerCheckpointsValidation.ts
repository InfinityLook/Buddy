import * as v from 'valibot'

// ==========================================
// Ověření dat ručních záloh (checkpointů) Writer's Roomu. Stejná
// "poškozená položka se zahodí po jedné" zásada jako
// bookWriterValidation.ts/screenplayWriterValidation.ts/
// comicWriterValidation.ts vedle — jeden poškozený checkpoint nemá
// shodit celý seznam.
//
// `data` (samotný snímek díla) se tady ověřuje jen povrchově (je to
// vůbec objekt) — hluboké ověření dělá až obnova samotná, přes stejné
// sanitizujKnihu/sanitizujScenar/sanitizujKomiks funkce, co appka už
// stejně používá pro `merge` při načtení — nemá smysl tu logiku
// duplikovat podruhé.
// ==========================================

const DRUHY_DILA = ['kniha', 'scenar', 'komiks'] as const

const sanitizujCheckpoint = (data: unknown) => {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (
    typeof d.id !== 'string' ||
    typeof d.dilaId !== 'string' ||
    typeof d.nazev !== 'string' ||
    typeof d.createdAt !== 'string' ||
    typeof d.druh !== 'string' ||
    !DRUHY_DILA.includes(d.druh as (typeof DRUHY_DILA)[number]) ||
    !d.data ||
    typeof d.data !== 'object'
  ) {
    return null
  }
  return {
    id: d.id,
    druh: d.druh as (typeof DRUHY_DILA)[number],
    dilaId: d.dilaId,
    nazev: d.nazev,
    createdAt: d.createdAt,
    data: d.data,
  }
}

const WriterCheckpointsSchema = v.object({
  checkpointy: v.optional(v.array(v.unknown()), []),
})

export const validateWriterCheckpointsData = (data: unknown) => {
  const result = v.safeParse(WriterCheckpointsSchema, data)
  if (!result.success) {
    console.warn('Data ručních záloh Writer\'s Roomu neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  return {
    success: true as const,
    data: {
      checkpointy: result.output.checkpointy.map(sanitizujCheckpoint).filter((c): c is NonNullable<typeof c> => c !== null),
    },
  }
}
