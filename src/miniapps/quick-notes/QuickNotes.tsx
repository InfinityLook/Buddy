import React, { useState } from 'react'
import { useQuickNotes } from './useQuickNotes'
import { Note } from './types'
import './QuickNotes.css'

export const QuickNotes: React.FC = () => {
  const { notes, filter, setFilter, addNote, deleteNote } = useQuickNotes()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<Note['category']>('Škola')
  const [isAdding, setIsAdding] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addNote(title, content, category)
    setTitle('')
    setContent('')
    setIsAdding(false)
  }

  return (
    <div className="qn-app">
      <div className="qn-header">
        <h2>Quick Notes</h2>
        <button className="qn-add-btn" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? '✕' : '+ Nová'}
        </button>
      </div>

      <div className="qn-filters">
        {['Vše', 'Škola', 'Osobní', 'Nápady'].map((f) => (
          <button
            key={f}
            className={`qn-filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {isAdding && (
        <form className="qn-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Název poznámky..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Obsah..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
          />
          <div className="qn-form-footer">
            <select value={category} onChange={(e) => setCategory(e.target.value as Note['category'])}>
              <option value="Škola">Škola</option>
              <option value="Osobní">Osobní</option>
              <option value="Nápady">Nápady</option>
            </select>
            <button type="submit" className="qn-submit-btn">Uložit</button>
          </div>
        </form>
      )}

      <div className="qn-list">
        {notes.length === 0 ? (
          <p className="qn-empty">Žádné poznámky</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="qn-card">
              <div className="qn-card-top">
                <span className={`qn-tag ${n.category.toLowerCase()}`}>{n.category}</span>
                <button className="qn-del-btn" onClick={() => deleteNote(n.id)}>✕</button>
              </div>
              <h4>{n.title}</h4>
              <p>{n.content}</p>
              <span className="qn-date">{n.createdAt}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
