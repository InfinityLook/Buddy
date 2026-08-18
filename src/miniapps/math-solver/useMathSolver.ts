import { useState } from 'react'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { HistoryItem } from './types'

// Drobná odměna — výpočet je jeden úkon, ne studijní blok
const XP_PER_CALCULATION = 2

export const useMathSolver = () => {
  const [expression, setExpression] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  const handleInput = (val: string) => {
    setExpression((prev) => prev + val)
  }

  const clear = () => {
    setExpression('')
    setResult(null)
  }

  const deleteLast = () => {
    setExpression((prev) => prev.slice(0, -1))
  }

  const calculate = () => {
    if (!expression.trim()) return
    try {
      // Bezpečné vyhodnocení matematického výrazu
      const sanitized = expression.replace(/×/g, '*').replace(/÷/g, '/')
      const evalResult = Function(`'use strict'; return (${sanitized})`)()
      const formattedResult = String(Number.isInteger(evalResult) ? evalResult : Number(evalResult).toFixed(4))
      
      setResult(formattedResult)

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        expression,
        result: formattedResult,
        timestamp: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
      }
      setHistory((prev) => [newItem, ...prev.slice(0, 4)])
      useGamificationStore.getState().recordAction('calculation', XP_PER_CALCULATION)
    } catch {
      setResult('Chyba')
    }
  }

  return {
    expression,
    result,
    history,
    handleInput,
    clear,
    deleteLast,
    calculate,
  }
}
