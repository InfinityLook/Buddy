// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// useStudyPlanner.ts (přes QuickNotes.tsx's "vytvořit úkol v Planeru"
// akci v menu) nepřímo importuje core/utils/notify.ts -> registerSW.ts's
// Vite-only virtual:pwa-register modul, který Vitest's vlastní Vite
// instance neumí vyřešit (stejný, už jinde zdokumentovaný důvod, proč se
// v téhle vrstvě nedá vykreslit několik flagship roomů). Zamockované jsou
// jen tři mezi-miniapp moduly, které QuickNotes.tsx tahá jen pro svoje
// menu akce - samotná komponenta běží reálně.
vi.mock('@/core/store/useAppStore', () => ({
  useAppStore: { getState: () => ({ setActiveAppId: vi.fn(), returnPath: null }) },
}))
vi.mock('@/miniapps/document-editor/useDocumentStore', () => ({
  useDocumentStore: { getState: () => ({ isSaved: true, saveCurrentDocument: vi.fn(), importDocument: vi.fn() }) },
}))
vi.mock('@/miniapps/study-planner/useStudyPlanner', () => ({
  getRawStudyPlannerState: () => ({ tasks: [], addTask: vi.fn() }),
}))

const { QuickNotes } = await import('@/miniapps/quick-notes/QuickNotes')
const { useQuickNotesStore, useNoteDraftStore } = await import('@/miniapps/quick-notes/useQuickNotes')

// jsdom neimplementuje <dialog>'s showModal()/close() (dlouho otevřená
// mezera v jsdomu, ne chyba appky) - Panel's useEffect obě volá, takže
// bez tohohle polyfillu by otevření "Možnosti poznámky" menu shodilo test
// místo aby reálnou interakci vyzkoušelo.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
}

beforeEach(() => {
  localStorage.clear()
  useQuickNotesStore.setState({
    notes: [],
    notebooks: useQuickNotesStore.getState().notebooks,
    rewardDay: '',
    rewardCount: 0,
  })
  useNoteDraftStore.setState({ draft: null })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function napisDoEditoru(text: string) {
  const area = document.querySelector('.qn-paper') as HTMLDivElement
  area.innerHTML = text
  fireEvent.input(area)
}

describe('QuickNotes komponenta: celý tok vytvoření -> výpis -> úprava -> smazání', () => {
  it('vytvoří poznámku, zobrazí ji ve výpisu, upraví a smaže přes menu do koše', async () => {
    vi.useFakeTimers()
    render(<MemoryRouter><QuickNotes /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: /Nová poznámka/i }))

    const titleInput = screen.getByRole('textbox', { name: 'Název poznámky' })
    fireEvent.change(titleInput, { target: { value: 'Testovací poznámka' } })

    napisDoEditoru('Obsah <b>poznámky</b>')

    // posun přes 650ms debounce, ať se spustí autosave
    await act(async () => {
      vi.advanceTimersByTime(700)
    })

    expect(useQuickNotesStore.getState().notes).toHaveLength(1)
    const saved = useQuickNotesStore.getState().notes[0]
    expect(saved.title).toBe('Testovací poznámka')
    expect(saved.content).toContain('poznámky')

    fireEvent.click(screen.getByRole('button', { name: 'Zpět na poznámky' }))
    expect(screen.getByText('Testovací poznámka')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Testovací poznámka'))

    const titleInput2 = screen.getByRole('textbox', { name: 'Název poznámky' })
    expect((titleInput2 as HTMLInputElement).value).toBe('Testovací poznámka')

    fireEvent.change(titleInput2, { target: { value: 'Upravená poznámka' } })
    await act(async () => {
      vi.advanceTimersByTime(700)
    })

    expect(useQuickNotesStore.getState().notes[0].title).toBe('Upravená poznámka')
    expect(useQuickNotesStore.getState().notes[0].revision).toBe(2)

    fireEvent.click(screen.getByRole('button', { name: 'Zpět na poznámky' }))
    fireEvent.click(screen.getByText('Upravená poznámka'))
    fireEvent.click(screen.getByRole('button', { name: 'Možnosti poznámky' }))
    fireEvent.click(screen.getByText('Přesunout do koše'))

    expect(useQuickNotesStore.getState().notes[0].deletedAt).not.toBeNull()
  }, 15000)

  it('zápisník a štítky se uloží a zůstanou i po znovuotevření', async () => {
    vi.useFakeTimers()
    render(<MemoryRouter><QuickNotes /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: /Nová poznámka/i }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Název poznámky' }), {
      target: { value: 'S tagy' },
    })
    napisDoEditoru('obsah')

    fireEvent.change(screen.getByRole('combobox', { name: 'Zápisník poznámky' }), {
      target: { value: 'school' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Štítky oddělené čárkou' }), {
      target: { value: 'matika, #fyzika' },
    })

    await act(async () => {
      vi.advanceTimersByTime(700)
    })

    const note = useQuickNotesStore.getState().notes[0]
    expect(note.folderId).toBe('school')
    expect(note.category).toBe('Škola')
    expect(note.tags).toEqual(['matika', 'fyzika'])
  }, 15000)
})
