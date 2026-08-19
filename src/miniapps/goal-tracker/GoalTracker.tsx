import React, { useState } from 'react'
import { useGoalTracker } from './useGoalTracker'
import { ALL_GOALS, GOAL_CATEGORIES, Goal, GoalCategory } from './types'
import './GoalTracker.css'

export const GoalTracker: React.FC = () => {
  const {
    goals,
    totalCount,
    doneCount,
    filter,
    setFilter,
    changeProgress,
    addGoal,
    updateGoal,
    deleteGoal,
  } = useGoalTracker()

  // null = zavřeno, '' = zakládá se nový, jinak id upravovaného cíle
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')
  const [category, setCategory] = useState<GoalCategory>('Studium')

  const isFormOpen = editingId !== null

  const openAdd = () => {
    setTitle('')
    setTarget('')
    setUnit('')
    setCategory('Studium')
    setEditingId('')
  }

  const openEdit = (goal: Goal) => {
    setTitle(goal.title)
    setTarget(String(goal.target))
    setUnit(goal.unit)
    setCategory(goal.category)
    setEditingId(goal.id)
  }

  const closeForm = () => setEditingId(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) updateGoal(editingId, title, Number(target), unit, category)
    else addGoal(title, Number(target), unit, category)
    closeForm()
  }

  const handleDelete = (goal: Goal) => {
    if (window.confirm(`Smazat cíl „${goal.title}“?`)) {
      deleteGoal(goal.id)
      if (editingId === goal.id) closeForm()
    }
  }

  return (
    <div className="gt-app">
      <div className="gt-header">
        <h2>Goal Tracker</h2>
        <button className="gt-add-btn" onClick={isFormOpen ? closeForm : openAdd}>
          {isFormOpen ? '✕' : '+ Nový Cíl'}
        </button>
      </div>

      {totalCount > 0 && (
        <div className="gt-summary">
          Splněno {doneCount} z {totalCount}
        </div>
      )}

      {/* Kategorie se dřív ukládaly, ale nikde se podle nich nedalo filtrovat */}
      {totalCount > 1 && (
        <div className="gt-filters">
          {[ALL_GOALS, ...GOAL_CATEGORIES].map((f) => (
            <button
              key={f}
              className={`gt-filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {isFormOpen && (
        <form className="gt-form" onSubmit={handleSubmit}>
          <span className="gt-form-title">{editingId ? 'Upravit cíl' : 'Nový cíl'}</span>

          <input
            type="text"
            placeholder="Název cíle..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
          <div className="gt-form-row">
            <input
              type="number"
              min={1}
              placeholder="Cíl (počet)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Jednotka (stran, h...)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
          <div className="gt-form-row">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as GoalCategory)}
            >
              {GOAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button type="submit" className="gt-submit-btn">
              {editingId ? 'Uložit změny' : 'Uložit'}
            </button>
          </div>
        </form>
      )}

      <div className="gt-list">
        {goals.length === 0 && (
          <p className="gt-empty">
            {totalCount === 0
              ? 'Zatím tu žádný cíl nemáš. Založ si první — třeba kolik stran chceš přečíst za týden. 🎯'
              : 'V téhle kategorii zatím žádný cíl nemáš.'}
          </p>
        )}

        {goals.map((g) => {
          const percent = Math.round((g.current / g.target) * 100)
          const isDone = g.current >= g.target

          return (
            <div key={g.id} className={`gt-card ${isDone ? 'is-done' : ''}`}>
              <div className="gt-card-head">
                <span className="gt-title">{g.title}</span>
                <div className="gt-card-actions">
                  <button
                    className="gt-icon-btn"
                    onClick={() => openEdit(g)}
                    aria-label={`Upravit ${g.title}`}
                  >
                    ✏️
                  </button>
                  <button
                    className="gt-icon-btn danger"
                    onClick={() => handleDelete(g)}
                    aria-label={`Smazat ${g.title}`}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <span className="gt-category">{g.category}</span>

              <div className="gt-info">
                <span>
                  {g.current} / {g.target} {g.unit}
                </span>
                <span className="gt-percent">{percent}%</span>
              </div>

              <div className="gt-progress-bg">
                <div className="gt-progress-fill" style={{ width: `${percent}%` }} />
              </div>

              <div className="gt-step-row">
                {/* Ubrání pokroku — bez něj se překlep nedal opravit jinak
                    než smazáním celého cíle. */}
                <button
                  className="gt-step-btn"
                  onClick={() => changeProgress(g.id, -1)}
                  disabled={g.current === 0}
                  aria-label="Ubrat pokrok"
                >
                  −
                </button>

                <button
                  className="gt-inc-btn"
                  onClick={() => changeProgress(g.id, 1)}
                  disabled={isDone}
                >
                  {isDone ? 'Splněno 🎉' : '+ Přidat pokrok'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
