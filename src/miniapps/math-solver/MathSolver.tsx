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

// Na režimu úhlu záleží jen u goniometrických funkcí — u 2+2 by značka
// byla jen šum.
const usesTrig = (expression: string) => /sin|cos|tan/i.test(expression)

// Doplňkové znaky a funkce. Vkládají se jako text do výrazu, včetně
// otevírací závorky — uživatel tak dopíše jen argument.
const EXTRAS: { label: string; insert: string }[] = [
  { label: '(', insert: '(' },
  { label: ')', insert: ')' },
  { label: 'x²', insert: '^2' },
  { label: 'xⁿ', insert: '^' },
  { label: '√', insert: '√(' },
  { label: 'π', insert: 'π' },
  { label: 'sin', insert: 'sin(' },
  { label: 'cos', insert: 'cos(' },
  { label: 'tan', insert: 'tan(' },
  { label: 'log', insert: 'log(' },
  { label: 'ln', insert: 'ln(' },
]

export const MathSolver: React.FC = () => {
  const {
    expression,
    result,
    steps,
    error,
    history,
    angleMode,
    setAngleMode,
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
        Spočítá výraz i rovnici s x — lineární <code>3(x-1)=2x+4</code> i kvadratickou{' '}
        <code>x²-5x+6=0</code>, včetně postupu.
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

      {/* Funkce a další znaky. Jsou nad klávesnicí ve vodorovném pásu,
          aby hlavní číselník zůstal stejně velký jako dřív. */}
      <div className="ms-extras">
        {EXTRAS.map((extra) => (
          <button
            key={extra.label}
            className="ms-extra-btn"
            onClick={() => handleInput(extra.insert)}
          >
            {extra.label}
          </button>
        ))}
      </div>

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

      <div className="ms-actions">
        <button className="ms-solve-btn" onClick={calculate}>
          {isEquation ? 'Vyřešit rovnici' : 'Spočítat'}
        </button>

        {/* Bez přepínače by u sin(30) nebylo poznat, jestli jde o stupně
            nebo radiány — a obojí se ve škole používá. */}
        <div className="ms-angle" role="group" aria-label="Jednotka úhlu">
          <button
            className={`ms-angle-btn ${angleMode === 'deg' ? 'active' : ''}`}
            onClick={() => setAngleMode('deg')}
          >
            DEG
          </button>
          <button
            className={`ms-angle-btn ${angleMode === 'rad' ? 'active' : ''}`}
            onClick={() => setAngleMode('rad')}
          >
            RAD
          </button>
        </div>
      </div>

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
                <span className="ms-history-expr">
                  {item.expression}
                  {item.angleMode && usesTrig(item.expression) && (
                    <span className="ms-history-mode">{item.angleMode.toUpperCase()}</span>
                  )}
                </span>
                <strong>{item.result}</strong>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
