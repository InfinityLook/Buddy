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
  NoteSortMode,
} from './types'

const XP_PER_NOTE = 5

interface QuickNotesState {
  notes: Note[]
  addNote: (title: string, content: string, category: NoteCategory) => void
  updateNote: (id: string, title: string, content: string, category: NoteCategory) => void
  deleteNote: (id: string) => void
  togglePin: (id: string) => void
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
          pinned: false,
          updatedAtTs: null,
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
                  updatedAtTs: Date.now(),
                }
              : note
          ),
        }))
      },

      deleteNote: (id) =>
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),

      togglePin: (id) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, pinned: !note.pinned } : note
          ),
        })),
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

// Řadí už vyfiltrovaný seznam podle zvoleného módu. "newest"/"oldest"
// nepotřebují žádný uložený časový otisk — addNote nové poznámky vždycky
// vkládá na začátek pole, takže pořadí v poli už samo je "nejnovější
// první"; "oldest" je jen jeho zrcadlo. "updated" jediné potřebuje
// skutečnou hodnotu (updatedAtTs) — u needitované poznámky chybí, proto
// spadne na zápornou pozici v (už seřazeném) poli: novější needitované
// poznámky tak pořád vyjdou před staršími needitovanými, a jakákoli
// opravdu editovaná poznámka (kladný, mnohem větší časový otisk) je
// vždycky přebije.
const sortNotes = (list: Note[], mode: NoteSortMode): Note[] => {
  switch (mode) {
    case 'newest':
      return list
    case 'oldest':
      return [...list].reverse()
    case 'updated':
      return list
        .map((note, index) => ({ note, index }))
        .sort((a, b) => (b.note.updatedAtTs ?? -b.index) - (a.note.updatedAtTs ?? -a.index))
        .map((x) => x.note)
    case 'alphabetical':
      return [...list].sort((a, b) => a.title.localeCompare(b.title, 'cs'))
  }
}

export const useQuickNotes = () => {
  const { notes, addNote, updateNote, deleteNote, togglePin } = useQuickNotesStore()
  const [filter, setFilter] = useState<string>(ALL_NOTES)
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<NoteSortMode>('newest')

  const filteredNotes = useMemo(() => {
    const query = normalizeText(search.trim())

    const matching = notes.filter((note) => {
      const matchesCategory = filter === ALL_NOTES || note.category === filter
      const matchesSearch =
        query === '' ||
        normalizeText(note.title).includes(query) ||
        normalizeText(note.content).includes(query)
      return matchesCategory && matchesSearch
    })

    const sorted = sortNotes(matching, sortMode)
    // Připnuté napřed, ale v pořadí, které dal zvolený sort — filter()
    // pořadí zachovává, takže tohle jen rozdělí, nic nepřerovná navíc.
    return [...sorted.filter((n) => n.pinned), ...sorted.filter((n) => !n.pinned)]
  }, [notes, filter, search, sortMode])

  return {
    notes: filteredNotes,
    totalCount: notes.length,
    filter,
    setFilter,
    search,
    setSearch,
    sortMode,
    setSortMode,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
  }
}
