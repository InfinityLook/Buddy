import React, { useState } from 'react'
import { useGoalTracker } from './useGoalTracker'
import {
  ALL_GOALS,
  GOAL_CATEGORIES,
  GOAL_PRIORITIES,
  Goal,
  GoalCategory,
  GoalPriority,
  GoalTyp,
  PRIORITA_LABEL,
  SABLONY_CILU,
  formatujTermin,
  jeNavykOznacenDnes,
  spocitejSeriiNavyku,
  spocitejTydenniPokrokNavyku,
} from './types'
import './GoalTracker.css'

export const GoalTracker: React.FC = () => {
  const {
    activeGoals,
    archivedGoals,
    totalCount,
    doneCount,
    filter,
    setFilter,
    changeProgress,
    addGoal,
    updateGoal,
    deleteGoal,
    pridatZeSablony,
    oznacitNavykDnes,
    nastavPoznamku,
    pridatMilnik,
    prepnoutMilnik,
    smazatMilnik,
  } = useGoalTracker()

  // null = zavřeno, '' = zakládá se nový, jinak id upravovaného cíle
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')
  const [category, setCategory] = useState<GoalCategory>('Studium')
  const [typ, setTyp] = useState<GoalTyp>('cil')
  const [priority, setPriority] = useState<GoalPriority>('stredni')
  const [deadline, setDeadline] = useState('')
  const [poznamka, setPoznamka] = useState('')

  const [sablonyOtevrene, setSablonyOtevrene] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [novyMilnikText, setNovyMilnikText] = useState('')
  const [archivOtevren, setArchivOtevren] = useState(false)

  const isFormOpen = editingId !== null

  const openAdd = () => {
    setTitle('')
    setTarget('')
    setUnit('')
    setCategory('Studium')
    setTyp('cil')
    setPriority('stredni')
    setDeadline('')
    setPoznamka('')
    setEditingId('')
  }

  const openEdit = (goal: Goal) => {
    setTitle(goal.title)
    setTarget(String(goal.target))
    setUnit(goal.unit)
    setCategory(goal.category)
    setTyp(goal.typ ?? 'cil')
    setPriority(goal.priority ?? 'stredni')
    setDeadline(goal.deadline ?? '')
    setPoznamka(goal.poznamka ?? '')
    setEditingId(goal.id)
  }

  const closeForm = () => setEditingId(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const vstup = {
      title,
      target: Number(target),
      unit,
      category,
      typ,
      priority,
      deadline: typ === 'navyk' ? null : deadline || null,
      poznamka,
    }
    if (editingId) updateGoal(editingId, vstup)
    else addGoal(vstup)
    closeForm()
  }

  const handleDelete = (goal: Goal) => {
    if (window.confirm(`Smazat cíl „${goal.title}“?`)) {
      deleteGoal(goal.id)
      if (editingId === goal.id) closeForm()
      if (expandedId === goal.id) setExpandedId(null)
    }
  }

  const [novyMilnikCilId, setNovyMilnikCilId] = useState<string | null>(null)

  const handlePridatMilnik = (goalId: string) => {
    if (!novyMilnikText.trim()) return
    pridatMilnik(goalId, novyMilnikText)
    setNovyMilnikText('')
    setNovyMilnikCilId(null)
  }

  const renderCard = (g: Goal) => {
    const jeNavyk = (g.typ ?? 'cil') === 'navyk'
    const isDone = !jeNavyk && g.current >= g.target
    const percent = jeNavyk
      ? Math.min(100, Math.round((spocitejTydenniPokrokNavyku(g) / g.target) * 100))
      : Math.round((g.current / g.target) * 100)
    const milniky = g.milniky ?? []
    const hotoveMilniky = milniky.filter((m) => m.done).length
    const termin = !jeNavyk && g.deadline ? formatujTermin(g.deadline) : null
    const jeRozbaleno = expandedId === g.id

    return (
      <div key={g.id} className={`gt-card ${isDone ? 'is-done' : ''}`}>
        <div className="gt-card-head">
          <span className="gt-title">{g.title}</span>
          <div className="gt-card-actions">
            <button
              className="gt-icon-btn"
              onClick={() => setExpandedId(jeRozbaleno ? null : g.id)}
              aria-label={jeRozbaleno ? `Sbalit detail ${g.title}` : `Zobrazit detail ${g.title}`}
            >
              {jeRozbaleno ? '▲' : '▼'}
            </button>
            <button className="gt-icon-btn" onClick={() => openEdit(g)} aria-label={`Upravit ${g.title}`}>
              ✏️
            </button>
            <button className="gt-icon-btn danger" onClick={() => handleDelete(g)} aria-label={`Smazat ${g.title}`}>
              ✕
            </button>
          </div>
        </div>

        <div className="gt-meta-row">
          <span className="gt-category">{g.category}</span>
          <span className={`gt-priorita-pill gt-priorita-pill--${g.priority ?? 'stredni'}`}>
            {PRIORITA_LABEL[g.priority ?? 'stredni']}
          </span>
          {jeNavyk && <span className="gt-typ-pill">🔁 Návyk</span>}
          {termin && <span className={`gt-termin-pill gt-termin-pill--${termin.tone}`}>{termin.label}</span>}
          {milniky.length > 0 && (
            <span className="gt-milnik-pocet">
              ☑ {hotoveMilniky}/{milniky.length}
            </span>
          )}
        </div>

        {jeNavyk ? (
          <>
            <div className="gt-info">
              <span>
                {spocitejTydenniPokrokNavyku(g)} / {g.target}× tento týden
              </span>
              <span className="gt-percent">🔥 {spocitejSeriiNavyku(g)} dní v řadě</span>
            </div>
            <div className="gt-progress-bg">
              <div className="gt-progress-fill" style={{ width: `${percent}%` }} />
            </div>
            <button
              className={`gt-navyk-btn ${jeNavykOznacenDnes(g) ? 'is-done' : ''}`}
              onClick={() => oznacitNavykDnes(g.id)}
            >
              {jeNavykOznacenDnes(g) ? '✓ Splněno dnes' : 'Označit jako splněno dnes'}
            </button>
          </>
        ) : (
          <>
            <div className="gt-info">
              <span>
                {g.current} / {g.target} {g.unit}
              </span>
              <span className="gt-percent">{percent}%</span>
            </div>

            <div className="gt-progress-bg">
              <div className="gt-progress-fill" style={{ width: `${percent}%` }} />
            </div>

            <div className="gt-step-row">
              {/* Ubrání pokroku — bez něj se překlep nedal opravit jinak
                  než smazáním celého cíle. */}
              <button
                className="gt-step-btn"
                onClick={() => changeProgress(g.id, -1)}
                disabled={g.current === 0}
                aria-label="Ubrat pokrok"
              >
                −
              </button>

              <button className="gt-inc-btn" onClick={() => changeProgress(g.id, 1)} disabled={isDone}>
                {isDone ? 'Splněno 🎉' : '+ Přidat pokrok'}
              </button>
            </div>
          </>
        )}

        {jeRozbaleno && (
          <div className="gt-detail">
            <label className="gt-detail-label" htmlFor={`gt-poznamka-${g.id}`}>
              Poznámka
            </label>
            <textarea
              id={`gt-poznamka-${g.id}`}
              className="gt-poznamka-textarea"
              placeholder="Soukromá poznámka k cíli…"
              value={g.poznamka ?? ''}
              onChange={(e) => nastavPoznamku(g.id, e.target.value)}
              rows={2}
            />

            <span className="gt-detail-label">Milníky</span>
            <div className="gt-milniky-seznam">
              {milniky.map((m) => (
                <div key={m.id} className="gt-milnik-radek">
                  <button
                    className={`gt-milnik-checkbox ${m.done ? 'is-done' : ''}`}
                    onClick={() => prepnoutMilnik(g.id, m.id)}
                    aria-label={m.done ? `Zrušit splnění ${m.text}` : `Označit ${m.text} jako splněný`}
                  >
                    {m.done ? '☑' : '☐'}
                  </button>
                  <span className={`gt-milnik-text ${m.done ? 'is-done' : ''}`}>{m.text}</span>
                  <button
                    className="gt-milnik-smazat"
                    onClick={() => smazatMilnik(g.id, m.id)}
                    aria-label={`Smazat milník ${m.text}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {milniky.length === 0 && <p className="gt-milniky-prazdno">Zatím žádné milníky.</p>}
            </div>

            <div className="gt-pridat-milnik-form">
              <input
                type="text"
                placeholder="Nový milník…"
                value={novyMilnikCilId === g.id ? novyMilnikText : ''}
                onFocus={() => setNovyMilnikCilId(g.id)}
                onChange={(e) => {
                  setNovyMilnikCilId(g.id)
                  setNovyMilnikText(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handlePridatMilnik(g.id)
                  }
                }}
              />
              <button type="button" className="gt-submit-btn" onClick={() => handlePridatMilnik(g.id)}>
                Přidat
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="gt-app">
      <div className="gt-header">
        <h2>Goal Tracker</h2>
        <div className="gt-header-actions">
          {!isFormOpen && (
            <button className="gt-sablony-btn" onClick={() => setSablonyOtevrene(true)} aria-label="Vybrat ze šablony">
              📐
            </button>
          )}
          <button className="gt-add-btn" onClick={isFormOpen ? closeForm : openAdd}>
            {isFormOpen ? '✕' : '+ Nový Cíl'}
          </button>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="gt-summary">
          Splněno {doneCount} z {totalCount}
        </div>
      )}

      {/* Kategorie se dřív ukládaly, ale nikde se podle nich nedalo filtrovat */}
      {totalCount > 1 && (
        <div className="gt-filters">
          {[ALL_GOALS, ...GOAL_CATEGORIES].map((f) => (
            <button
              key={f}
              className={`gt-filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {isFormOpen && (
        <form className="gt-form" onSubmit={handleSubmit}>
          <span className="gt-form-title">{editingId ? 'Upravit cíl' : 'Nový cíl'}</span>

          <div className="gt-typ-prepinac">
            <button
              type="button"
              className={`gt-typ-btn ${typ === 'cil' ? 'active' : ''}`}
              onClick={() => setTyp('cil')}
            >
              🎯 Cíl
            </button>
            <button
              type="button"
              className={`gt-typ-btn ${typ === 'navyk' ? 'active' : ''}`}
              onClick={() => setTyp('navyk')}
            >
              🔁 Návyk
            </button>
          </div>

          <input
            type="text"
            placeholder="Název cíle..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
          <div className="gt-form-row">
            <input
              type="number"
              min={1}
              placeholder={typ === 'navyk' ? 'Kolikrát týdně' : 'Cíl (počet)'}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            />
            {typ === 'cil' && (
              <input
                type="text"
                placeholder="Jednotka (stran, h...)"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            )}
          </div>
          <div className="gt-form-row">
            <select value={category} onChange={(e) => setCategory(e.target.value as GoalCategory)}>
              {GOAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value as GoalPriority)}>
              {GOAL_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  Priorita: {PRIORITA_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          {typ === 'cil' && (
            <div className="gt-form-row">
              <input
                type="date"
                aria-label="Termín (nepovinné)"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          )}
          <textarea
            className="gt-poznamka-textarea"
            placeholder="Poznámka (nepovinné)…"
            value={poznamka}
            onChange={(e) => setPoznamka(e.target.value)}
            rows={2}
          />
          <button type="submit" className="gt-submit-btn">
            {editingId ? 'Uložit změny' : 'Uložit'}
          </button>
        </form>
      )}

      <div className="gt-list">
        {activeGoals.length === 0 && archivedGoals.length === 0 && (
          <p className="gt-empty">
            {totalCount === 0
              ? 'Zatím tu žádný cíl nemáš. Založ si první — třeba kolik stran chceš přečíst za týden. 🎯'
              : 'V téhle kategorii zatím žádný cíl nemáš.'}
          </p>
        )}

        {activeGoals.map(renderCard)}

        {archivedGoals.length > 0 && (
          <div className="gt-archiv">
            <button className="gt-archiv-hlavicka" onClick={() => setArchivOtevren((v) => !v)}>
              <span>Archiv splněných ({archivedGoals.length})</span>
              <span>{archivOtevren ? '▲' : '▼'}</span>
            </button>
            {archivOtevren && <div className="gt-archiv-telo">{archivedGoals.map(renderCard)}</div>}
          </div>
        )}
      </div>

      {sablonyOtevrene && (
        <div className="gt-sablony-overlay" onClick={() => setSablonyOtevrene(false)}>
          <div className="gt-sablony-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="gt-sablony-hlavicka">
              <span>Šablony cílů</span>
              <button className="gt-icon-btn" onClick={() => setSablonyOtevrene(false)} aria-label="Zavřít šablony">
                ✕
              </button>
            </div>
            {SABLONY_CILU.map((s) => (
              <button
                key={s.id}
                className="gt-sablona-radek"
                onClick={() => {
                  pridatZeSablony(s.id)
                  setSablonyOtevrene(false)
                }}
              >
                <span className="gt-sablona-nazev">
                  {s.typ === 'navyk' ? '🔁' : '🎯'} {s.nazev}
                </span>
                <span className="gt-sablona-popis">{s.popis}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
