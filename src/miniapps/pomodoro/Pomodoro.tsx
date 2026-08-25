import React, { useState } from 'react'
import { usePomodoro } from './usePomodoro'
import { LIMITS, MODE_COLORS, MODE_LABELS, TimerMode } from './types'
import './Pomodoro.css'

const MODES: TimerMode[] = ['work', 'shortBreak', 'longBreak']

// Poloměr kruhu s pokrokem — musí sedět s hodnotami v SVG níž
const RING_RADIUS = 78
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export const Pomodoro: React.FC = () => {
  const {
    mode,
    timeLeft,
    isRunning,
    completedSessions,
    settings,
    cyclePosition,
    progress,
    switchMode,
    toggleTimer,
    resetTimer,
    updateSettings,
    resetStats,
    xpPerBlock,
    notificationsEnabled,
  } = usePomodoro()

  const [showSettings, setShowSettings] = useState(false)

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const seconds = (timeLeft % 60).toString().padStart(2, '0')
  const color = MODE_COLORS[mode]

  return (
    <div className="pomodoro-app">
      <div className="pomo-header">
        <h2>Pomodoro Timer</h2>
        <button
          className="pomo-settings-btn"
          onClick={() => setShowSettings((open) => !open)}
          aria-label="Nastavení časovače"
        >
          ⚙️
        </button>
      </div>

      <div className="pomo-modes">
        {MODES.map((m) => (
          <button
            key={m}
            className={`pomo-mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => switchMode(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div
        className="pomo-timer-card"
        style={{ '--active-color': color } as React.CSSProperties}
      >
        {/* Kruh ukazuje, kolik z bloku uteklo — na číslice se při učení
            nekouká, ale ubývající kroužek jde vnímat okem. */}
        <div className="pomo-ring-wrap">
          <svg className="pomo-ring" viewBox="0 0 180 180" aria-hidden="true">
            <circle className="pomo-ring-track" cx="90" cy="90" r={RING_RADIUS} />
            <circle
              className="pomo-ring-fill"
              cx="90"
              cy="90"
              r={RING_RADIUS}
              stroke={color}
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
            />
          </svg>

          <div className="pomo-ring-center">
            <div className="pomo-time-display">
              {minutes}:{seconds}
            </div>
            <span className="pomo-mode-label">{MODE_LABELS[mode]}</span>
          </div>
        </div>

        <p className="pomo-status">
          {isRunning ? 'Soustřeď se…' : 'Pravidelné přestávky zvyšují produktivitu'}
        </p>
      </div>

      {/* Kolikáté soustředění v cyklu — po posledním přijde dlouhá pauza */}
      <div className="pomo-cycle" aria-label={`Cyklus: ${cyclePosition} z ${settings.cycleLength}`}>
        {Array.from({ length: settings.cycleLength }).map((_, i) => (
          <span key={i} className={`pomo-cycle-dot ${i < cyclePosition ? 'is-done' : ''}`} />
        ))}
        <span className="pomo-cycle-text">
          {cyclePosition}/{settings.cycleLength} do dlouhé pauzy
        </span>
      </div>

      <div className="pomo-controls">
        <button className="pomo-btn main" onClick={toggleTimer}>
          {isRunning ? 'PAUZA' : 'START'}
        </button>
        <button className="pomo-btn secondary" onClick={resetTimer}>
          RESET
        </button>
      </div>

      <div className="pomo-stats">
        <span>
          Dokončeno soustředění: <strong>{completedSessions}</strong>
        </span>
        {completedSessions > 0 && (
          <button className="pomo-link-btn" onClick={resetStats}>
            Vynulovat
          </button>
        )}
      </div>

      {showSettings && (
        <div className="pomo-settings">
          <span className="pomo-settings-title">Nastavení</span>

          <label className="pomo-field">
            <span>Soustředění (min)</span>
            <input
              type="number"
              min={LIMITS.work.min}
              max={LIMITS.work.max}
              value={settings.work}
              onChange={(e) => updateSettings({ work: Number(e.target.value) })}
            />
          </label>

          <label className="pomo-field">
            <span>Krátká pauza (min)</span>
            <input
              type="number"
              min={LIMITS.shortBreak.min}
              max={LIMITS.shortBreak.max}
              value={settings.shortBreak}
              onChange={(e) => updateSettings({ shortBreak: Number(e.target.value) })}
            />
          </label>

          <label className="pomo-field">
            <span>Dlouhá pauza (min)</span>
            <input
              type="number"
              min={LIMITS.longBreak.min}
              max={LIMITS.longBreak.max}
              value={settings.longBreak}
              onChange={(e) => updateSettings({ longBreak: Number(e.target.value) })}
            />
          </label>

          <label className="pomo-field">
            <span>Soustředění do dlouhé pauzy</span>
            <input
              type="number"
              min={LIMITS.cycleLength.min}
              max={LIMITS.cycleLength.max}
              value={settings.cycleLength}
              onChange={(e) => updateSettings({ cycleLength: Number(e.target.value) })}
            />
          </label>

          <label className="pomo-field pomo-field--switch">
            <span>Zvuk na konci bloku</span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
            />
          </label>

          <span className="pomo-settings-hint">
            Za dokončené soustředění dostaneš {xpPerBlock} XP — odměna se odvíjí od
            délky bloku.
          </span>

          <span className="pomo-settings-hint">
            Časovač běží dál, i když z Pomodora odejdeš jinam v appce — po skončení
            bloku přijde notifikace.{' '}
            {!notificationsEnabled && 'Zapni si je povolením při prvním spuštění časovače.'}
          </span>
        </div>
      )}
    </div>
  )
}
