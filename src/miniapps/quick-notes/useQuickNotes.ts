import { useState } from 'react'
import { Note, INITIAL_NOTES } from './types'

export const useQuickNotes = () => {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES)
  const [filter, setFilter] = useState<string>('Vše')

  const addNote = (title: string, content: string, category: Note['category']) => {
    if (!title.trim()) return
    const newNote: Note = {
      id: Date.now().toString(),
      title,
      content,
      category,
      createdAt: new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
    }
    setNotes((prev) => [newNote, ...prev])
  }

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  const filteredNotes = filter === 'Vše' ? notes : notes.filter((n) => n.category === filter)

  return {
    notes: filteredNotes,
    filter,
    setFilter,
    addNote,
    deleteNote,
  }
}
