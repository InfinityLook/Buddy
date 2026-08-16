import { useState, useEffect, useRef } from 'react'
import { TimerMode, MODE_CONFIG } from './types'

export const usePomodoro = () => {
  const [mode, setMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState(MODE_CONFIG.work.duration)
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

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
      setCompletedSessions((prev) => prev + 1)
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
