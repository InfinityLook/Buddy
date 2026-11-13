import React from 'react'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
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
  const { rootAttributes } = useSurfaceAppearance('math-solver')

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
    <div className="buddy-miniapp math-app buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId="math-solver" />

      <p className="math-hint">
        Spočítá výraz i rovnici s x — lineární <code>3(x-1)=2x+4</code> i kvadratickou{' '}
        <code>x²-5x+6=0</code>, včetně postupu.
      </p>

      {/* Vstup jde i psát, ať se dlouhá rovnice nemusí klikat po znacích */}
      <input
        className="buddy-ui-input math-input"
        aria-label="Výraz nebo rovnice"
        value={expression}
        onChange={(e) => setExpression(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') calculate() }}
        placeholder="Napiš výraz nebo rovnici…"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
      />

      <div className="buddy-ui-card math-screen">
        {error ? (
          <div className="math-error" role="alert">{error}</div>
        ) : (
          <div className="math-result" role="status" aria-label="Výsledek">{result !== null ? result : ''}</div>
        )}
      </div>

      {steps.length > 0 && (
        <div className="buddy-ui-card math-steps">
          <span className="math-steps-label">Postup:</span>
          <ol className="math-steps-list">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Funkce a další znaky. Jsou nad klávesnicí ve vodorovném pásu,
          aby hlavní číselník zůstal stejně velký jako dřív. */}
      <div className="math-extras">
        {EXTRAS.map((extra) => (
          <button
            key={extra.label}
            className="buddy-ui-button math-extra-btn"
            onClick={() => handleInput(extra.insert)}
          >
            {extra.label}
          </button>
        ))}
      </div>

      <div className="math-keypad">
        {BUTTONS.map((btn) => (
          <button
            key={btn}
            className={`buddy-ui-button math-btn ${OPERATORS.includes(btn) ? 'op' : ''} ${btn === 'x' || btn === '=' ? 'sym' : ''}`}
            onClick={() => handleBtnClick(btn)}
          >
            {btn}
          </button>
        ))}
      </div>

      <div className="math-actions">
        <button className="buddy-ui-button buddy-ui-button--primary math-solve-btn" onClick={calculate}>
          {isEquation ? 'Vyřešit rovnici' : 'Spočítat'}
        </button>

        {/* Bez přepínače by u sin(30) nebylo poznat, jestli jde o stupně
            nebo radiány — a obojí se ve škole používá. */}
        <div className="buddy-ui-segmented math-angle" role="group" aria-label="Jednotka úhlu">
          <button
            aria-pressed={angleMode === 'deg'}
            className={`math-angle-btn ${angleMode === 'deg' ? 'active' : ''}`}
            onClick={() => setAngleMode('deg')}
          >
            DEG
          </button>
          <button
            aria-pressed={angleMode === 'rad'}
            className={`math-angle-btn ${angleMode === 'rad' ? 'active' : ''}`}
            onClick={() => setAngleMode('rad')}
          >
            RAD
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="buddy-ui-status math-history">
          <div className="math-history-head">
            <span>Historie</span>
            <button className="buddy-ui-button math-clear-btn" onClick={clearHistory}>Vymazat</button>
          </div>
          <div className="math-history-list">
            {history.map((item) => (
              <button
                key={item.id}
                className="math-history-item"
                onClick={() => setExpression(item.expression)}
                title="Vložit zpátky do výpočtu"
              >
                <span className="math-history-expr">
                  {item.expression}
                  {item.angleMode && usesTrig(item.expression) && (
                    <span className="math-history-mode">{item.angleMode.toUpperCase()}</span>
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
