import { useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { Note, INITIAL_NOTES } from './types'

const XP_PER_NOTE = 5

interface QuickNotesState {
  notes: Note[]
  addNote: (title: string, content: string, category: Note['category']) => void
  deleteNote: (id: string) => void
}

const useQuickNotesStore = create<QuickNotesState>()(
  persist(
    (set) => ({
      notes: INITIAL_NOTES,

      addNote: (title, content, category) => {
        if (!title.trim()) return
        const newNote: Note = {
          id: Date.now().toString(),
          title,
          content,
          category,
          createdAt: new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
        }
        set((state) => ({ notes: [newNote, ...state.notes] }))
        useGamificationStore.getState().recordAction('note', XP_PER_NOTE)
      },

      deleteNote: (id) =>
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),
    }),
    {
      name: 'schoolbuddy-quick-notes-storage',
      storage: createJSONStorage(() => secureStorage),
    }
  )
)

export const useQuickNotes = () => {
  const { notes, addNote, deleteNote } = useQuickNotesStore()
  const [filter, setFilter] = useState<string>('Vše')

  const filteredNotes = filter === 'Vše' ? notes : notes.filter((n) => n.category === filter)

  return {
    notes: filteredNotes,
    filter,
    setFilter,
    addNote,
    deleteNote,
  }
  }
