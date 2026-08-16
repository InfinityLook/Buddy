import React from 'react'
import { usePomodoro } from './usePomodoro'
import { MODE_CONFIG, TimerMode } from './types'
import './Pomodoro.css'

export const Pomodoro: React.FC = () => {
  const { mode, timeLeft, isRunning, completedSessions, switchMode, toggleTimer, resetTimer } = usePomodoro()

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const seconds = (timeLeft % 60).toString().padStart(2, '0')

  return (
    <div className="pomodoro-app">
      <div className="pomo-header">
        <h2>Pomodoro Timer</h2>
        <span className="pomo-sessions">Dokončeno: <strong>{completedSessions}</strong></span>
      </div>

      <div className="pomo-modes">
        {(Object.keys(MODE_CONFIG) as TimerMode[]).map((m) => (
          <button
            key={m}
            className={`pomo-mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => switchMode(m)}
          >
            {MODE_CONFIG[m].label}
          </button>
        ))}
      </div>

      <div className="pomo-timer-card" style={{ '--active-color': MODE_CONFIG[mode].color } as React.CSSProperties}>
        <div className="pomo-time-display">
          {minutes}:{seconds}
        </div>
        <p className="pomo-status">{isRunning ? 'Soustřeď se...' : 'Pravidelné přestávky zvyšují produktivitu'}</p>
      </div>

      <div className="pomo-controls">
        <button className="pomo-btn main" onClick={toggleTimer}>
          {isRunning ? 'PAUZA' : 'START'}
        </button>
        <button className="pomo-btn secondary" onClick={resetTimer}>
          RESET
        </button>
      </div>
    </div>
  )
}
