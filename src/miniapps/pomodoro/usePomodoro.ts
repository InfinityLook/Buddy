import { useState, useEffect, useRef } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { TimerMode, MODE_CONFIG } from './types'

// XP odměna za jedno dokončené soustředění (pracovní blok Pomodora)
const XP_PER_WORK_SESSION = 15

// Perzistujeme jen počet dokončených session (statistika) —
// samotný běžící časovač úmyslně NEukládáme, aby po znovunačtení
// appky nezůstal "zaseknutý" odpočet z minulé návštěvy.
interface PomodoroStatsState {
  completedSessions: number
  incrementCompletedSessions: () => void
}

const usePomodoroStatsStore = create<PomodoroStatsState>()(
  persist(
    (set) => ({
      completedSessions: 0,
      incrementCompletedSessions: () =>
        set((state) => ({ completedSessions: state.completedSessions + 1 })),
    }),
    {
      name: 'schoolbuddy-pomodoro-storage',
      storage: createJSONStorage(() => secureStorage),
    }
  )
)

export const usePomodoro = () => {
  const [mode, setMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState(MODE_CONFIG.work.duration)
  const [isRunning, setIsRunning] = useState(false)
  const { completedSessions, incrementCompletedSessions } = usePomodoroStatsStore()

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, mode])

  const handleTimerComplete = () => {
    setIsRunning(false)
    if (mode === 'work') {
      incrementCompletedSessions()
      useGamificationStore.getState().addXp(XP_PER_WORK_SESSION)
      switchMode('shortBreak')
    } else {
      switchMode('work')
    }
  }

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode)
    setTimeLeft(MODE_CONFIG[newMode].duration)
    setIsRunning(false)
  }

  const toggleTimer = () => setIsRunning(!isRunning)

  const resetTimer = () => {
    setIsRunning(false)
    setTimeLeft(MODE_CONFIG[mode].duration)
  }

  return {
    mode,
    timeLeft,
    isRunning,
    completedSessions,
    switchMode,
    toggleTimer,
    resetTimer,
  }
                                          }
