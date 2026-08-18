import React from 'react'
import { useMathSolver } from './useMathSolver'
import './MathSolver.css'

// '=' na klávesnici vkládá znak do výrazu (kvůli rovnicím), samotný
// výpočet spouští široké tlačítko pod klávesnicí.
const BUTTONS = [
  'C', '⌫', '%', '÷',
  '7', '8', '9', '×',
  '4', '5', '6', '-',
  '1', '2', '3', '+',
  '0', '.', 'x', '=',
]

const OPERATORS = ['÷', '×', '-', '+']

export const MathSolver: React.FC = () => {
  const {
    expression,
    result,
    steps,
    error,
    history,
    isEquation,
    handleInput,
    setExpression,
    clear,
    deleteLast,
    calculate,
    clearHistory,
  } = useMathSolver()

  const handleBtnClick = (btn: string) => {
    if (btn === 'C') clear()
    else if (btn === '⌫') deleteLast()
    else handleInput(btn)
  }

  return (
    <div className="ms-app">
      <div className="ms-header">
        <h2>Math Solver</h2>
        <span className="ms-badge">Nástroje</span>
      </div>

      <p className="ms-hint">
        Spočítá výraz, nebo vyřeší lineární rovnici s x — třeba <code>3(x-1)=2x+4</code>.
      </p>

      {/* Vstup jde i psát, ať se dlouhá rovnice nemusí klikat po znacích */}
      <input
        className="ms-input"
        value={expression}
        onChange={(e) => setExpression(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') calculate() }}
        placeholder="Napiš výraz nebo rovnici…"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
      />

      <div className="ms-screen">
        {error ? (
          <div className="ms-error">{error}</div>
        ) : (
          <div className="ms-result">{result !== null ? result : ''}</div>
        )}
      </div>

      {steps.length > 0 && (
        <div className="ms-steps">
          <span className="ms-steps-label">Postup:</span>
          <ol className="ms-steps-list">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="ms-keypad">
        {BUTTONS.map((btn) => (
          <button
            key={btn}
            className={`ms-btn ${OPERATORS.includes(btn) ? 'op' : ''} ${btn === 'x' || btn === '=' ? 'sym' : ''}`}
            onClick={() => handleBtnClick(btn)}
          >
            {btn}
          </button>
        ))}
      </div>

      <button className="ms-solve-btn" onClick={calculate}>
        {isEquation ? 'Vyřešit rovnici' : 'Spočítat'}
      </button>

      {history.length > 0 && (
        <div className="ms-history">
          <div className="ms-history-head">
            <span>Historie</span>
            <button className="ms-clear-btn" onClick={clearHistory}>Vymazat</button>
          </div>
          <div className="ms-history-list">
            {history.map((item) => (
              <button
                key={item.id}
                className="ms-history-item"
                onClick={() => setExpression(item.expression)}
                title="Vložit zpátky do výpočtu"
              >
                <span className="ms-history-expr">{item.expression}</span>
                <strong>{item.result}</strong>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
