import * as v from 'valibot'

// ==========================================
// Ověření uloženého stavu Textového editoru — byl jediný store v appce
// úplně bez vlastní ověřovací vrstvy na rehydrataci (žádný merge,
// žádné schéma), zatímco FileManager.tsx's .map()/new Date(doc.
// lastModified) a DocumentEditor.tsx obojí bez ochrany spoléhaly na
// to, že documents je pole a každá položka má title/content/
// lastModified. Stejný "poškozená položka se tiše vyřadí, ne celý
// stav" vzor jako u kalendarValidation.ts a ostatních storů appky.
// ==========================================

// Epoch, ne aktuální čas — statická hodnota, ať appka nemusí do
// schématu tahat dynamický default (valibot ho tu nepodporuje).
// Dokument s poškozeným datem prostě spadne na začátek seznamu podle
// data, ne že appka vymyslí, kdy naposledy upravený "asi" byl.
const NEZNAMY_CAS = new Date(0).toISOString()

export const DocumentStateSchema = v.object({
  id: v.string(),
  title: v.optional(v.string(), 'Nový dokument'),
  content: v.optional(v.string(), ''),
  lastModified: v.optional(v.string(), NEZNAMY_CAS),
})

export const DocumentEditorSchema = v.object({
  documents: v.optional(v.array(v.unknown()), []),
  activeDocId: v.optional(v.nullable(v.string()), null),
  currentTitle: v.optional(v.string(), 'Nový dokument'),
  currentContent: v.optional(v.string(), ''),
  isSaved: v.optional(v.boolean(), true),
  revision: v.optional(v.number(), 0),
})

export const validateDocumentEditorData = (data: unknown) => {
  const result = v.safeParse(DocumentEditorSchema, data)
  if (!result.success) {
    console.warn('Data Textového editoru neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  // Poškozený/neplatný jednotlivý dokument se tiše vyřadí, ne aby
  // shodil celý seznam.
  const documents = result.output.documents
    .map((d) => {
      const jeden = v.safeParse(DocumentStateSchema, d)
      return jeden.success ? jeden.output : null
    })
    .filter((d): d is v.Output<typeof DocumentStateSchema> => d !== null)

  // activeDocId nesmí ukazovat na dokument, co se právě vyřadil pro
  // poškozený tvar — jinak by editor po startu tvářil, že edituje
  // záznam, co ve skutečnosti v documents vůbec není.
  const activeDocId =
    result.output.activeDocId && documents.some((d) => d.id === result.output.activeDocId)
      ? result.output.activeDocId
      : null

  return {
    success: true as const,
    data: { ...result.output, documents, activeDocId },
  }
}
