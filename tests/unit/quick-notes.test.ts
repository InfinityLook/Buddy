import { beforeEach, describe, expect, it } from 'vitest'
import {
  cleanNoteHtml,
  escapeNote,
  noteMarkdown,
  notePlainText,
  safeNoteUrl,
} from '@/miniapps/quick-notes/noteContent'
import {
  normalizeNotes,
  noteToDraft,
  parseNoteTags,
  useQuickNotesStore,
} from '@/miniapps/quick-notes/useQuickNotes'

// ==========================================
// Quick Notes nemělo dosud žádné dedikované testy (jen náhodné zmínky v
// buddy-task-draft-edits.test.ts) - pokrytí nejdřív pro čisté funkce
// (sanitizace, markdown export, normalizace), potom pro saveDraft's
// detekci konfliktu revizí přímo přes store, stejný vzor jako
// flashcards.test.ts dělá pro setKnown.
// ==========================================

describe('cleanNoteHtml', () => {
  it('odstraní script tagy', () => {
    expect(cleanNoteHtml('<p>hi</p><script>alert(1)</script>')).not.toContain('script')
  })

  it('odmítne javascript: odkazy', () => {
    const html = cleanNoteHtml('<a href="javascript:alert(1)">click</a>')
    expect(html).not.toContain('javascript:')
  })

  it('holou doménu v href normalizuje na https://', () => {
    const html = cleanNoteHtml('<a href="example.com">x</a>')
    expect(html).toContain('https://example.com/')
  })

  it('nepovolené tagy rozbalí, ale obsah zachová', () => {
    const html = cleanNoteHtml('<span>hi</span> <table><tr><td>cell</td></tr></table>')
    expect(html).not.toContain('<span')
    expect(html).not.toContain('<table')
    expect(html).toContain('hi')
    expect(html).toContain('cell')
  })

  it('odstraní input, který není checkbox', () => {
    const html = cleanNoteHtml('<input type="text" value="x">')
    expect(html).not.toContain('input')
  })

  it('zachová checked stav u checkboxu', () => {
    const html = cleanNoteHtml('<input type="checkbox" checked>')
    expect(html).toContain('checked')
  })

  it('MAX_NOTE_HTML shodí příliš velký obsah', () => {
    const big = 'a'.repeat(100001)
    expect(() => cleanNoteHtml(big)).toThrow()
  })
})

describe('escapeNote -> cleanNoteHtml -> notePlainText (round trip)', () => {
  it('zachová prostý text s novými řádky', () => {
    const original = 'Řádek jeden\nŘádek dva\n\nŘádek čtyři'
    expect(notePlainText(cleanNoteHtml(escapeNote(original)))).toBe(original)
  })

  it('zachová speciální znaky', () => {
    const original = 'Kup <mleko> & chleba'
    expect(notePlainText(cleanNoteHtml(escapeNote(original)))).toBe(original)
  })
})

describe('noteMarkdown', () => {
  it('převede nadpis, tučné, kurzívu a odrážky', () => {
    const html = '<h1>Nadpis</h1><p><strong>tučně</strong> a <em>kurzíva</em></p><ul><li>a</li><li>b</li></ul>'
    const md = noteMarkdown(html)
    expect(md).toContain('# Nadpis')
    expect(md).toContain('**tučně**')
    expect(md).toContain('*kurzíva*')
    expect(md).toContain('- a')
    expect(md).toContain('- b')
  })

  it('checkboxy exportuje jako [x]/[ ]', () => {
    // INPUT sám vrací '[x] '/'[ ] ' se svou vlastní mezerou navíc - v
    // reálném markupu z editoru (žádná mezera hned po tagu) to dá přesně
    // "[x] hotovo"; tahle zdrojová HTML má mezeru i v textovém uzlu, takže
    // se obě mezery sečtou - to je čestný, deterministický výstup pro
    // tenhle konkrétní vstup, ne chyba funkce.
    const html = '<p><input type="checkbox" checked>hotovo</p><p><input type="checkbox">nehotovo</p>'
    const md = noteMarkdown(html)
    expect(md).toContain('[x] hotovo')
    expect(md).toContain('[ ] nehotovo')
  })
})

describe('safeNoteUrl', () => {
  it('odmítne data: odkazy', () => {
    expect(safeNoteUrl('data:text/html,<script>1</script>')).toBeNull()
  })
})

describe('parseNoteTags', () => {
  it('odstraní #, duplicity, oseká délku a počet', () => {
    const tags = parseNoteTags(
      '#skola, Skola ,  matika, ' +
        'x'.repeat(50) +
        ', ' +
        Array.from({ length: 20 }, (_, i) => `t${i}`).join(',')
    )
    expect(tags).toContain('matika')
    expect(tags.length).toBeLessThanOrEqual(12)
    expect(tags.every(t => t.length <= 40)).toBe(true)
  })
})

describe('normalizeNotes', () => {
  it('vyřadí ukázkové poznámky podle id+názvu', () => {
    const notes = normalizeNotes([
      { id: '1', title: 'Projekt do Matematiky', content: 'x' },
      { id: '2', title: 'Koupit učebnici', content: 'y' },
      { id: '3', title: 'Real note', content: 'z' },
    ])
    expect(notes.map(n => n.id)).toEqual(['3'])
  })

  it('při shodě id ponechá tu s vyšším updatedAtTs', () => {
    const notes = normalizeNotes([
      { id: 'a', title: 'Old', updatedAtTs: 100 },
      { id: 'a', title: 'New', updatedAtTs: 200 },
    ])
    expect(notes).toHaveLength(1)
    expect(notes[0].title).toBe('New')
  })

  it('poškozené (příliš velké) html zahodí, ale obsah poznámky zůstane', () => {
    const notes = normalizeNotes([
      { id: 'a', title: 'T', html: 'a'.repeat(200001), content: 'fallback content' },
    ])
    expect(notes[0].html).toBeUndefined()
    expect(notes[0].content).toBe('fallback content')
  })
})

describe('saveDraft - detekce konfliktu revizí', () => {
  beforeEach(() => {
    useQuickNotesStore.setState({
      notes: [],
      notebooks: useQuickNotesStore.getState().notebooks,
      rewardDay: '',
      rewardCount: 0,
    })
  })

  it('první uložení nového konceptu uspěje', () => {
    const draft = noteToDraft()
    draft.title = 'Test'
    draft.html = escapeNote('obsah')
    const result = useQuickNotesStore.getState().saveDraft(draft)
    expect(result.ok).toBe(true)
  })

  it('uložení se zastaralou baseRevision (dvě autosave volání nad stejným konceptem) vrátí konflikt, ne tiché přepsání', () => {
    const draft = noteToDraft()
    draft.title = 'Test'
    draft.html = escapeNote('obsah v1')

    const first = useQuickNotesStore.getState().saveDraft(draft)
    expect(first.ok).toBe(true)

    // draft.baseRevision se nikdy neaktualizovalo (simulace druhého
    // autosave volání se stejným, už zastaralým konceptem)
    const staleDraft = { ...draft, html: escapeNote('obsah v2') }
    const second = useQuickNotesStore.getState().saveDraft(staleDraft)

    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.error).toContain('mezitím změnila')
    }
  })

  it('aktualizace baseRevision po uložení dovolí druhou úpravu', () => {
    const draft = noteToDraft()
    draft.title = 'Test'
    draft.html = escapeNote('obsah v1')

    const first = useQuickNotesStore.getState().saveDraft(draft)
    if (!first.ok) throw new Error('setup se nepovedl')

    const nextDraft = { ...draft, baseRevision: first.note.revision ?? 0, html: escapeNote('obsah v2') }
    const second = useQuickNotesStore.getState().saveDraft(nextDraft)
    expect(second.ok).toBe(true)
  })

  it('uložení nezměněného obsahu (no-op) nezvýší revizi', () => {
    const draft = noteToDraft()
    draft.title = 'Test'
    draft.html = escapeNote('obsah')

    const first = useQuickNotesStore.getState().saveDraft(draft)
    if (!first.ok) throw new Error('setup se nepovedl')
    const rev1 = first.note.revision

    const sameDraft = { ...draft, baseRevision: rev1 ?? 0 }
    const second = useQuickNotesStore.getState().saveDraft(sameDraft)
    if (!second.ok) throw new Error('druhé uložení selhalo: ' + second.error)

    expect(second.note.revision).toBe(rev1)
  })
})
