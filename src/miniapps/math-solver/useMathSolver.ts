import { useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { HistoryItem } from './types'
import { AngleMode, MathError, solve } from './parser'

// Drobná odměna — výpočet je jeden úkon, ne studijní blok
const XP_PER_CALCULATION = 2
const HISTORY_LIMIT = 20

interface MathHistoryState {
  history: HistoryItem[]
  // Stupně vs. radiány si uživatel nastaví jednou a drží mu to
  angleMode: AngleMode
  addToHistory: (item: HistoryItem) => void
  clearHistory: () => void
  setAngleMode: (mode: AngleMode) => void
}

// Historie přežije zavření miniaplikace, stejně jako u ostatních nástrojů.
// Dřív ležela jen v useState a s každým odchodem z appky zmizela.
const useMathHistoryStore = create<MathHistoryState>()(
  persist(
    (set) => ({
      history: [],
      angleMode: 'deg',

      addToHistory: (item) =>
        set((state) => ({ history: [item, ...state.history].slice(0, HISTORY_LIMIT) })),

      clearHistory: () => set({ history: [] }),

      setAngleMode: (mode) => set({ angleMode: mode }),
    }),
    {
      name: 'schoolbuddy-math-solver-storage',
      storage: createJSONStorage(() => secureStorage),

      // Uložený stav ze starší verze režim úhlů nezná
      merge: (persisted, current) => {
        const saved = persisted as Partial<MathHistoryState> | undefined
        return { ...current, ...saved, angleMode: saved?.angleMode ?? 'deg' }
      },
    }
  )
)

export const useMathSolver = () => {
  const { history, angleMode, addToHistory, clearHistory, setAngleMode } = useMathHistoryStore()
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
      const solved = solve(expression, angleMode)
      setResult(solved.result)
      setSteps(solved.kind === 'equation' ? solved.steps : [])
      setError(null)

      addToHistory({
        id: `${Date.now()}`,
        expression,
        result: solved.result,
        steps: solved.kind === 'equation' ? solved.steps : [],
        timestamp: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
        angleMode,
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
    angleMode,
    setAngleMode,
    isEquation: expression.includes('='),
    handleInput,
    setExpression: setExpressionDirect,
    clear,
    deleteLast,
    calculate,
    clearHistory,
  }
}
