import React from 'react'
import { useMathSolver } from './useMathSolver'
import './MathSolver.css'

export const MathSolver: React.FC = () => {
  const { expression, result, history, handleInput, clear, deleteLast, calculate } = useMathSolver()

  const buttons = [
    'C', '⌫', '%', '÷',
    '7', '8', '9', '×',
    '4', '5', '6', '-',
    '1', '2', '3', '+',
    '0', '.', '='
  ]

  const handleBtnClick = (btn: string) => {
    if (btn === 'C') clear()
    else if (btn === '⌫') deleteLast()
    else if (btn === '=') calculate()
    else handleInput(btn)
  }

  return (
    <div className="ms-app">
      <div className="ms-header">
        <h2>Math Solver</h2>
        <span className="ms-badge">Nástroje</span>
      </div>

      <div className="ms-screen">
        <div className="ms-expression">{expression || '0'}</div>
        <div className="ms-result">{result !== null ? `= ${result}` : ''}</div>
      </div>

      <div className="ms-keypad">
        {buttons.map((btn) => (
          <button
            key={btn}
            className={`ms-btn ${['÷', '×', '-', '+', '='].includes(btn) ? 'op' : ''} ${btn === '=' ? 'equals' : ''} ${btn === '0' ? 'zero' : ''}`}
            onClick={() => handleBtnClick(btn)}
          >
            {btn}
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <div className="ms-history">
          <span>Historie:</span>
          <div className="ms-history-list">
            {history.map((item) => (
              <div key={item.id} className="ms-history-item">
                <span>{item.expression}</span> = <strong>{item.result}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
