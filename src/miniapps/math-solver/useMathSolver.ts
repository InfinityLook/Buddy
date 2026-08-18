import { useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { HistoryItem } from './types'
import { MathError, solve } from './parser'

// Drobná odměna — výpočet je jeden úkon, ne studijní blok
const XP_PER_CALCULATION = 2
const HISTORY_LIMIT = 20

interface MathHistoryState {
  history: HistoryItem[]
  addToHistory: (item: HistoryItem) => void
  clearHistory: () => void
}

// Historie přežije zavření miniaplikace, stejně jako u ostatních nástrojů.
// Dřív ležela jen v useState a s každým odchodem z appky zmizela.
const useMathHistoryStore = create<MathHistoryState>()(
  persist(
    (set) => ({
      history: [],

      addToHistory: (item) =>
        set((state) => ({ history: [item, ...state.history].slice(0, HISTORY_LIMIT) })),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'schoolbuddy-math-solver-storage',
      storage: createJSONStorage(() => secureStorage),
    }
  )
)

export const useMathSolver = () => {
  const { history, addToHistory, clearHistory } = useMathHistoryStore()
  const [expression, setExpression] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [steps, setSteps] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const resetOutput = () => {
    setResult(null)
    setSteps([])
    setError(null)
  }

  const handleInput = (val: string) => {
    resetOutput()
    setExpression((prev) => prev + val)
  }

  const setExpressionDirect = (val: string) => {
    resetOutput()
    setExpression(val)
  }

  const clear = () => {
    setExpression('')
    resetOutput()
  }

  const deleteLast = () => {
    resetOutput()
    setExpression((prev) => prev.slice(0, -1))
  }

  const calculate = () => {
    if (!expression.trim()) return

    try {
      const solved = solve(expression)
      setResult(solved.result)
      setSteps(solved.kind === 'equation' ? solved.steps : [])
      setError(null)

      addToHistory({
        id: `${Date.now()}`,
        expression,
        result: solved.result,
        steps: solved.kind === 'equation' ? solved.steps : [],
        timestamp: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
      })

      useGamificationStore.getState().recordAction('calculation', XP_PER_CALCULATION)
    } catch (err) {
      setResult(null)
      setSteps([])
      // Hlášky z parseru jsou psané pro uživatele, ostatní chyby ne
      setError(err instanceof MathError ? err.message : 'Výraz se nepodařilo vyhodnotit.')
    }
  }

  return {
    expression,
    result,
    steps,
    error,
    history,
    isEquation: expression.includes('='),
    handleInput,
    setExpression: setExpressionDirect,
    clear,
    deleteLast,
    calculate,
    clearHistory,
  }
}
