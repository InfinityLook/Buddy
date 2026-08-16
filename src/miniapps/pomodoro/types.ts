export type TimerMode = 'work' | 'shortBreak' | 'longBreak'

export interface TimerSettings {
  work: number
  shortBreak: number
  longBreak: number
}

export const MODE_CONFIG: Record<TimerMode, { label: string; duration: number; color: string }> = {
  work: { label: 'Soustředění', duration: 25 * 60, color: '#f59e0b' },
  shortBreak: { label: 'Krátká pauza', duration: 5 * 60, color: '#10b981' },
  longBreak: { label: 'Dlouhá pauza', duration: 15 * 60, color: '#3b82f6' },
}
