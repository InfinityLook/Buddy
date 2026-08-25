import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import {
  ALL_GOALS,
  DEMO_GOAL_IDS,
  DEMO_GOAL_TITLES,
  Goal,
  GoalCategory,
} from './types'

// XP odměna za splnění celého cíle (dosažení target hodnoty)
const XP_PER_COMPLETED_GOAL = 25

interface GoalTrackerState {
  goals: Goal[]
  changeProgress: (id: string, amount: number) => void
  addGoal: (title: string, target: number, unit: string, category: GoalCategory) => void
  updateGoal: (
    id: string,
    title: string,
    target: number,
    unit: string,
    category: GoalCategory
  ) => void
  deleteGoal: (id: string) => void
}

const useGoalTrackerStore = create<GoalTrackerState>()(
  persist(
    (set) => ({
      goals: [],

      // Kladné i záporné kroky — překlep v počtu stránek se musí dát vzít zpět
      changeProgress: (id, amount) => {
        let justCompleted = false

        set((state) => ({
          goals: state.goals.map((goal) => {
            if (goal.id !== id) return goal

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

      addGoal: (title, target, unit, category) => {
        if (!title.trim() || target <= 0) return

        const newGoal: Goal = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: title.trim(),
          current: 0,
          target,
          unit: unit.trim() || 'kroků',
          category,
          completedAt: null,
        }

        set((state) => ({ goals: [...state.goals, newGoal] }))
      },

      updateGoal: (id, title, target, unit, category) => {
        if (!title.trim() || target <= 0) return

        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === id
              ? {
                  ...goal,
                  title: title.trim(),
                  target,
                  unit: unit.trim() || 'kroků',
                  category,
                  // Když se cíl zvedne, pokrok nesmí zůstat nad ním
                  current: Math.min(goal.current, target),
                }
              : goal
          ),
        }))
      },

      deleteGoal: (id) =>
        set((state) => ({ goals: state.goals.filter((g) => g.id !== id) })),
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
          // Cíle uložené dřív, než přibylo completedAt, se považují za
          // dokončené, pokud už na svůj cíl dosáhly — jinak by za ně
          // XP naskočilo znovu při prvním dalším klepnutí.
          .map((goal) => ({
            ...goal,
            completedAt: goal.completedAt ?? (goal.current >= goal.target ? '' : null),
          }))
        return { ...current, ...saved, goals }
      },
      storage: createJSONStorage(() => secureStorage),
    }
  )
)

export const useGoalTracker = () => {
  const { goals, changeProgress, addGoal, updateGoal, deleteGoal } = useGoalTrackerStore()
  const [filter, setFilter] = useState<string>(ALL_GOALS)

  const filteredGoals = useMemo(
    () => goals.filter((goal) => filter === ALL_GOALS || goal.category === filter),
    [goals, filter]
  )

  const doneCount = goals.filter((goal) => goal.current >= goal.target).length

  return {
    goals: filteredGoals,
    totalCount: goals.length,
    doneCount,
    filter,
    setFilter,
    changeProgress,
    addGoal,
    updateGoal,
    deleteGoal,
  }
}
