import { useState } from 'react'
import { Goal, INITIAL_GOALS } from './types'

export const useGoalTracker = () => {
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS)

  const incrementProgress = (id: string, amount: number = 1) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const nextVal = Math.min(g.target, g.current + amount)
          return { ...g, current: nextVal }
        }
        return g
      })
    )
  }

  const addGoal = (title: string, target: number, unit: string, category: Goal['category']) => {
    if (!title.trim() || target <= 0) return
    const newGoal: Goal = {
      id: Date.now().toString(),
      title,
      current: 0,
      target,
      unit,
      category,
    }
    setGoals((prev) => [...prev, newGoal])
  }

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  return { goals, incrementProgress, addGoal, deleteGoal }
}
