export type TimerMode = 'work' | 'shortBreak' | 'longBreak'

export interface TimerSettings {
  // Délky v minutách — tak je uživatel zadává i vidí
  work: number
  shortBreak: number
  longBreak: number
  // Po kolika soustředěních přijde dlouhá pauza
  cycleLength: number
  soundEnabled: boolean
}

export const DEFAULT_SETTINGS: TimerSettings = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
  cycleLength: 4,
  soundEnabled: true,
}

// Meze pro nastavení. Bez horní hranice by šlo zadat nesmysl, bez dolní
// by se z Pomodora stal klikací automat na XP.
export const LIMITS = {
  work: { min: 5, max: 90 },
  shortBreak: { min: 1, max: 30 },
  longBreak: { min: 5, max: 60 },
  cycleLength: { min: 2, max: 8 },
} as const

export const MODE_LABELS: Record<TimerMode, string> = {
  work: 'Soustředění',
  shortBreak: 'Krátká pauza',
  longBreak: 'Dlouhá pauza',
}

export const MODE_COLORS: Record<TimerMode, string> = {
  work: '#f59e0b',
  shortBreak: '#10b981',
  longBreak: '#3b82f6',
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.round(value) || min))

// Délka režimu v sekundách podle nastavení
export const durationFor = (mode: TimerMode, settings: TimerSettings): number =>
  settings[mode] * 60
