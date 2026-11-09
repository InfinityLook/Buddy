import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import {
  notificationsEnabled,
  showAppNotification,
} from '@/core/utils/notify'
import {
  nahlasPomodoroCasovac,
  zrusPomodoroCasovac,
} from '@/core/utils/push'
import {
  DEFAULT_SETTINGS,
  durationFor,
  localDay,
  MAX_SESSION_LOG,
  normalizeSettings,
  totalsFromLog,
} from './types'
import type {
  DailyTotals,
  FocusBlock,
  PomodoroSession,
  TimerMode,
  TimerSettings,
} from './types'

export const usePomodoroStatus = create<{
  error: string
  returnToPlanner: boolean
  finished: {
    mode: TimerMode
    session: PomodoroSession | null
  } | null
}>(() => ({
  error: '',
  returnToPlanner: false,
  finished: null,
}))

const report = (error: unknown) =>
  usePomodoroStatus.setState({
    error:
      error instanceof Error
        ? error.message
        : 'Změnu se nepodařilo uložit.',
  })

let timer: ReturnType<typeof setTimeout> | null = null
let audio: AudioContext | null = null

const disarm = () => {
  if (timer !== null) clearTimeout(timer)
  timer = null
}

const chime = () => {
  if (!audio) return

  try {
    const gain = audio.createGain()
    const osc = audio.createOscillator()
    const now = audio.currentTime

    gain.connect(audio.destination)
    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7)

    osc.connect(gain)
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.setValueAtTime(1174, now + 0.18)
    osc.start(now)
    osc.stop(now + 0.75)
  } catch {
    // Zvuk není podmínkou uložení bloku.
  }
}

const prepareAudio = () => {
  if (!getPomodoroState().settings.soundEnabled) return

  try {
    if (!audio && window.AudioContext) {
      audio = new AudioContext()
    }

    void audio?.resume().catch(() => {})
  } catch {
    // Nepodporovaný zvuk.
  }
}

const arm = () => {
  disarm()

  const state = getPomodoroState()

  if (!state.isRunning || state.endsAt == null) return

  timer = setTimeout(() => {
    timer = null

    try {
      getPomodoroState().complete()
    } catch (error) {
      report(error)
    }
  }, Math.max(0, state.endsAt - Date.now()))
}

interface PomodoroState {
  settings: TimerSettings
  mode: TimerMode
  isRunning: boolean
  endsAt: number | null
  remainingSeconds: number
  cyclePosition: number
  block: FocusBlock | null
  aktivniPredmet: string | null
  aktivniUkolId: string | null
  completedSessions: number
  sessionLog: PomodoroSession[]
  dailyTotals: DailyTotals

  start: () => void
  pause: () => void
  resetTimer: () => void
  switchMode: (mode: TimerMode, autoStart?: boolean) => void
  complete: () => void
  updateSettings: (patch: Partial<TimerSettings>) => void
  resetStats: () => void
  setAktivniPredmet: (title: string | null) => void
  setTask: (
    id: string | null,
    title: string | null
  ) => boolean
}

const modes: TimerMode[] = [
  'work',
  'shortBreak',
  'longBreak',
]

const finite = (v: unknown): v is number =>
  typeof v === 'number' &&
  Number.isFinite(v) &&
  v >= 0

const object = (
  v: unknown
): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

const id = () =>
  crypto.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => {
      const commit = (patch: Partial<PomodoroState>) => {
        const previous = get()

        try {
          set(patch)
        } catch {
          try {
            set(previous)
          } catch {
            // Poslední uložená hodnota zůstává.
          }

          throw new Error(
            'Zápis Pomodora selhal. Zkontroluj volné místo v zařízení a zkus to znovu.'
          )
        }

        usePomodoroStatus.setState({ error: '' })
      }

      const cancel = (block: FocusBlock | null) => {
        if (block) {
          void Promise.resolve(
            zrusPomodoroCasovac(block.id)
          ).catch(report)
        }
      }

      return {
        settings: DEFAULT_SETTINGS,
        mode: 'work',
        isRunning: false,
        endsAt: null,
        remainingSeconds: durationFor(
          'work',
          DEFAULT_SETTINGS
        ),
        cyclePosition: 0,
        block: null,
        aktivniPredmet: null,
        aktivniUkolId: null,
        completedSessions: 0,
        sessionLog: [],
        dailyTotals: {},

        start: () => {
          const state = get()

          if (state.isRunning) return

          prepareAudio()

          const block = state.block ?? {
            id: id(),
            mode: state.mode,
            durationSeconds: durationFor(
              state.mode,
              state.settings
            ),
            startedAt: Date.now(),
            taskId: state.aktivniUkolId,
            title: state.aktivniPredmet?.trim() || null,
          }

          const remainingSeconds = state.block
            ? state.remainingSeconds
            : block.durationSeconds

          const endsAt =
            Date.now() + remainingSeconds * 1000

          commit({
            block,
            remainingSeconds,
            isRunning: true,
            endsAt,
          })

          usePomodoroStatus.setState({ finished: null })
          arm()

          void Promise.resolve(
            nahlasPomodoroCasovac(
              endsAt,
              state.mode === 'work' ? 'prace' : 'pauza',
              block.id
            )
          ).catch(report)
        },

        pause: () => {
          const state = get()

          if (!state.isRunning || state.endsAt == null) {
            return
          }

          if (state.endsAt <= Date.now()) {
            get().complete()
            return
          }

          commit({
            isRunning: false,
            endsAt: null,
            remainingSeconds: Math.max(
              0,
              Math.ceil(
                (state.endsAt - Date.now()) / 1000
              )
            ),
          })

          disarm()
          cancel(state.block)
        },

        resetTimer: () => {
          const state = get()

          commit({
            block: null,
            isRunning: false,
            endsAt: null,
            remainingSeconds: durationFor(
              state.mode,
              state.settings
            ),
          })

          disarm()
          cancel(state.block)
        },

        switchMode: (mode, autoStart = false) => {
          if (
            !modes.includes(mode) ||
            (mode === get().mode && !autoStart)
          ) {
            return
          }

          const state = get()

          commit({
            mode,
            block: null,
            isRunning: false,
            endsAt: null,
            remainingSeconds: durationFor(
              mode,
              state.settings
            ),
          })

          disarm()
          cancel(state.block)

          if (autoStart) get().start()
        },

        complete: () => {
          const state = get()
          const block = state.block

          if (
            !state.isRunning ||
            !block ||
            state.endsAt == null ||
            state.endsAt > Date.now()
          ) {
            return
          }

          const isWork = block.mode === 'work'
          const exists = state.sessionLog.some(
            item => item.id === block.id
          )

          const session: PomodoroSession | null =
            isWork && !exists
              ? {
                  id: block.id,
                  at: state.endsAt,
                  minuty: block.durationSeconds / 60,
                  predmet: block.title,
                  ...(block.taskId
                    ? { taskId: block.taskId }
                    : {}),
                }
              : null

          const position =
            state.cyclePosition + (isWork ? 1 : 0)

          const next: TimerMode = isWork
            ? position >= state.settings.cycleLength
              ? 'longBreak'
              : 'shortBreak'
            : 'work'

          let dailyTotals = state.dailyTotals

          if (session) {
            const key = localDay(session.at)
            const old = dailyTotals[key] ?? {
              minuty: 0,
              bloky: 0,
            }

            dailyTotals = {
              ...dailyTotals,
              [key]: {
                minuty: old.minuty + session.minuty,
                bloky: old.bloky + 1,
              },
            }
          }

          commit({
            mode: next,
            block: null,
            isRunning: false,
            endsAt: null,
            remainingSeconds: durationFor(
              next,
              state.settings
            ),
            cyclePosition:
              isWork &&
              position >= state.settings.cycleLength
                ? 0
                : position,
            dailyTotals,
            completedSessions:
              state.completedSessions + (session ? 1 : 0),
            sessionLog: session
              ? [...state.sessionLog, session].slice(
                  -MAX_SESSION_LOG
                )
              : state.sessionLog,
          })

          disarm()
          cancel(block)

          usePomodoroStatus.setState({
            finished: { mode: block.mode, session },
          })

          if (session) {
            try {
              useGamificationStore
                .getState()
                .recordAction(
                  'pomodoro',
                  Math.max(
                    1,
                    Math.round(session.minuty * 0.6)
                  )
                )
            } catch {
              report(
                new Error(
                  'Blok je uložený, ale odměnu se nepodařilo zapsat.'
                )
              )
            }
          }

          // Po dlouhém odložení dokončíme pouze
          // skutečně spuštěný blok.
          if (
            Date.now() - sessionTime(state) <
            60000
          ) {
            if (state.settings.soundEnabled) {
              chime()
              navigator.vibrate?.([150, 80, 150])
            }

            void showAppNotification(
              isWork
                ? 'Soustředění dokončeno'
                : 'Pauza skončila',
              isWork
                ? 'Hotovo. Dej si chvíli pauzu.'
                : 'Můžeš začít další blok.',
              'pomodoro'
            )
          }

          if (
            state.settings.autoStartNextPhase &&
            Date.now() - sessionTime(state) < 60000
          ) {
            get().start()
          }
        },

        updateSettings: patch => {
          const state = get()
          const settings = normalizeSettings({
            ...state.settings,
            ...patch,
          })

          commit({
            settings,
            remainingSeconds: state.block
              ? state.remainingSeconds
              : durationFor(state.mode, settings),
          })
        },

        resetStats: () =>
          commit({
            completedSessions: 0,
            sessionLog: [],
            dailyTotals: {},
          }),

        setAktivniPredmet: title => {
          if (!get().block) {
            commit({
              aktivniPredmet:
                title?.slice(0, 300) ?? null,
              aktivniUkolId: null,
            })
          }
        },

        setTask: (taskId, title) => {
          if (get().block) return false

          commit({
            aktivniPredmet:
              title?.slice(0, 300) ?? null,
            aktivniUkolId: taskId,
          })

          return true
        },
      }
    },
    {
      name: 'schoolbuddy-pomodoro-storage',
      storage: createJSONStorage(() => secureStorage),

      partialize: state => ({
        settings: state.settings,
        mode: state.mode,
        isRunning: state.isRunning,
        endsAt: state.endsAt,
        remainingSeconds: state.remainingSeconds,
        cyclePosition: state.cyclePosition,
        block: state.block,
        aktivniPredmet: state.aktivniPredmet,
        aktivniUkolId: state.aktivniUkolId,
        completedSessions: state.completedSessions,
        sessionLog: state.sessionLog,
        dailyTotals: state.dailyTotals,
      }),

      merge: (persisted, current) => {
        const saved = object(persisted)
          ? persisted
          : {}

        const settings = normalizeSettings(
          object(saved.settings) ? saved.settings : {}
        )

        const mode = modes.includes(
          saved.mode as TimerMode
        )
          ? (saved.mode as TimerMode)
          : 'work'

        const log: PomodoroSession[] =
          Array.isArray(saved.sessionLog)
            ? saved.sessionLog
                .filter(object)
                .filter(
                  item =>
                    finite(item.at) &&
                    finite(item.minuty) &&
                    item.minuty >= 1 &&
                    item.minuty <= 90
                )
                .map(item => ({
                  at: item.at as number,
                  minuty: item.minuty as number,
                  predmet:
                    typeof item.predmet === 'string'
                      ? item.predmet.slice(0, 300)
                      : null,
                  ...(typeof item.id === 'string'
                    ? { id: item.id }
                    : {}),
                  ...(typeof item.taskId === 'string'
                    ? { taskId: item.taskId }
                    : {}),
                }))
                .slice(-MAX_SESSION_LOG)
            : []

        const dailyTotals = totalsFromLog(log)

        if (object(saved.dailyTotals)) {
          for (const [key, value] of Object.entries(
            saved.dailyTotals
          )) {
            if (
              /^\d{4}-\d{2}-\d{2}$/.test(key) &&
              object(value) &&
              finite(value.minuty) &&
              finite(value.bloky)
            ) {
              dailyTotals[key] = {
                minuty: value.minuty,
                bloky: Math.floor(value.bloky),
              }
            }
          }
        }

        const title =
          typeof saved.aktivniPredmet === 'string'
            ? saved.aktivniPredmet
            : null

        const taskId =
          typeof saved.aktivniUkolId === 'string'
            ? saved.aktivniUkolId
            : null

        const raw = object(saved.block)
          ? saved.block
          : null

        let block: FocusBlock | null =
          raw &&
          typeof raw.id === 'string' &&
          raw.mode === mode &&
          finite(raw.durationSeconds) &&
          raw.durationSeconds >= 60 &&
          raw.durationSeconds <= 5400 &&
          finite(raw.startedAt)
            ? {
                id: raw.id,
                mode,
                durationSeconds: raw.durationSeconds,
                startedAt: raw.startedAt,
                title:
                  typeof raw.title === 'string'
                    ? raw.title
                    : null,
                taskId:
                  typeof raw.taskId === 'string'
                    ? raw.taskId
                    : null,
              }
            : null

        let remainingSeconds = finite(
          saved.remainingSeconds
        )
          ? Math.min(
              saved.remainingSeconds,
              block?.durationSeconds ??
                durationFor(mode, settings)
            )
          : durationFor(mode, settings)

        const endsAt =
          finite(saved.endsAt) &&
          saved.endsAt <= Date.now() + 5400000
            ? saved.endsAt
            : null

        const isRunning =
          saved.isRunning === true && endsAt !== null

        if (
          !block &&
          (isRunning ||
            remainingSeconds <
              durationFor(mode, settings))
        ) {
          block = {
            id: id(),
            mode,
            durationSeconds: durationFor(
              mode,
              settings
            ),
            startedAt: Date.now(),
            title,
            taskId,
          }
        }

        if (!block) {
          remainingSeconds = durationFor(mode, settings)
        }

        return {
          ...current,
          settings,
          mode,
          block,
          remainingSeconds,
          isRunning,
          endsAt: isRunning ? endsAt : null,
          cyclePosition: finite(saved.cyclePosition)
            ? Math.min(
                Math.floor(saved.cyclePosition),
                settings.cycleLength! - 1
              )
            : 0,
          aktivniPredmet: title,
          aktivniUkolId: taskId,
          completedSessions: finite(
            saved.completedSessions
          )
            ? Math.max(
                Math.floor(saved.completedSessions),
                log.length
              )
            : log.length,
          sessionLog: log,
          dailyTotals,
        }
      },

      onRehydrateStorage: () => state => {
        if (state?.isRunning) queueMicrotask(arm)
      },
    }
  )
)

function sessionTime(state: PomodoroState) {
  return state.endsAt ?? Date.now()
}

export const getPomodoroState = () =>
  usePomodoroStore.getState()

export const nastavAktivniPredmetZPlanovace = (
  title: string
) => getPomodoroState().setAktivniPredmet(title)

export const spustitSoustredeniUkolu = (
  taskId: string,
  title: string
): boolean => {
  const state = getPomodoroState()

  if (
    state.block &&
    (state.block.taskId !== taskId ||
      state.mode !== 'work')
  ) {
    return false
  }

  if (!state.block) {
    state.setTask(taskId, title)
    state.switchMode('work')
  }

  getPomodoroState().start()

  usePomodoroStatus.setState({
    returnToPlanner: true,
  })

  return true
}

export const useTaskFocusMinutes = (
  taskId: string | null
) =>
  usePomodoroStore(state =>
    taskId
      ? state.sessionLog.reduce(
          (sum, item) =>
            sum +
            (item.taskId === taskId ? item.minuty : 0),
          0
        )
      : 0
  )

export const usePomodoro = () => {
  const state = usePomodoroStore()
  const [, tick] = useState(0)

  useEffect(() => {
    const update = () => {
      if (document.hidden) return

      try {
        getPomodoroState().complete()
      } catch (error) {
        report(error)
      }

      tick(v => v + 1)
    }

    const midnight = new Date()
    midnight.setHours(24, 0, 0, 100)

    const clock = state.isRunning
      ? window.setInterval(update, 1000)
      : window.setTimeout(
          update,
          midnight.getTime() - Date.now()
        )

    document.addEventListener(
      'visibilitychange',
      update
    )
    window.addEventListener('focus', update)

    return () => {
      clearInterval(clock)
      document.removeEventListener(
        'visibilitychange',
        update
      )
      window.removeEventListener('focus', update)
    }
  }, [state.isRunning])

  const timeLeft =
    state.isRunning && state.endsAt != null
      ? Math.max(
          0,
          Math.ceil(
            (state.endsAt - Date.now()) / 1000
          )
        )
      : state.remainingSeconds

  const duration =
    state.block?.durationSeconds ??
    durationFor(state.mode, state.settings)

  return {
    ...state,
    timeLeft,
    progress: Math.min(
      1,
      Math.max(0, 1 - timeLeft / duration)
    ),
    toggleTimer: () =>
      state.isRunning ? state.pause() : state.start(),
    xpPerBlock: Math.max(
      1,
      Math.round(
        (state.block?.durationSeconds ??
          state.settings.work * 60) /
          60 *
          0.6
      )
    ),
    notificationsEnabled: notificationsEnabled(),
  }
}
