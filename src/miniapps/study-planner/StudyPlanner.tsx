import React, { useState } from 'react'
import { useStudyPlanner } from './useStudyPlanner'
import { StudyTask } from './types'
import './StudyPlanner.css'

export const StudyPlanner: React.FC = () => {
  const { tasks, toggleTask, addTask, deleteTask } = useStudyPlanner()
  const [showAdd, setShowAdd] = useState(false)
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<StudyTask['priority']>('Střední')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addTask(subject, topic, dueDate || 'Dnes', priority)
    setSubject('')
    setTopic('')
    setDueDate('')
    setShowAdd(false)
  }

  return (
    <div className="sp-app">
      <div className="sp-header">
        <h2>Study Planner</h2>
        <button className="sp-add-btn" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '✕' : '+ Nový úkol'}
        </button>
      </div>

      {showAdd && (
        <form className="sp-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Předmět (např. Fyzika)..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Téma / Úkol..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />
          <div className="sp-form-row">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <select value={priority} onChange={(e) => setPriority(e.target.value as StudyTask['priority'])}>
              <option value="Vysoká">Vysoká</option>
              <option value="Střední">Střední</option>
              <option value="Nízká">Nízká</option>
            </select>
          </div>
          <button type="submit" className="sp-submit-btn">Přidat do plánu</button>
        </form>
      )}

      <div className="sp-list">
        {tasks.map((t) => (
          <div key={t.id} className={`sp-card ${t.completed ? 'completed' : ''}`}>
            <input
              type="checkbox"
              className="sp-checkbox"
              checked={t.completed}
              onChange={() => toggleTask(t.id)}
            />
            <div className="sp-details">
              <div className="sp-card-head">
                <span className="sp-subject">{t.subject}</span>
                <span className={`sp-priority ${t.priority.toLowerCase()}`}>{t.priority}</span>
              </div>
              <p className="sp-topic">{t.topic}</p>
              <span className="sp-date">Termín: {t.dueDate}</span>
            </div>
            <button className="sp-del-btn" onClick={() => deleteTask(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
