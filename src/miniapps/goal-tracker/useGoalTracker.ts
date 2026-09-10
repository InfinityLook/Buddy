import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { requestNotificationPermission, showAppNotification } from '@/core/utils/notify'
import {
  ALL_GOALS,
  DEMO_GOAL_IDS,
  DEMO_GOAL_TITLES,
  Goal,
  GoalCategory,
  GoalPriority,
  GoalTyp,
  Milnik,
  SABLONY_CILU,
  compareGoals,
  dnesniDatum,
  jeHotovyCil,
  jeNavykOznacenDnes,
  sanitizujCil,
} from './types'

// compareGoals/jeHotovyCil/sanitizujCil se dál používají v tomhle
// souboru — re-export kvůli zpětné kompatibilitě volajících, co je
// dřív importovaly odsud (viz komentář u jejich definice v types.ts).
export { compareGoals, jeHotovyCil, sanitizujCil }

// XP odměna za splnění celého cíle (dosažení target hodnoty)
const XP_PER_COMPLETED_GOAL = 25
// XP za odškrtnutí návyku pro daný den — menší, jednorázová akce, ne
// dokončení celého cíle, stejný řád jako Kalendářovo recordAction('kalendar', 5).
const XP_PER_HABIT_CHECKIN = 5

export interface NovyCilVstup {
  title: string
  target: number
  unit: string
  category: GoalCategory
  typ: GoalTyp
  priority: GoalPriority
  deadline: string | null
  poznamka: string
}

interface GoalTrackerState {
  goals: Goal[]
  // Datum (YYYY-MM-DD), kdy naposledy odešlo upozornění na termíny —
  // nejvýš jedno za den, stejný vzor jako Study Plannerovo lastReminderDate.
  lastReminderDate: string | null
  changeProgress: (id: string, amount: number) => void
  addGoal: (vstup: NovyCilVstup) => void
  updateGoal: (id: string, vstup: NovyCilVstup) => void
  deleteGoal: (id: string) => void
  pridatZeSablony: (sablonaId: string) => void
  oznacitNavykDnes: (id: string) => void
  nastavPoznamku: (goalId: string, poznamka: string) => void
  pridatMilnik: (goalId: string, text: string) => void
  prepnoutMilnik: (goalId: string, milnikId: string) => void
  smazatMilnik: (goalId: string, milnikId: string) => void
}

const useGoalTrackerStore = create<GoalTrackerState>()(
  persist(
    (set) => ({
      goals: [],
      lastReminderDate: null,

      // Kladné i záporné kroky — překlep v počtu stránek se musí dát vzít zpět
      changeProgress: (id, amount) => {
        let justCompleted = false

        set((state) => ({
          goals: state.goals.map((goal) => {
            if (goal.id !== id || goal.typ === 'navyk') return goal

            const nextVal = Math.max(0, Math.min(goal.target, goal.current + amount))
            // XP jen v okamžiku, kdy cíl poprvé dosáhne své cílové hodnoty
            if (nextVal >= goal.target && !goal.completedAt) justCompleted = true

            return {
              ...goal,
              current: nextVal,
              completedAt:
                goal.completedAt ?? (nextVal >= goal.target ? new Date().toISOString() : null),
            }
          }),
        }))

        // recordAction, ne holé addXp — počítadlo splněných cílů a XP se
        // tak nemůžou rozejít, stejně jako u ostatních miniapek.
        if (justCompleted) useGamificationStore.getState().recordAction('goal', XP_PER_COMPLETED_GOAL)
      },

      addGoal: (vstup) => {
        if (!vstup.title.trim() || vstup.target <= 0) return

        const newGoal: Goal = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: vstup.title.trim(),
          current: 0,
          target: vstup.target,
          unit: vstup.typ === 'navyk' ? '' : vstup.unit.trim() || 'kroků',
          category: vstup.category,
          completedAt: null,
          typ: vstup.typ,
          priority: vstup.priority,
          deadline: vstup.deadline,
          poznamka: vstup.poznamka.trim(),
          milniky: [],
          navykDny: [],
        }

        set((state) => ({ goals: [...state.goals, newGoal] }))

        // Nastavení termínu je nejpřirozenější chvíle zeptat se na svolení
        // k notifikacím — stejné gesto jako Study Plannerovo addTask,
        // jen podmíněné tím, že uživatel termín vůbec zadal.
        if (vstup.deadline) requestNotificationPermission()
      },

      updateGoal: (id, vstup) => {
        if (!vstup.title.trim() || vstup.target <= 0) return

        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === id
              ? {
                  ...goal,
                  title: vstup.title.trim(),
                  target: vstup.target,
                  unit: vstup.typ === 'navyk' ? '' : vstup.unit.trim() || 'kroků',
                  category: vstup.category,
                  typ: vstup.typ,
                  priority: vstup.priority,
                  deadline: vstup.deadline,
                  poznamka: vstup.poznamka.trim(),
                  // Když se cíl zvedne, pokrok nesmí zůstat nad ním
                  current: vstup.typ === 'navyk' ? goal.current : Math.min(goal.current, vstup.target),
                }
              : goal
          ),
        }))

        if (vstup.deadline) requestNotificationPermission()
      },

      deleteGoal: (id) =>
        set((state) => ({ goals: state.goals.filter((g) => g.id !== id) })),

      pridatZeSablony: (sablonaId) => {
        const sablona = SABLONY_CILU.find((s) => s.id === sablonaId)
        if (!sablona) return

        const newGoal: Goal = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: sablona.nazev,
          current: 0,
          target: sablona.target,
          unit: sablona.unit,
          category: sablona.category,
          completedAt: null,
          typ: sablona.typ,
          priority: 'stredni',
          deadline: null,
          poznamka: '',
          milniky: [],
          navykDny: [],
        }

        set((state) => ({ goals: [...state.goals, newGoal] }))
      },

      oznacitNavykDnes: (id) => {
        let uzOznaceno = false

        set((state) => ({
          goals: state.goals.map((goal) => {
            if (goal.id !== id || goal.typ !== 'navyk') return goal
            const dny = goal.navykDny ?? []
            uzOznaceno = jeNavykOznacenDnes(goal)
            const dnesniIso = dnesniDatum()
            return {
              ...goal,
              // Druhé klepnutí ve stejný den odškrtnutí zase zruší —
              // "splněno dnes" je přepínač, ne jen jednosměrné tlačítko.
              navykDny: uzOznaceno ? dny.filter((d) => d !== dnesniIso) : [...dny, dnesniIso],
            }
          }),
        }))

        if (!uzOznaceno) useGamificationStore.getState().recordAction('navyk', XP_PER_HABIT_CHECKIN)
      },

      // Vlastní, jednodušší akce místo volání updateGoal jen kvůli
      // poznámce — stejná "loose merge-by-id" zásada jako
      // updateKapitola/setPoznamkaPostavy jinde v appce: uloží se přesně
      // to jedno pole, beze zbytku validace celého formuláře cíle.
      nastavPoznamku: (goalId, poznamka) =>
        set((state) => ({
          goals: state.goals.map((g) => (g.id === goalId ? { ...g, poznamka } : g)),
        })),

      pridatMilnik: (goalId, text) => {
        if (!text.trim()) return
        const milnik: Milnik = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: text.trim(), done: false }
        set((state) => ({
          goals: state.goals.map((g) => (g.id === goalId ? { ...g, milniky: [...(g.milniky ?? []), milnik] } : g)),
        }))
      },

      prepnoutMilnik: (goalId, milnikId) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId
              ? { ...g, milniky: (g.milniky ?? []).map((m) => (m.id === milnikId ? { ...m, done: !m.done } : m)) }
              : g
          ),
        })),

      smazatMilnik: (goalId, milnikId) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId ? { ...g, milniky: (g.milniky ?? []).filter((m) => m.id !== milnikId) } : g
          ),
        })),
    }),
    {
      name: 'schoolbuddy-goal-tracker-storage',

      // Ukázkové cíle leží v úložišti i uživatelům, kteří appku otevřeli dřív.
      // Poznáme je podle původního id i názvu zároveň, ať omylem nesmažeme
      // vlastní cíl, který se náhodou jmenuje stejně.
      merge: (persisted, current) => {
        const saved = persisted as Partial<GoalTrackerState> | undefined
        const goals = (saved?.goals ?? [])
          .filter((goal) => !(DEMO_GOAL_IDS.includes(goal.id) && DEMO_GOAL_TITLES.includes(goal.title)))
          // sanitizujCil doplňuje/opravuje completedAt i všechna nová pole
          // najednou — viz jeho vlastní komentář v types.ts pro to, jaký
          // reálný XP bug tahle jedna funkce zavírá.
          .map(sanitizujCil)
        return { ...current, ...saved, goals, lastReminderDate: saved?.lastReminderDate ?? null }
      },
      storage: createJSONStorage(() => secureStorage),
    }
  )
)

// ==========================================
// Upozornění na termíny — stejný vzor jako Study Plannerovo
// setupStudyPlannerReminders (core/utils/registerSW.ts's "modulový"
// idiom). Volá se jednou z App.tsx, ne z komponenty GoalTracker.tsx,
// aby kontrola termínů fungovala i pro uživatele, co appku zrovna
// nemá otevřenou.
// ==========================================

let remindersStarted = false

const checkGoalReminders = () => {
  const state = useGoalTrackerStore.getState()
  const today = dnesniDatum()
  if (state.lastReminderDate === today) return

  const aktivni = state.goals.filter((g) => (g.typ ?? 'cil') === 'cil' && g.current < g.target && g.deadline)
  const overdue = aktivni.filter((g) => g.deadline! < today).length
  const dueToday = aktivni.filter((g) => g.deadline === today).length
  if (overdue === 0 && dueToday === 0) return

  useGoalTrackerStore.setState({ lastReminderDate: today })

  const parts: string[] = []
  if (overdue > 0) parts.push(`${overdue}× po termínu`)
  if (dueToday > 0) parts.push(`${dueToday}× dnes`)

  void showAppNotification('🎯 Termíny v Growth Roomu', parts.join(' · '), 'goal-tracker')
}

/** Zapne kontrolu termínů. Volá se jednou ze startu aplikace (App.tsx). */
export const setupGoalTrackerReminders = (): void => {
  if (remindersStarted) return
  remindersStarted = true

  checkGoalReminders()

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkGoalReminders()
  })
  window.addEventListener('focus', checkGoalReminders)
  window.addEventListener('online', checkGoalReminders)
}

export const useGoalTracker = () => {
  const {
    goals,
    changeProgress,
    addGoal,
    updateGoal,
    deleteGoal,
    pridatZeSablony,
    oznacitNavykDnes,
    nastavPoznamku,
    pridatMilnik,
    prepnoutMilnik,
    smazatMilnik,
  } = useGoalTrackerStore()
  const [filter, setFilter] = useState<string>(ALL_GOALS)

  const filteredGoals = useMemo(() => {
    const filtered = goals.filter((goal) => filter === ALL_GOALS || goal.category === filter)
    return [...filtered].sort(compareGoals)
  }, [goals, filter])

  // Archiv splněných cílů — oddělené od aktivního seznamu, ne jen
  // seřazené na konec, ať appka nabídne skutečně sbalitelnou sekci
  // místo hlavního seznamu, co se navždy plní hotovými cíli.
  const activeGoals = useMemo(() => filteredGoals.filter((g) => !jeHotovyCil(g)), [filteredGoals])
  const archivedGoals = useMemo(() => filteredGoals.filter(jeHotovyCil), [filteredGoals])

  const doneCount = goals.filter(jeHotovyCil).length

  return {
    goals: filteredGoals,
    activeGoals,
    archivedGoals,
    totalCount: goals.length,
    doneCount,
    filter,
    setFilter,
    changeProgress,
    addGoal,
    updateGoal,
    deleteGoal,
    pridatZeSablony,
    oznacitNavykDnes,
    nastavPoznamku,
    pridatMilnik,
    prepnoutMilnik,
    smazatMilnik,
  }
}
