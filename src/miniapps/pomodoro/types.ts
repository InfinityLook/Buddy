export type TimerMode = 'work' | 'shortBreak' | 'longBreak'

export interface TimerSettings {
  work: number
  shortBreak: number
  longBreak: number
  cycleLength: number
  soundEnabled: boolean
  autoStartNextPhase: boolean
  dailyGoalMinutes?: number
}

export const DEFAULT_SETTINGS: TimerSettings = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
  cycleLength: 4,
  soundEnabled: true,
  autoStartNextPhase: false,
  dailyGoalMinutes: 100,
}

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
  work: 'var(--buddy-accent)',
  shortBreak: 'var(--buddy-success)',
  longBreak: 'var(--buddy-accent-2)',
}

export const clamp = (
  value: number,
  min: number,
  max: number
) => Math.min(max, Math.max(min, Math.round(value) || min))

export const durationFor = (
  mode: TimerMode,
  settings: TimerSettings
) => settings[mode] * 60

export const jeSwitchModeNoOp = (
  target: TimerMode,
  current: TimerMode,
  autoStart: boolean
) => target === current && !autoStart

export interface PomodoroSession {
  id?: string
  taskId?: string | null
  at: number
  minuty: number
  predmet: string | null
}

export interface FocusBlock {
  id: string
  mode: TimerMode
  durationSeconds: number
  startedAt: number
  taskId: string | null
  title: string | null
}

export interface DailyTotal {
  minuty: number
  bloky: number
}

export type DailyTotals = Record<string, DailyTotal>

export const MAX_SESSION_LOG = 300
export const NEJVICE_NAPOSLEDY_POUZITYCH_PREDMETU = 20

export const localDay = (at = Date.now()) => {
  const d = new Date(at)

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const normalizeSettings = (
  input: Partial<TimerSettings> = {}
): TimerSettings => {
  const result = { ...DEFAULT_SETTINGS }

  for (const key of [
    'work',
    'shortBreak',
    'longBreak',
    'cycleLength',
  ] as const) {
    const value = input[key]

    result[key] =
      typeof value === 'number' && Number.isFinite(value)
        ? clamp(value, LIMITS[key].min, LIMITS[key].max)
        : DEFAULT_SETTINGS[key]
  }

  result.soundEnabled =
    typeof input.soundEnabled === 'boolean'
      ? input.soundEnabled
      : DEFAULT_SETTINGS.soundEnabled

  result.autoStartNextPhase =
    typeof input.autoStartNextPhase === 'boolean'
      ? input.autoStartNextPhase
      : false

  result.dailyGoalMinutes =
    typeof input.dailyGoalMinutes === 'number' &&
    Number.isFinite(input.dailyGoalMinutes)
      ? clamp(input.dailyGoalMinutes, 5, 720)
      : 100

  return result
}

export interface SouhrnPredmetu {
  predmet: string | null
  minuty: number
}

export const spocitejSouhrnPodlePredmetu = (
  log: PomodoroSession[]
): SouhrnPredmetu[] => {
  const map = new Map<string | null, number>()

  for (const item of log) {
    map.set(
      item.predmet,
      (map.get(item.predmet) ?? 0) + item.minuty
    )
  }

  return [...map]
    .map(([predmet, minuty]) => ({ predmet, minuty }))
    .sort((a, b) => b.minuty - a.minuty)
}

export const ziskejNaposledyPouziteNazvyPredmetu = (
  log: PomodoroSession[]
): string[] => {
  const seen = new Set<string>()
  const result: string[] = []

  for (let i = log.length - 1; i >= 0; i--) {
    const value = log[i].predmet

    if (value && !seen.has(value)) {
      seen.add(value)
      result.push(value)
    }

    if (
      result.length >=
      NEJVICE_NAPOSLEDY_POUZITYCH_PREDMETU
    ) {
      break
    }
  }

  return result
}

export const totalsFromLog = (
  log: PomodoroSession[]
): DailyTotals => {
  const result: DailyTotals = {}

  for (const item of log) {
    const key = localDay(item.at)
    const old = result[key] ?? { minuty: 0, bloky: 0 }

    result[key] = {
      minuty: old.minuty + item.minuty,
      bloky: old.bloky + 1,
    }
  }

  return result
}
