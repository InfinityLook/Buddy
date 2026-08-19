import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { DEMO_GOAL_IDS, DEMO_GOAL_TITLES, Goal } from './types'

// XP odměna za splnění celého cíle (dosažení target hodnoty)
const XP_PER_COMPLETED_GOAL = 25

interface GoalTrackerState {
  goals: Goal[]
  incrementProgress: (id: string, amount?: number) => void
  addGoal: (title: string, target: number, unit: string, category: Goal['category']) => void
  deleteGoal: (id: string) => void
}

const useGoalTrackerStore = create<GoalTrackerState>()(
  persist(
    (set) => ({
      goals: [],

      incrementProgress: (id, amount = 1) =>
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id === id) {
              const nextVal = Math.min(g.target, g.current + amount)
              // XP jen v okamžiku, kdy cíl poprvé dosáhne své cílové hodnoty
              if (nextVal >= g.target && g.current < g.target) {
                useGamificationStore.getState().addXp(XP_PER_COMPLETED_GOAL)
              }
              return { ...g, current: nextVal }
            }
            return g
          }),
        })),

      addGoal: (title, target, unit, category) => {
        if (!title.trim() || target <= 0) return
        const newGoal: Goal = {
          id: Date.now().toString(),
          title,
          current: 0,
          target,
          unit,
          category,
        }
        set((state) => ({ goals: [...state.goals, newGoal] }))
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
        const goals = (saved?.goals ?? []).filter(
          (goal) => !(DEMO_GOAL_IDS.includes(goal.id) && DEMO_GOAL_TITLES.includes(goal.title))
        )
        return { ...current, ...saved, goals }
      },
      storage: createJSONStorage(() => secureStorage),
    }
  )
)

export const useGoalTracker = () => {
  const { goals, incrementProgress, addGoal, deleteGoal } = useGoalTrackerStore()
  return { goals, incrementProgress, addGoal, deleteGoal }
      }
