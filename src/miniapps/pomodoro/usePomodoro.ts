import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import {
  notificationsEnabled,
  requestNotificationPermission,
  showAppNotification,
} from '@/core/utils/notify'
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

// ==========================================
// Časovač žije v tomhle modulu, ne v Reactu.
//
// Dřív byly mode/timeLeft/isRunning čistý React state uvnitř
// usePomodoro() — odchod z miniaplikace (AppModule.tsx ji odmountuje)
// časovač zahodil úplně, i uprostřed běžícího bloku. Teď je časovač
// v tomhle persistovaném Zustand storu (mode/isRunning/endsAt/
// cyclePosition) a dokončovací setTimeout (completionTimer níž) žije
// jako proměnná modulu, ne uvnitř Reactu — stejný vzorec jako registrace
// service workeru v core/utils/registerSW.ts. Store i timer tak přežijí
// odmount komponenty: uživatel může z Pomodora odejít jinam v appce
// a blok poběží dál, s notifikací po vypršení (viz pomodoroNotify.ts).
//
// Mez: timer je plán JS runtime, ne systémová služba. Přežije odchod
// jinam v appce nebo krátké zhasnutí displeje, ale ne úplné zavření PWA
// z multitaskingu ani reload — na to appka nemá push backend (viz
// api/ v CLAUDE.md). Proto endsAt (absolutní čas konce) i po takovém
// výpadku správně dopočítá zbývající čas při dalším otevření Pomodora —
// viz onRehydrateStorage níž.
// ==========================================

let completionTimer: ReturnType<typeof setTimeout> | null = null
let audioCtx: AudioContext | null = null

const disarmTimer = () => {
  if (completionTimer) {
    clearTimeout(completionTimer)
    completionTimer = null
  }
}

const armTimer = (seconds: number) => {
  disarmTimer()
  completionTimer = setTimeout(() => {
    completionTimer = null
    usePomodoroStore.getState().complete()
  }, Math.max(0, seconds) * 1000)
}

const ensureAudio = (soundEnabled: boolean) => {
  if (audioCtx || !soundEnabled) return
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor) audioCtx = new Ctor()
  } catch {
    audioCtx = null
  }
}

// Krátké pípnutí přes Web Audio — žádný zvukový soubor, takže nic
// nepřibude do precache a nic se nemusí stahovat offline.
const playChime = () => {
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

interface PomodoroState {
  completedSessions: number
  settings: TimerSettings
  mode: TimerMode
  isRunning: boolean
  // Absolutní čas (Date.now()), kdy běžící úsek skončí. null, když
  // časovač neběží — pak platí remainingSeconds.
  endsAt: number | null
  // Kolik sekund zbývá, když časovač NEběží (pauza, čerstvě přepnutý
  // režim). Zdroj pravdy jen mimo běh — během běhu se dopočítává
  // z endsAt, ať se nemusí zapisovat do úložiště každou vteřinu.
  remainingSeconds: number
  cyclePosition: number

  start: () => void
  pause: () => void
  resetTimer: () => void
  switchMode: (mode: TimerMode, autoStart?: boolean) => void
  complete: () => void
  updateSettings: (patch: Partial<TimerSettings>) => void
  resetStats: () => void
}

const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      completedSessions: 0,
      settings: DEFAULT_SETTINGS,
      mode: 'work',
      isRunning: false,
      endsAt: null,
      remainingSeconds: durationFor('work', DEFAULT_SETTINGS),
      cyclePosition: 0,

      start: () => {
        const state = get()
        if (state.isRunning) return

        // Volá se synchronně uvnitř kliknutí na Start — pořád v gestu
        // uživatele, jinak by prohlížeč dialog o svolení i AudioContext
        // odmítl.
        requestNotificationPermission()
        ensureAudio(state.settings.soundEnabled)
        void audioCtx?.resume?.()

        const endsAt = Date.now() + state.remainingSeconds * 1000
        set({ isRunning: true, endsAt })
        armTimer(state.remainingSeconds)
      },

      pause: () => {
        const state = get()
        if (!state.isRunning || state.endsAt === null) return
        disarmTimer()
        const remaining = Math.max(0, Math.round((state.endsAt - Date.now()) / 1000))
        set({ isRunning: false, endsAt: null, remainingSeconds: remaining })
      },

      resetTimer: () => {
        disarmTimer()
        const state = get()
        set({ isRunning: false, endsAt: null, remainingSeconds: durationFor(state.mode, state.settings) })
      },

      switchMode: (mode, autoStart = false) => {
        disarmTimer()
        const state = get()
        const duration = durationFor(mode, state.settings)

        if (autoStart) {
          set({ mode, remainingSeconds: duration, isRunning: true, endsAt: Date.now() + duration * 1000 })
          armTimer(duration)
        } else {
          set({ mode, remainingSeconds: duration, isRunning: false, endsAt: null })
        }
      },

      complete: () => {
        const state = get()
        // Chrání proti dvojitému spuštění, kdyby complete() zavolal
        // modulový timer i nějaká budoucí druhá cesta na stejný okamžik.
        if (!state.isRunning) return
        disarmTimer()

        if (state.settings.soundEnabled) {
          playChime()
          // Vibrace na telefonu — když prohlížeč neumí, prostě se nic nestane
          navigator.vibrate?.([200, 100, 200])
        }

        const finishedMode = state.mode
        void showAppNotification(
          finishedMode === 'work' ? '⏰ Soustředění dokončeno' : '⏰ Pauza skončila',
          finishedMode === 'work' ? 'Blok doběhl — čas na pauzu.' : 'Pauza doběhla — zpátky do práce?',
          'pomodoro'
        )

        if (finishedMode === 'work') {
          set((s) => ({ completedSessions: s.completedSessions + 1 }))
          useGamificationStore.getState().recordAction('pomodoro', xpForWorkBlock(state.settings.work))

          // Po nastaveném počtu soustředění přijde dlouhá pauza. Další
          // úsek se ale nespouští sám — switchMode bez autoStart jen
          // připraví novou délku, start čeká na uživatele.
          const nextPosition = state.cyclePosition + 1
          const cycleDone = nextPosition >= state.settings.cycleLength
          set({ cyclePosition: cycleDone ? 0 : nextPosition })
          get().switchMode(cycleDone ? 'longBreak' : 'shortBreak')
        } else {
          get().switchMode('work')
        }
      },

      updateSettings: (patch) => {
        set((state) => {
          const merged = { ...state.settings, ...patch }
          const settings = {
            ...merged,
            work: clamp(merged.work, LIMITS.work.min, LIMITS.work.max),
            shortBreak: clamp(merged.shortBreak, LIMITS.shortBreak.min, LIMITS.shortBreak.max),
            longBreak: clamp(merged.longBreak, LIMITS.longBreak.min, LIMITS.longBreak.max),
            cycleLength: clamp(merged.cycleLength, LIMITS.cycleLength.min, LIMITS.cycleLength.max),
          }
          // Délka běžícího bloku se změnou nastavení nemění — jen se
          // klidový (nespuštěný) režim přepočítá na novou délku.
          const remainingSeconds = state.isRunning
            ? state.remainingSeconds
            : durationFor(state.mode, settings)
          return { settings, remainingSeconds }
        })
      },

      resetStats: () => set({ completedSessions: 0 }),
    }),
    {
      name: 'schoolbuddy-pomodoro-storage',
      storage: createJSONStorage(() => secureStorage),

      // Uložený stav ze starší verze žádné nastavení (a teď ani časovač) nemá
      merge: (persisted, current) => {
        const saved = persisted as Partial<PomodoroState> | undefined
        return {
          ...current,
          ...saved,
          settings: { ...DEFAULT_SETTINGS, ...(saved?.settings ?? {}) },
        }
      },

      // Doběhne-li blok, zatímco appka/PWA byla zavřená, modulový
      // completionTimer to nezachytí — vznikl znovu až teď, s tímhle
      // otevřením Pomodora. Dorovnáme to tady: pokud reálný čas už
      // endsAt překročil, blok se dokončí hned (uživatel na něj reálně
      // čekal celý čas, i se zavřenou appkou — žádné obcházení odměny,
      // jen pozdější zápis). Pokud ještě běží, timer se jen znovu
      // natáhne na zbytek, ať notifikace po zbytek téhle relace funguje.
      onRehydrateStorage: () => (state) => {
        if (!state || !state.isRunning || state.endsAt === null) return
        const remainingMs = state.endsAt - Date.now()
        if (remainingMs <= 0) {
          queueMicrotask(() => usePomodoroStore.getState().complete())
        } else {
          armTimer(Math.ceil(remainingMs / 1000))
        }
      },
    }
  )
)

export const usePomodoro = () => {
  const {
    completedSessions,
    settings,
    mode,
    isRunning,
    endsAt,
    remainingSeconds,
    cyclePosition,
    start,
    pause,
    resetTimer,
    switchMode,
    updateSettings,
    resetStats,
  } = usePomodoroStore()

  // Jen pro přerendrování zobrazeného odpočtu — samotné dokončení řeší
  // modulový completionTimer výš, nezávisle na tom, jestli je tahle
  // komponenta vůbec připojená.
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!isRunning) return
    const id = window.setInterval(() => forceTick((t) => t + 1), 250)
    return () => window.clearInterval(id)
  }, [isRunning])

  // Návrat do aplikace (přepnutí záložky, probuzení telefonu) čas hned
  // srovná, aniž by se čekalo na další tik.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') forceTick((t) => t + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  const timeLeft =
    isRunning && endsAt !== null ? Math.max(0, Math.round((endsAt - Date.now()) / 1000)) : remainingSeconds

  const toggleTimer = () => {
    if (isRunning) pause()
    else start()
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
    notificationsEnabled: notificationsEnabled(),
  }
}
