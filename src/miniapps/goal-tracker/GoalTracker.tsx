import React, { useState } from 'react'
import { useGoalTracker } from './useGoalTracker'
import { Goal } from './types'
import './GoalTracker.css'

export const GoalTracker: React.FC = () => {
  const { goals, incrementProgress, addGoal, deleteGoal } = useGoalTracker()
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')
  const [category, setCategory] = useState<Goal['category']>('Studium')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addGoal(title, Number(target), unit || 'kroků', category)
    setTitle('')
    setTarget('')
    setUnit('')
    setShowAdd(false)
  }

  return (
    <div className="gt-app">
      <div className="gt-header">
        <h2>Goal Tracker</h2>
        <button className="gt-add-btn" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '✕' : '+ Nový Cíl'}
        </button>
      </div>

      {showAdd && (
        <form className="gt-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Název cíle..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="gt-form-row">
            <input
              type="number"
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
            <select value={category} onChange={(e) => setCategory(e.target.value as Goal['category'])}>
              <option value="Studium">Studium</option>
              <option value="Návyky">Návyky</option>
              <option value="Osobní">Osobní</option>
            </select>
            <button type="submit" className="gt-submit-btn">Uložit</button>
          </div>
        </form>
      )}

      <div className="gt-list">
        {goals.map((g) => {
          const percent = Math.round((g.current / g.target) * 100)
          return (
            <div key={g.id} className="gt-card">
              <div className="gt-card-head">
                <span className="gt-title">{g.title}</span>
                <button className="gt-del-btn" onClick={() => deleteGoal(g.id)}>✕</button>
              </div>
              <div className="gt-info">
                <span>{g.current} / {g.target} {g.unit}</span>
                <span className="gt-percent">{percent}%</span>
              </div>
              <div className="gt-progress-bg">
                <div className="gt-progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <button 
                className="gt-inc-btn" 
                onClick={() => incrementProgress(g.id)}
                disabled={g.current >= g.target}
              >
                {g.current >= g.target ? 'Splněno 🎉' : '+ Přidat pokrok'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
