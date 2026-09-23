import { describe, it, expect } from 'vitest'
import { validateDocumentEditorData } from '@/core/utils/documentEditorValidation'

// ==========================================
// useDocumentStore.ts byl jediný store v appce bez vlastní ověřovací
// vrstvy na rehydrataci — audit School Roomu (viz CLAUDE.md) to
// vytáhl jako reálné riziko, ne teoretické: FileManager.tsx's .map()/
// new Date(doc.lastModified) a DocumentEditor.tsx obojí spoléhaly na
// to, že documents je pole plné položek s title/content/lastModified.
// ==========================================

describe('validateDocumentEditorData', () => {
  it('projde platná data beze změny', () => {
    const vysledek = validateDocumentEditorData({
      documents: [{ id: 'd1', title: 'Esej', content: '<p>Text</p>', lastModified: '2024-01-01T00:00:00.000Z' }],
      activeDocId: 'd1',
      currentTitle: 'Esej',
      currentContent: '<p>Text</p>',
      isSaved: true,
      revision: 2,
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.documents).toHaveLength(1)
      expect(vysledek.data.activeDocId).toBe('d1')
    }
  })

  it('poškozená položka documents (chybí id) se tiše vyřadí, ne celý seznam', () => {
    const vysledek = validateDocumentEditorData({
      documents: [{ title: 'Bez id' }, { id: 'd2', title: 'V pořádku' }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.documents).toHaveLength(1)
      expect(vysledek.data.documents[0].id).toBe('d2')
    }
  })

  it('documents úplně mimo tvar (objekt místo pole) shodí celý zápis na výchozí stav, ne jen na pád při čtení', () => {
    // Stejné chování jako kalendarValidation.ts's KalendarSchema — v.optional
    // doplní výchozí hodnotu jen při chybějícím poli, ne při poli se
    // špatným typem, takže poškozený TVAR celého documents pole odmítne
    // celý zápis (merge pak vrátí current/výchozí stav), ne že by se
    // tiše proměnil na prázdné pole. Ochrana proti pádu je stejná —
    // FileManager.tsx nikdy nedostane nic, co by .map() nezvládl.
    expect(validateDocumentEditorData({ documents: { not: 'an array' } }).success).toBe(false)
  })

  it('chybějící title/content/lastModified u položky se doplní bezpečným výchozím', () => {
    const vysledek = validateDocumentEditorData({ documents: [{ id: 'd1' }] })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.documents[0].title).toBe('Nový dokument')
      expect(vysledek.data.documents[0].content).toBe('')
      expect(typeof vysledek.data.documents[0].lastModified).toBe('string')
    }
  })

  it('activeDocId ukazující na vyřazený/neexistující dokument se vrátí na null', () => {
    const vysledek = validateDocumentEditorData({
      documents: [{ id: 'd1', title: 'Existující' }],
      activeDocId: 'neexistuje',
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.activeDocId).toBeNull()
  })

  it('data, co vůbec neodpovídají tvaru, se odmítnou', () => {
    expect(validateDocumentEditorData('nesmysl').success).toBe(false)
    expect(validateDocumentEditorData(null).success).toBe(false)
  })

  it('chybějící volitelná pole (isSaved/revision/currentTitle) dostanou bezpečný výchozí stav', () => {
    const vysledek = validateDocumentEditorData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.isSaved).toBe(true)
      expect(vysledek.data.revision).toBe(0)
      expect(vysledek.data.currentTitle).toBe('Nový dokument')
      expect(vysledek.data.currentContent).toBe('')
    }
  })
})
