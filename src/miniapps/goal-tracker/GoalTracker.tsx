import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { useHasPermission } from '@/core/role'
import { useAppStore } from '@/core/store/useAppStore'
import { sdilejText } from '@/core/utils/sdileni'
import { stahnoutTextovySoubor } from '@/core/utils/download'
import {
  getRawGoalTrackerState,
  setRawGoalTrackerState,
  subscribeGoalTrackerStore,
  useGoalTracker,
} from './useGoalTracker'
import type { NovyCilVstup } from './useGoalTracker'
import {
  GOAL_CATEGORIES,
  GOAL_PRIORITIES,
  PRIORITA_LABEL,
  SABLONY_CILU,
  formatujTermin,
  jeNavykOznacenDnes,
  sestavTextSdileniCile,
  spocitejHeatmapuNavyku,
  spocitejSeriiNavyku,
  spocitejTydenniPokrokNavyku,
} from './types'
import type { Goal } from './types'
import {
  MAX_GOAL_VALUE,
  goalPercent,
  goalSummary,
  progressAmount,
  safeGoalCsv,
  selectGoals,
  validateGoalInput,
} from './goalTrackerTools'
import type { GoalSort, GoalView } from './goalTrackerTools'
import './GoalTracker.css'

const emptyForm = (): NovyCilVstup => ({
  title: '',
  target: 10,
  unit: 'kroků',
  category: 'Osobní',
  typ: 'cil',
  priority: 'stredni',
  deadline: null,
  poznamka: '',
})

const format = (value: number) =>
  value.toLocaleString('cs-CZ', {
    maximumFractionDigits: 4,
  })

const tabs: [GoalView, string][] = [
  ['active', 'Cíle'],
  ['habits', 'Návyky'],
  ['done', 'Splněné'],
  ['trash', 'Koš'],
]

function Sheet({
  title,
  close,
  children,
}: {
  title: string
  close: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const { rootAttributes } = useSurfaceAppearance('goal-tracker')

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.showModal()

    return () => {
      ref.current?.close()
      previous?.focus()
    }
  }, [])

  return createPortal(
    <dialog
      ref={ref}
      className="gt-dialog buddy-theme-scope"
      {...rootAttributes}
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault()
        close()
      }}
      onClick={event => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div>
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="gt-icon"
            aria-label="Zavřít nabídku"
            onClick={close}
          >
            ✕
          </button>
        </header>

        <div className="gt-sheet-body">
          {children}
        </div>
      </div>
    </dialog>,
    document.body
  )
}

export function GoalTracker({
  onBack,
}: {
  onBack?: () => void
}) {
  const api = useGoalTracker()
  const vip = useHasPermission('cosmetics.premium')

  const goals = useSyncExternalStore(
    subscribeGoalTrackerStore,
    () => getRawGoalTrackerState().goals
  )

  const { rootAttributes } = useSurfaceAppearance('goal-tracker')
  const root = useRef<HTMLDivElement>(null)

  const [now, setNow] = useState(() => new Date())
  const [view, setView] = useState<GoalView>('active')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<GoalSort>('priority')

  const [panel, setPanel] = useState<
    'form' | 'templates' | 'data' | null
  >(null)

  const [form, setForm] = useState<NovyCilVstup>(emptyForm)
  const [original, setOriginal] = useState<Goal | null>(null)
  const [formDirty, setFormDirty] = useState(false)
  const [error, setError] = useState('')

  const [detailId, setDetailId] = useState<string | null>(null)
  const [milestone, setMilestone] = useState('')
  const [amount, setAmount] = useState('1')
  const [message, setMessage] = useState('')
  const [undoId, setUndoId] = useState<string | null>(null)

  const summary = goalSummary(goals, now)
  const filtered = selectGoals(
    goals,
    view,
    category,
    query,
    sort
  )

  const detail = goals.find(
    goal => goal.id === detailId && !goal.deletedAt
  )

  const say = (text: string) => {
    setMessage(text)
    setUndoId(null)
  }

  const run = (fn: () => void): boolean => {
    const before = getRawGoalTrackerState().goals

    try {
      fn()
      setError('')
      return true
    } catch (cause) {
      try {
        setRawGoalTrackerState({ goals: before })
      } catch {
        /* Vrátíme i paměťový stav. */
      }

      const text = cause instanceof Error
        ? cause.message
        : 'Akce se nepovedla.'

      setError(text)
      say(text)
      return false
    }
  }

  useEffect(() => {
    const refresh = () => setNow(new Date())
    const timer = window.setInterval(refresh, 30000)

    document.addEventListener('visibilitychange', refresh)

    const viewport = window.visualViewport
    const host = root.current?.closest<HTMLElement>(
      '.app-fullscreen-view--goals'
    )

    const resize = () => {
      if (host && viewport) {
        host.style.height = `${viewport.height}px`
      }
    }

    resize()
    viewport?.addEventListener('resize', resize)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      viewport?.removeEventListener('resize', resize)
      host?.style.removeProperty('height')
    }
  }, [])

  const closePanel = () => {
    if (
      panel !== 'form' ||
      !formDirty ||
      window.confirm('Zahodit neuložené změny formuláře?')
    ) {
      setPanel(null)
      setError('')
    }
  }

  const openForm = (goal?: Goal) => {
    setOriginal(goal ?? null)

    setForm(goal ? {
      title: goal.title,
      target: goal.target,
      unit: goal.unit,
      category: goal.category,
      typ: goal.typ ?? 'cil',
      priority: goal.priority ?? 'stredni',
      deadline: goal.deadline ?? null,
      poznamka: goal.poznamka ?? '',
    } : emptyForm())

    setFormDirty(false)
    setDetailId(null)
    setError('')
    setPanel('form')
  }

  const patch = (change: Partial<NovyCilVstup>) => {
    setForm(value => ({ ...value, ...change }))
    setFormDirty(true)
  }

  const restore = (id: string) => run(() => {
    const state = getRawGoalTrackerState()

    if (
      !state.goals.some(
        goal => goal.id === id && goal.deletedAt
      )
    ) {
      throw new Error('Cíl už není v koši.')
    }

    setRawGoalTrackerState({
      goals: state.goals.map(goal =>
        goal.id === id
          ? {
            ...goal,
            deletedAt: null,
            updatedAt: Math.max(
              Date.now(),
              goal.updatedAt + 1
            ),
          }
          : goal
      ),
    })

    say('Cíl byl obnoven.')
  })

  const trash = (goal: Goal) => {
    if (run(() => api.deleteGoal(goal.id))) {
      setDetailId(null)
      setMessage('Přesunuto do koše.')
      setUndoId(goal.id)
    }
  }

  const progress = (goal: Goal, direction: number) =>
    run(() => {
      const delta = progressAmount(amount) * direction
      const completed = api.changeProgress(goal.id, delta)

      say(
        completed
          ? 'Cíl je splněný. Dobrá práce!'
          : 'Pokrok uložen.'
      )
    })

  const openDetail = (goal: Goal) => {
    setDetailId(goal.id)
    setAmount('1')
    setMilestone('')
    setError('')
  }

  return (
    <div
      ref={root}
      className="gt-app buddy-theme-scope"
      {...rootAttributes}
    >
      <header className="gt-header">
        <button
          type="button"
          className="gt-icon"
          aria-label="Zpět"
          onClick={
            onBack ??
            (() => useAppStore.getState().setActiveAppId(null))
          }
        >
          ←
        </button>

        <div>
          <small>TVŮJ DALŠÍ KROK</small>
          <h1>Moje cíle</h1>
        </div>

        <button
          type="button"
          className="gt-icon"
          aria-label="Export a možnosti"
          onClick={() => {
            setPanel('data')
            setError('')
          }}
        >
          ⋯
        </button>
      </header>

      <section
        className="gt-summary"
        aria-label="Přehled cílů"
      >
        <div>
          <strong>{summary.active}</strong>
          <span>Aktivní cíle</span>
        </div>

        <div>
          <strong>
            {summary.checked}/{summary.habits}
          </strong>
          <span>Návyky dnes</span>
        </div>

        <div>
          <strong>{summary.done}</strong>
          <span>Splněné cíle</span>
        </div>
      </section>

      <div className="gt-controls">
        <label className="gt-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            aria-label="Hledat cíle"
            placeholder="Hledat cíl nebo poznámku…"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </label>

        <div
          className="gt-tabs"
          role="group"
          aria-label="Zobrazení cílů"
        >
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => {
                setView(id)

                if (id === 'habits' && sort === 'progress') {
                  setSort('priority')
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="gt-filters">
          <select
            aria-label="Kategorie cílů"
            value={category}
            onChange={event => setCategory(event.target.value)}
          >
            <option value="all">Všechny kategorie</option>
            {GOAL_CATEGORIES.map(value => (
              <option key={value}>{value}</option>
            ))}
          </select>

          <select
            aria-label="Řazení cílů"
            value={sort}
            onChange={event =>
              setSort(event.target.value as GoalSort)
            }
          >
            <option value="priority">Termín a priorita</option>
            <option value="updated">Poslední změny</option>

            {view !== 'habits' && (
              <option value="progress">Nejblíž splnění</option>
            )}
          </select>
        </div>
      </div>

      <main className="gt-list" aria-label="Seznam cílů">
        {summary.overdue > 0 && view === 'active' && (
          <p className="gt-hint">
            Po termínu: {summary.overdue}.
            {' '}I malý další krok se počítá.
          </p>
        )}

        {filtered.map(goal => {
          const habit = goal.typ === 'navyk'
          const checked = jeNavykOznacenDnes(goal, now)

          const value = habit
            ? spocitejTydenniPokrokNavyku(goal, now)
            : goal.current

          const percent = habit
            ? Math.min(
              100,
              Math.round(value / goal.target * 100)
            )
            : goalPercent(goal)

          return (
            <article className="gt-card" key={goal.id}>
              <button
                type="button"
                className="gt-card-open"
                disabled={view === 'trash'}
                onClick={() => openDetail(goal)}
              >
                <span className="gt-card-meta">
                  {habit ? 'Návyk' : goal.category}
                  {' · '}
                  {PRIORITA_LABEL[goal.priority ?? 'stredni']}
                </span>

                <h2>{goal.title}</h2>

                <div className="gt-progress-label">
                  <span>
                    {format(value)} / {format(goal.target)}
                    {' '}
                    {habit
                      ? 'dní za posledních 7 dní'
                      : goal.unit}
                  </span>
                  <strong>{percent} %</strong>
                </div>

                <progress
                  max={100}
                  value={percent}
                  aria-label={`Pokrok: ${goal.title}`}
                />

                <small>
                  {habit
                    ? `Série ${spocitejSeriiNavyku(goal, now)} dní`
                    : goal.deadline
                      ? formatujTermin(goal.deadline, now).label
                      : 'Vlastním tempem · bez termínu'}
                </small>
              </button>

              <div className="gt-card-actions">
                {view === 'trash' ? (
                  <button
                    type="button"
                    className="gt-link"
                    onClick={() => restore(goal.id)}
                  >
                    Obnovit cíl
                  </button>
                ) : habit ? (
                  <button
                    type="button"
                    className={`gt-check ${checked ? 'is-done' : ''}`}
                    aria-pressed={checked}
                    onClick={() => run(() => {
                      api.oznacitNavykDnes(goal.id)
                      setNow(new Date())
                    })}
                  >
                    {checked
                      ? '✓ Dnes splněno'
                      : 'Označit dnešek'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="gt-link"
                    onClick={() => openDetail(goal)}
                  >
                    {view === 'done'
                      ? 'Zobrazit detail'
                      : 'Zapsat pokrok →'}
                  </button>
                )}
              </div>
            </article>
          )
        })}

        {!filtered.length && (
          <div className="gt-empty">
            <span aria-hidden="true">◎</span>

            <h2>
              {query || category !== 'all'
                ? 'Žádný odpovídající cíl'
                : view === 'trash'
                  ? 'Koš je prázdný'
                  : view === 'done'
                    ? 'Tvoje úspěchy patří sem'
                    : view === 'habits'
                      ? 'Začni jedním návykem'
                      : 'Velké věci začínají malým krokem'}
            </h2>

            <p>
              {query || category !== 'all'
                ? 'Zkus jiné hledání nebo kategorii.'
                : 'Vytvoř si vlastní cíl nebo vyber připravenou šablonu.'}
            </p>
          </div>
        )}
      </main>

      {message && (
        <div className="gt-message" role="status">
          <span>{message}</span>

          {undoId && (
            <button
              type="button"
              className="gt-link"
              onClick={() => restore(undoId)}
            >
              Vrátit
            </button>
          )}

          <button
            type="button"
            className="gt-icon"
            aria-label="Zavřít zprávu"
            onClick={() => say('')}
          >
            ✕
          </button>
        </div>
      )}

      <footer className="gt-footer">
        <button
          type="button"
          className="gt-primary"
          onClick={() => openForm()}
        >
          ＋ Nový cíl
        </button>

        <button
          type="button"
          className="gt-secondary"
          onClick={() => {
            setPanel('templates')
            setError('')
          }}
        >
          Šablony
        </button>
      </footer>

      {panel && (
        <Sheet
          title={
            panel === 'form'
              ? original ? 'Upravit cíl' : 'Nový cíl'
              : panel === 'templates'
                ? 'Vyber si první krok'
                : 'Data a možnosti'
          }
          close={closePanel}
        >
          {error && (
            <p className="gt-error" role="alert">
              {error}
            </p>
          )}

          {panel === 'form' && (
            <form
              className="gt-form"
              onSubmit={event => {
                event.preventDefault()

                if (run(() => {
                  const input = validateGoalInput(form)

                  if (original) {
                    if (
                      getRawGoalTrackerState().goals.find(
                        goal => goal.id === original.id
                      ) !== original
                    ) {
                      throw new Error(
                        'Cíl se mezitím změnil. Zavři formulář a otevři aktuální verzi. Svůj text si nejprve zkopíruj.'
                      )
                    }

                    api.updateGoal(original.id, input)
                  } else {
                    api.addGoal(input)
                  }

                  setView(
                    input.typ === 'navyk' ? 'habits' : 'active'
                  )
                  setCategory('all')
                  setQuery('')
                  say('Cíl uložen.')
                })) {
                  setFormDirty(false)
                  setPanel(null)
                }
              }}
            >
              <label>
                Název
                <input
                  autoFocus
                  required
                  maxLength={160}
                  value={form.title}
                  onChange={event =>
                    patch({ title: event.target.value })
                  }
                />
              </label>

              <label>
                Typ
                <select
                  disabled={!!original}
                  value={form.typ}
                  onChange={event => patch({
                    typ: event.target.value as 'cil' | 'navyk',
                    target: event.target.value === 'navyk' ? 5 : 10,
                  })}
                >
                  <option value="cil">Měřitelný cíl</option>
                  <option value="navyk">Opakovaný návyk</option>
                </select>
              </label>

              <div className="gt-form-row">
                <label>
                  {form.typ === 'navyk'
                    ? 'Dní za posledních 7 dní'
                    : 'Cílová hodnota'}

                  <input
                    type="number"
                    required
                    min={1}
                    max={form.typ === 'navyk' ? 7 : MAX_GOAL_VALUE}
                    step={1}
                    value={
                      Number.isNaN(form.target) ? '' : form.target
                    }
                    onChange={event => patch({
                      target: Math.round(event.target.valueAsNumber),
                    })}
                  />
                </label>

                {form.typ === 'cil' && (
                  <label>
                    Jednotka
                    <input
                      maxLength={30}
                      value={form.unit}
                      onChange={event =>
                        patch({ unit: event.target.value })
                      }
                    />
                  </label>
                )}
              </div>

              <div className="gt-form-row">
                <label>
                  Kategorie
                  <select
                    value={form.category}
                    onChange={event => patch({
                      category: event.target.value as NovyCilVstup['category'],
                    })}
                  >
                    {GOAL_CATEGORIES.map(value => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Priorita
                  <select
                    value={form.priority}
                    onChange={event => patch({
                      priority: event.target.value as NovyCilVstup['priority'],
                    })}
                  >
                    {GOAL_PRIORITIES.map(value => (
                      <option key={value} value={value}>
                        {PRIORITA_LABEL[value]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {form.typ === 'cil' && (
                <label>
                  Termín · nepovinný
                  <input
                    type="date"
                    value={form.deadline ?? ''}
                    onChange={event => patch({
                      deadline: event.target.value || null,
                    })}
                  />
                </label>
              )}

              <label>
                Proč je pro tebe důležitý?
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={form.poznamka}
                  onChange={event =>
                    patch({ poznamka: event.target.value })
                  }
                />
              </label>

              <p className="gt-hint">
                {original
                  ? 'Typ existujícího cíle se nemění, aby se zachovala historie.'
                  : 'Stačí konkrétní a zvládnutelný další krok.'}
              </p>

              <button type="submit" className="gt-primary">
                Uložit cíl
              </button>
            </form>
          )}

          {panel === 'templates' && SABLONY_CILU.map(template => (
            <button
              type="button"
              key={template.id}
              className="gt-template"
              disabled={!!template.vip && !vip}
              onClick={() => {
                setOriginal(null)
                setForm({
                  ...emptyForm(),
                  title: template.nazev,
                  typ: template.typ,
                  category: template.category,
                  target: template.target,
                  unit: template.unit,
                })
                setFormDirty(false)
                setPanel('form')
              }}
            >
              <strong>
                {template.nazev}
                {template.vip ? ' · VIP' : ''}
              </strong>
              <span>
                {template.popis}
                {template.vip && !vip ? ' · Vyžaduje VIP' : ''}
              </span>
            </button>
          ))}

          {panel === 'data' && (
            <>
              <p className="gt-hint">
                Export obsahuje všechny nesmazané cíle a návyky
                bez ohledu na filtry. Smazané cíle najdeš v koši.
                Automatické připomínky a synchronizaci zajišťuje
                stávající nastavení Buddyho.
              </p>

              <button
                type="button"
                className="gt-template"
                onClick={() => run(() => {
                  stahnoutTextovySoubor(
                    'Buddy-cile.csv',
                    safeGoalCsv(goals)
                  )
                  say('CSV export připraven.')
                })}
              >
                Exportovat do CSV
              </button>

              <button
                type="button"
                className="gt-template"
                onClick={() => run(() => {
                  stahnoutTextovySoubor(
                    'Buddy-cile.json',
                    JSON.stringify({
                      format: 'buddy-goals-v1',
                      exportedAt: new Date().toISOString(),
                      goals: goals.filter(
                        goal => !goal.deletedAt
                      ),
                    }, null, 2)
                  )
                  say('JSON export připraven.')
                })}
              >
                Stáhnout JSON s historií
              </button>

              <p className="gt-hint">
                JSON slouží jako datový export.
                Obnovu celé aplikace používej v nastavení záloh.
              </p>
            </>
          )}
        </Sheet>
      )}

      {detail && !panel && (
        <Sheet
          title={detail.title}
          close={() => setDetailId(null)}
        >
          {error && (
            <p className="gt-error" role="alert">
              {error}
            </p>
          )}

          <p className="gt-hint">
            {detail.poznamka || 'Každý další krok tě posune blíž.'}
          </p>

          {detail.typ === 'navyk' ? (
            <>
              <h3>Posledních 28 dní</h3>

              <div
                className="gt-heatmap"
                aria-label="Historie návyku"
              >
                {spocitejHeatmapuNavyku(detail, now, 28).map(day => (
                  <span
                    key={day.datum}
                    data-checked={day.oznaceno}
                    title={`${day.datum}: ${day.oznaceno ? 'splněno' : 'bez záznamu'}`}
                    aria-label={`${day.datum}: ${day.oznaceno ? 'splněno' : 'bez záznamu'}`}
                  />
                ))}
              </div>

              <p className="gt-hint">
                Zleva doprava od nejstaršího dne po dnešek.
                {' '}Série: {spocitejSeriiNavyku(detail, now)} dní.
              </p>
            </>
          ) : (
            <>
              <h3>
                {format(detail.current)} / {format(detail.target)}
                {' '}{detail.unit}
              </h3>

              <label className="gt-field">
                Velikost kroku
                <input
                  inputMode="numeric"
                  value={amount}
                  maxLength={20}
                  onChange={event => setAmount(event.target.value)}
                />
              </label>

              <div className="gt-form-row">
                <button
                  type="button"
                  className="gt-secondary"
                  onClick={() => progress(detail, -1)}
                >
                  Odečíst krok
                </button>

                <button
                  type="button"
                  className="gt-primary"
                  onClick={() => progress(detail, 1)}
                >
                  Přidat krok
                </button>
              </div>
            </>
          )}

          <h3>Milníky</h3>

          {!(detail.milniky ?? []).length && (
            <p className="gt-hint">
              Rozděl cíl na menší kroky.
            </p>
          )}

          {(detail.milniky ?? []).map(item => (
            <div className="gt-milestone" key={item.id}>
              <label>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => run(() =>
                    api.prepnoutMilnik(detail.id, item.id)
                  )}
                />
                <span>{item.text}</span>
              </label>

              <button
                type="button"
                className="gt-icon"
                aria-label={`Smazat milník ${item.text}`}
                onClick={() => run(() =>
                  api.smazatMilnik(detail.id, item.id)
                )}
              >
                ✕
              </button>
            </div>
          ))}

          <form
            className="gt-add-milestone"
            onSubmit={event => {
              event.preventDefault()
              if (!milestone.trim()) return

              if (run(() => {
                if ((detail.milniky ?? []).length >= 100) {
                  throw new Error(
                    'Cíl může mít nejvýš 100 milníků.'
                  )
                }

                api.pridatMilnik(detail.id, milestone)
              })) {
                setMilestone('')
              }
            }}
          >
            <input
              aria-label="Nový milník"
              placeholder="Další malý krok…"
              maxLength={200}
              value={milestone}
              onChange={event => setMilestone(event.target.value)}
            />

            <button type="submit" className="gt-secondary">
              Přidat
            </button>
          </form>

          <div className="gt-detail-actions">
            <button
              type="button"
              className="gt-template"
              onClick={() => openForm(detail)}
            >
              Upravit cíl a poznámku
            </button>

            <button
              type="button"
              className="gt-template"
              onClick={() => {
                void sdilejText(
                  sestavTextSdileniCile(detail, now),
                  'Buddy · Moje cíle'
                ).then(ok => say(
                  ok
                    ? 'Pokrok sdílen nebo zkopírován.'
                    : 'Sdílení se nepodařilo nebo bylo zrušeno.'
                ))
              }}
            >
              Sdílet pokrok
            </button>

            <button
              type="button"
              className="gt-template gt-danger"
              onClick={() => trash(detail)}
            >
              Přesunout do koše
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
