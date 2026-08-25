import React, { useState } from 'react'
import { useStudyPlanner } from './useStudyPlanner'
import {
  StudyTask,
  TASK_FILTERS,
  TASK_PRIORITIES,
  TaskFilter,
  TaskPriority,
  formatDueDate,
  todayIso,
} from './types'
import { sklonujUkoly, zbyvaSloveso } from '@/core/utils/text'
import './StudyPlanner.css'

export const StudyPlanner: React.FC = () => {
  const {
    visibleTasks,
    totalCount,
    pendingCount,
    overdueCount,
    filter,
    setFilter,
    toggleTask,
    addTask,
    updateTask,
    deleteTask,
  } = useStudyPlanner()

  // null = zavřeno, '' = zakládá se nový, jinak id upravovaného úkolu
  const [editingId, setEditingId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('Střední')

  const isFormOpen = editingId !== null

  const openAdd = () => {
    setSubject('')
    setTopic('')
    setDueDate(todayIso())
    setPriority('Střední')
    setEditingId('')
  }

  const openEdit = (task: StudyTask) => {
    setSubject(task.subject)
    setTopic(task.topic)
    // Starý úkol může mít v termínu volný text, který do inputu typu
    // date nepatří — v takovém případě nabídneme dnešek.
    setDueDate(/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : todayIso())
    setPriority(task.priority)
    setEditingId(task.id)
  }

  const closeForm = () => setEditingId(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) updateTask(editingId, subject, topic, dueDate, priority)
    else addTask(subject, topic, dueDate, priority)
    closeForm()
  }

  const handleDelete = (task: StudyTask) => {
    if (window.confirm(`Smazat úkol „${task.topic}“?`)) {
      deleteTask(task.id)
      if (editingId === task.id) closeForm()
    }
  }

  return (
    <div className="sp-app">
      <div className="sp-header">
        <h2>Planer</h2>
        <button className="sp-add-btn" onClick={isFormOpen ? closeForm : openAdd}>
          {isFormOpen ? '✕' : '+ Nový úkol'}
        </button>
      </div>

      {totalCount === 0 && (
        <p className="sp-hint">
          🔔 Založ první úkol a dovolíme upozorňovat, když se blíží nebo mine termín.
        </p>
      )}

      {totalCount > 0 && (
        <div className="sp-summary">
          <span>
            {pendingCount === 0
              ? 'Vše splněno 🎉'
              : `${zbyvaSloveso(pendingCount)} ${pendingCount} ${sklonujUkoly(pendingCount)}`}
          </span>
          {overdueCount > 0 && (
            <span className="sp-summary-overdue">{overdueCount} po termínu</span>
          )}
        </div>
      )}

      {totalCount > 0 && (
        <div className="sp-filters">
          {TASK_FILTERS.map((f) => (
            <button
              key={f}
              className={`sp-filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f as TaskFilter)}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {isFormOpen && (
        <form className="sp-form" onSubmit={handleSubmit}>
          <span className="sp-form-title">{editingId ? 'Upravit úkol' : 'Nový úkol'}</span>

          <input
            type="text"
            placeholder="Předmět (např. Fyzika)..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            autoFocus
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
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="sp-submit-btn">
            {editingId ? 'Uložit změny' : 'Přidat do plánu'}
          </button>
        </form>
      )}

      <div className="sp-list">
        {visibleTasks.length === 0 && (
          <p className="sp-empty">
            {totalCount === 0
              ? 'Zatím tu nemáš žádný úkol. Zapiš si první — co tě čeká do příště? 📚'
              : 'Téhle podmínce neodpovídá žádný úkol.'}
          </p>
        )}

        {visibleTasks.map((t) => {
          const due = formatDueDate(t.dueDate)

          return (
            <div key={t.id} className={`sp-card ${t.completed ? 'completed' : ''}`}>
              <input
                type="checkbox"
                className="sp-checkbox"
                checked={t.completed}
                onChange={() => toggleTask(t.id)}
                aria-label={`Splněno: ${t.topic}`}
              />

              <div className="sp-details">
                <div className="sp-card-head">
                  <span className="sp-subject">{t.subject}</span>
                  <span className={`sp-priority ${t.priority.toLowerCase()}`}>{t.priority}</span>
                </div>

                <p className="sp-topic">{t.topic}</p>

                {/* Termín se barví podle naléhavosti — po termínu červeně,
                    dnes oranžově. Dřív to byl jen šedý text s ISO datem. */}
                <span className={`sp-date ${t.completed ? '' : `is-${due.tone}`}`}>
                  {due.label}
                </span>
              </div>

              <div className="sp-card-actions">
                <button
                  className="sp-icon-btn"
                  onClick={() => openEdit(t)}
                  aria-label={`Upravit ${t.topic}`}
                >
                  ✏️
                </button>
                <button
                  className="sp-icon-btn danger"
                  onClick={() => handleDelete(t)}
                  aria-label={`Smazat ${t.topic}`}
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
