import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { normalizeText } from '@/core/utils/text'
import {
  ALL_NOTES,
  DEMO_NOTE_IDS,
  DEMO_NOTE_TITLES,
  INITIAL_NOTES,
  Note,
  NoteCategory,
} from './types'

const XP_PER_NOTE = 5

interface QuickNotesState {
  notes: Note[]
  addNote: (title: string, content: string, category: NoteCategory) => void
  updateNote: (id: string, title: string, content: string, category: NoteCategory) => void
  deleteNote: (id: string) => void
}

const isDemoNote = (note: Note) =>
  DEMO_NOTE_IDS.includes(note.id) && DEMO_NOTE_TITLES.includes(note.title)

const formatDate = () =>
  new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })

const useQuickNotesStore = create<QuickNotesState>()(
  persist(
    (set) => ({
      notes: INITIAL_NOTES,

      addNote: (title, content, category) => {
        if (!title.trim()) return

        const newNote: Note = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: title.trim(),
          content: content.trim(),
          category,
          createdAt: formatDate(),
          updatedAt: null,
        }

        set((state) => ({ notes: [newNote, ...state.notes] }))
        useGamificationStore.getState().recordAction('note', XP_PER_NOTE)
      },

      // Úprava poznámku nepovažuje za novou práci, takže se za ni
      // nepřipisuje XP — jinak by stačilo pořád dokola něco přepisovat.
      updateNote: (id, title, content, category) => {
        if (!title.trim()) return

        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? {
                  ...note,
                  title: title.trim(),
                  content: content.trim(),
                  category,
                  updatedAt: formatDate(),
                }
              : note
          ),
        }))
      },

      deleteNote: (id) =>
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),
    }),
    {
      name: 'schoolbuddy-quick-notes-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const saved = persisted as Partial<QuickNotesState> | undefined
        const notes = (saved?.notes ?? []).filter((note) => !isDemoNote(note))
        return { ...current, ...saved, notes }
      },
    }
  )
)

export const useQuickNotes = () => {
  const { notes, addNote, updateNote, deleteNote } = useQuickNotesStore()
  const [filter, setFilter] = useState<string>(ALL_NOTES)
  const [search, setSearch] = useState('')

  const filteredNotes = useMemo(() => {
    const query = normalizeText(search.trim())

    return notes.filter((note) => {
      const matchesCategory = filter === ALL_NOTES || note.category === filter
      const matchesSearch =
        query === '' ||
        normalizeText(note.title).includes(query) ||
        normalizeText(note.content).includes(query)
      return matchesCategory && matchesSearch
    })
  }, [notes, filter, search])

  return {
    notes: filteredNotes,
    totalCount: notes.length,
    filter,
    setFilter,
    search,
    setSearch,
    addNote,
    updateNote,
    deleteNote,
  }
}
