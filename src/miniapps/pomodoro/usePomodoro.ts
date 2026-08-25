import { useCallback, useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import {
  DEFAULT_SETTINGS,
  LIMITS,
  TimerMode,
  TimerSettings,
  clamp,
  durationFor,
} from './types'

// XP se odvíjí od délky bloku, ne od počtu klepnutí. Kdyby byla odměna
// pevná, stačilo by si nastavit pětiminutové soustředění a sbírat stejné
// XP jako za pětadvacetiminutové.
const XP_PER_WORK_MINUTE = 0.6
const xpForWorkBlock = (minutes: number) => Math.max(1, Math.round(minutes * XP_PER_WORK_MINUTE))

// Perzistujeme statistiku a nastavení — samotný běžící časovač úmyslně
// NE, aby po znovunačtení appky nezůstal "zaseknutý" odpočet z minulé
// návštěvy a hlavně aby se nedal získat postup za čas, kdy byla appka
// zavřená.
interface PomodoroStatsState {
  completedSessions: number
  settings: TimerSettings
  incrementCompletedSessions: () => void
  updateSettings: (patch: Partial<TimerSettings>) => void
  resetStats: () => void
}

const usePomodoroStatsStore = create<PomodoroStatsState>()(
  persist(
    (set) => ({
      completedSessions: 0,
      settings: DEFAULT_SETTINGS,

      incrementCompletedSessions: () =>
        set((state) => ({ completedSessions: state.completedSessions + 1 })),

      updateSettings: (patch) =>
        set((state) => {
          const merged = { ...state.settings, ...patch }
          return {
            settings: {
              ...merged,
              work: clamp(merged.work, LIMITS.work.min, LIMITS.work.max),
              shortBreak: clamp(merged.shortBreak, LIMITS.shortBreak.min, LIMITS.shortBreak.max),
              longBreak: clamp(merged.longBreak, LIMITS.longBreak.min, LIMITS.longBreak.max),
              cycleLength: clamp(
                merged.cycleLength,
                LIMITS.cycleLength.min,
                LIMITS.cycleLength.max
              ),
            },
          }
        }),

      resetStats: () => set({ completedSessions: 0 }),
    }),
    {
      name: 'schoolbuddy-pomodoro-storage',
      storage: createJSONStorage(() => secureStorage),

      // Uložený stav ze starší verze žádné nastavení nemá
      merge: (persisted, current) => {
        const saved = persisted as Partial<PomodoroStatsState> | undefined
        return {
          ...current,
          ...saved,
          settings: { ...DEFAULT_SETTINGS, ...(saved?.settings ?? {}) },
        }
      },
    }
  )
)

// Krátké pípnutí přes Web Audio — žádný zvukový soubor, takže nic
// nepřibude do precache a nic se nemusí stahovat offline.
const playChime = (audioCtx: AudioContext | null) => {
  if (!audioCtx) return
  try {
    const now = audioCtx.currentTime
    const gain = audioCtx.createGain()
    gain.connect(audioCtx.destination)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9)

    const osc = audioCtx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.setValueAtTime(1174, now + 0.18)
    osc.connect(gain)
    osc.start(now)
    osc.stop(now + 0.95)
  } catch {
    // Zvuk je bonus, ne podmínka — když ho prohlížeč nepustí, nevadí
  }
}

export const usePomodoro = () => {
  const { completedSessions, settings, incrementCompletedSessions, updateSettings, resetStats } =
    usePomodoroStatsStore()

  const [mode, setMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState(() => durationFor('work', DEFAULT_SETTINGS))
  const [isRunning, setIsRunning] = useState(false)
  // Kolik soustředění proběhlo v aktuálním cyklu — po `cycleLength`
  // přichází dlouhá pauza místo krátké.
  const [cyclePosition, setCyclePosition] = useState(0)

  // Absolutní čas konce. Odpočet se z něj počítá znovu při každém tiku,
  // takže se nemůže rozejít se skutečností. Dřív se odečítalo po jedné
  // sekundě, jenže prohlížeč na pozadí interval zpomaluje (a při uspaném
  // telefonu ho nespustí vůbec) — po návratu do appky se pak ukazoval
  // čas, který dávno uběhl.
  const endsAtRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  // Aby aktuální hodnoty viděl i callback uvnitř intervalu
  const modeRef = useRef(mode)
  const settingsRef = useRef(settings)
  const isRunningRef = useRef(isRunning)
  modeRef.current = mode
  settingsRef.current = settings
  isRunningRef.current = isRunning

  const ensureAudio = () => {
    if (audioCtxRef.current || !settingsRef.current.soundEnabled) return
    try {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctor) audioCtxRef.current = new Ctor()
    } catch {
      audioCtxRef.current = null
    }
  }

  const switchMode = useCallback(
    (newMode: TimerMode, autoStart = false) => {
      setMode(newMode)
      setTimeLeft(durationFor(newMode, settingsRef.current))
      setIsRunning(autoStart)
      endsAtRef.current = autoStart
        ? Date.now() + durationFor(newMode, settingsRef.current) * 1000
        : null
    },
    []
  )

  const handleComplete = useCallback(() => {
    endsAtRef.current = null
    setIsRunning(false)

    if (settingsRef.current.soundEnabled) {
      playChime(audioCtxRef.current)
      // Vibrace na telefonu — když prohlížeč neumí, prostě se nic nestane
      navigator.vibrate?.([200, 100, 200])
    }

    if (modeRef.current === 'work') {
      incrementCompletedSessions()
      // recordAction, ne holé addXp — počítadlo dokončených soustředění (pro
      // odznak) a XP se tak nemůžou rozejít, stejně jako u ostatních miniapek.
      // completedSessions výš je oddělené počítadlo pro zobrazení v appce,
      // recordAction vede svoje vlastní pro gamifikaci.
      useGamificationStore.getState().recordAction('pomodoro', xpForWorkBlock(settingsRef.current.work))

      const nextPosition = cyclePosition + 1
      setCyclePosition(nextPosition)

      // Po nastaveném počtu soustředění přijde dlouhá pauza. Dřív se
      // dlouhá pauza dala jen zvolit ručně a cyklus ji nikdy nenabídl.
      if (nextPosition >= settingsRef.current.cycleLength) {
        setCyclePosition(0)
        switchMode('longBreak')
      } else {
        switchMode('shortBreak')
      }
    } else {
      switchMode('work')
    }
  }, [cyclePosition, incrementCompletedSessions, switchMode])

  // Přepočet zbývajícího času z absolutního konce
  const syncFromEnd = useCallback(() => {
    if (endsAtRef.current === null) return
    const remaining = Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000))
    setTimeLeft(remaining)
    if (remaining === 0) handleComplete()
  }, [handleComplete])

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(syncFromEnd, 250)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, syncFromEnd])

  // Návrat do aplikace (přepnutí záložky, probuzení telefonu) čas hned
  // srovná, aniž by se čekalo na další tik.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncFromEnd()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [syncFromEnd])

  // Změna délky v nastavení se hned projeví na stojícím časovači.
  // Hlídá se identita objektu settings, ne isRunning: kdyby byl v poli
  // závislostí i ten, spustilo by se tohle i při pauze a nastavilo čas
  // zpátky na plnou délku — pauza by pak fungovala jako reset.
  const appliedSettingsRef = useRef(settings)
  useEffect(() => {
    if (appliedSettingsRef.current === settings) return
    appliedSettingsRef.current = settings
    if (isRunningRef.current) return
    setTimeLeft(durationFor(modeRef.current, settings))
  }, [settings])

  const toggleTimer = () => {
    ensureAudio()
    // Prohlížeč zvuk povolí až po gestu uživatele — start je to gesto
    void audioCtxRef.current?.resume?.()

    setIsRunning((running) => {
      if (running) {
        // Pauza: zapamatujeme si zbytek a absolutní konec zahodíme
        endsAtRef.current = null
        return false
      }
      endsAtRef.current = Date.now() + timeLeft * 1000
      return true
    })
  }

  const resetTimer = () => {
    endsAtRef.current = null
    setIsRunning(false)
    setTimeLeft(durationFor(mode, settings))
  }

  const totalSeconds = durationFor(mode, settings)
  const progress = totalSeconds === 0 ? 0 : 1 - timeLeft / totalSeconds

  return {
    mode,
    timeLeft,
    isRunning,
    completedSessions,
    settings,
    cyclePosition,
    progress,
    switchMode: (m: TimerMode) => switchMode(m),
    toggleTimer,
    resetTimer,
    updateSettings,
    resetStats,
    xpPerBlock: xpForWorkBlock(settings.work),
  }
}
