import React, { useState } from 'react'
import { useQuickNotes } from './useQuickNotes'
import { ALL_NOTES, NOTE_CATEGORIES, Note, NoteCategory } from './types'
import './QuickNotes.css'

export const QuickNotes: React.FC = () => {
  const {
    notes,
    totalCount,
    filter,
    setFilter,
    search,
    setSearch,
    addNote,
    updateNote,
    deleteNote,
  } = useQuickNotes()

  // null = formulář zavřený, '' = zakládá se nová, jinak id upravované
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<NoteCategory>('Škola')

  const isFormOpen = editingId !== null

  const openAdd = () => {
    setTitle('')
    setContent('')
    setCategory('Škola')
    setEditingId('')
  }

  const openEdit = (note: Note) => {
    setTitle(note.title)
    setContent(note.content)
    setCategory(note.category)
    setEditingId(note.id)
  }

  const closeForm = () => setEditingId(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) updateNote(editingId, title, content, category)
    else addNote(title, content, category)
    closeForm()
  }

  const handleDelete = (note: Note) => {
    if (window.confirm(`Smazat poznámku „${note.title}“?`)) {
      deleteNote(note.id)
      if (editingId === note.id) closeForm()
    }
  }

  return (
    <div className="qn-app">
      <div className="qn-header">
        <h2>Quick Notes</h2>
        <button className="qn-add-btn" onClick={isFormOpen ? closeForm : openAdd}>
          {isFormOpen ? '✕' : '+ Nová'}
        </button>
      </div>

      {/* Hledání dává smysl, až když je v čem hledat */}
      {totalCount > 3 && (
        <input
          type="search"
          className="qn-search"
          placeholder="Hledat v poznámkách..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      <div className="qn-filters">
        {[ALL_NOTES, ...NOTE_CATEGORIES].map((f) => (
          <button
            key={f}
            className={`qn-filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {isFormOpen && (
        <form className="qn-form" onSubmit={handleSubmit}>
          <span className="qn-form-title">
            {editingId ? 'Upravit poznámku' : 'Nová poznámka'}
          </span>

          <input
            type="text"
            placeholder="Název poznámky..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
          <textarea
            placeholder="Obsah..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <div className="qn-form-footer">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as NoteCategory)}
            >
              {NOTE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="qn-form-buttons">
              <button type="button" className="qn-cancel-btn" onClick={closeForm}>
                Zrušit
              </button>
              <button type="submit" className="qn-submit-btn">
                {editingId ? 'Uložit změny' : 'Uložit'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="qn-list">
        {notes.length === 0 ? (
          <div className="qn-empty">
            {totalCount === 0 ? (
              <>
                <span className="qn-empty-icon">📝</span>
                <p>
                  Zatím tu nic není. Zapiš si první poznámku — třeba co máš do
                  příště nastudovat.
                </p>
              </>
            ) : (
              <p>Téhle podmínce neodpovídá žádná poznámka.</p>
            )}
          </div>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="qn-card">
              <div className="qn-card-top">
                <span className={`qn-tag ${n.category.toLowerCase()}`}>{n.category}</span>
                <div className="qn-card-actions">
                  <button
                    className="qn-icon-btn"
                    onClick={() => openEdit(n)}
                    aria-label={`Upravit ${n.title}`}
                  >
                    ✏️
                  </button>
                  <button
                    className="qn-icon-btn danger"
                    onClick={() => handleDelete(n)}
                    aria-label={`Smazat ${n.title}`}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <h4>{n.title}</h4>
              {n.content && <p>{n.content}</p>}

              <span className="qn-date">
                {n.createdAt}
                {n.updatedAt ? ` · upraveno ${n.updatedAt}` : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
