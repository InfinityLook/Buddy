import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { useStudyPlanner } from '@/miniapps/study-planner/useStudyPlanner'
import { useAppStore } from '@/core/store/useAppStore'
import { showAppNotification } from '@/core/utils/notify'
import {
  nahlasPomodoroCasovac,
  zajistiPushPrihlaseni,
} from '@/core/utils/push'
import {
  getPomodoroState,
  usePomodoro,
  usePomodoroStatus,
} from './usePomodoro'
import {
  LIMITS,
  localDay,
  MODE_LABELS,
  spocitejSouhrnPodlePredmetu,
} from './types'
import type {
  TimerMode,
  TimerSettings,
} from './types'
import './Pomodoro.css'

const paths = {
  back: 'm14 5-7 7 7 7',
  chart: 'M5 20V12m7 8V4m7 16V8',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',
  play: 'm8 4 12 8-12 8Z',
  pause: 'M8 5v14M16 5v14',
  close: 'm6 6 12 12M6 18 18 6',
  next: 'm9 5 7 7-7 7',
}

function Icon({
  name,
}: {
  name: keyof typeof paths
}) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const ref = useRef<HTMLDialogElement>(null)
  const { rootAttributes } =
    useSurfaceAppearance('pomodoro')

  useEffect(() => {
    const element = ref.current
    const previous =
      document.activeElement as HTMLElement | null

    element?.showModal()

    return () => {
      element?.close()
      previous?.focus()
    }
  }, [])

  return createPortal(
    <dialog
      ref={ref}
      className="pomo-dialog buddy-theme-scope"
      {...rootAttributes}
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault()
        onClose()
      }}
      onClick={event => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="pomo-icon"
          aria-label="Zavřít panel"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="pomo-sheet-content">
        {children}
      </div>
    </dialog>,
    document.body
  )
}

function Settings({
  onClose,
}: {
  onClose: () => void
}) {
  const current = getPomodoroState().settings
  const [draft, setDraft] = useState(current)
  const [error, setError] = useState('')

  const permission = () =>
    typeof Notification === 'undefined'
      ? 'unsupported'
      : Notification.permission

  const [status, setStatus] =
    useState<string>(permission)

  const [busy, setBusy] = useState(false)

  const set = <K extends keyof TimerSettings>(
    key: K,
    value: TimerSettings[K]
  ) =>
    setDraft(state => ({
      ...state,
      [key]: value,
    }))

  const enable = async () => {
    if (permission() === 'unsupported') return

    setBusy(true)

    try {
      const result =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission

      setStatus(result)

      if (result === 'granted') {
        await zajistiPushPrihlaseni()

        await showAppNotification(
          'Buddy · Pomodoro',
          'Zkušební upozornění na tomto zařízení.',
          'pomodoro'
        )
      }
    } catch {
      setError(
        'Upozornění se nepodařilo nastavit. Zkontroluj oprávnění prohlížeče.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      title="Nastavení Pomodora"
      onClose={onClose}
    >
      <form
        onSubmit={event => {
          event.preventDefault()

          const invalid = Object.entries(
            LIMITS
          ).some(([key, limits]) => {
            const value =
              draft[key as keyof typeof LIMITS]

            return (
              !Number.isInteger(value) ||
              value < limits.min ||
              value > limits.max
            )
          })

          if (invalid) {
            setError(
              'Zadej celé délky v uvedeném rozsahu.'
            )
            return
          }

          try {
            getPomodoroState().updateSettings(draft)
            onClose()
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : 'Uložení selhalo.'
            )
          }
        }}
      >
        <p className="pomo-hint">
          Změna délek platí pro další blok.
          Rozpracovaný čas zůstává zachovaný.
        </p>

        <div className="pomo-presets">
          {[
            {
              label: '25 / 5',
              work: 25,
              shortBreak: 5,
            },
            {
              label: '50 / 10',
              work: 50,
              shortBreak: 10,
            },
          ].map(value => (
            <button
              type="button"
              key={value.label}
              onClick={() =>
                setDraft(state => ({
                  ...state,
                  work: value.work,
                  shortBreak: value.shortBreak,
                }))
              }
            >
              {value.label}
            </button>
          ))}
        </div>

        {(
          [
            'work',
            'shortBreak',
            'longBreak',
            'cycleLength',
          ] as const
        ).map(key => (
          <label
            className="pomo-field"
            key={key}
          >
            <span>
              {key === 'cycleLength'
                ? 'Bloků do dlouhé pauzy'
                : `${MODE_LABELS[key]} (min)`}
              <small>
                {LIMITS[key].min}–{LIMITS[key].max}
              </small>
            </span>
            <input
              type="number"
              min={LIMITS[key].min}
              max={LIMITS[key].max}
              step="1"
              required
              value={
                Number.isNaN(draft[key])
                  ? ''
                  : draft[key]
              }
              onChange={event =>
                set(key, event.target.valueAsNumber)
              }
            />
          </label>
        ))}

        <label className="pomo-field">
          Denní cíl (min)
          <input
            type="number"
            min="5"
            max="720"
            required
            value={draft.dailyGoalMinutes ?? 100}
            onChange={event =>
              set(
                'dailyGoalMinutes',
                event.target.valueAsNumber
              )
            }
          />
        </label>

        <label className="pomo-field">
          Zvuk a vibrace
          <input
            type="checkbox"
            checked={draft.soundEnabled}
            onChange={event =>
              set(
                'soundEnabled',
                event.target.checked
              )
            }
          />
        </label>

        <label className="pomo-field">
          Spouštět další fázi automaticky
          <input
            type="checkbox"
            checked={draft.autoStartNextPhase}
            onChange={event =>
              set(
                'autoStartNextPhase',
                event.target.checked
              )
            }
          />
        </label>

        <section className="pomo-section">
          <h3>Upozornění</h3>
          <p>
            {
              (
                {
                  granted:
                    'Povolena na tomto zařízení',
                  denied:
                    'Zakázána v prohlížeči',
                  default: 'Zatím nepovolena',
                  unsupported:
                    'Tento prohlížeč je nepodporuje',
                } as Record<string, string>
              )[status]
            }
          </p>

          <button
            type="button"
            className="pomo-secondary"
            disabled={
              busy ||
              status === 'unsupported' ||
              status === 'denied'
            }
            onClick={() => void enable()}
          >
            {busy
              ? 'Připravuji…'
              : status === 'granted'
                ? 'Vyzkoušet upozornění'
                : 'Povolit upozornění'}
          </button>

          <p className="pomo-hint">
            Po úplném zavření aplikace není
            včasné upozornění zaručeno.
          </p>
        </section>

        {error && (
          <p
            className="pomo-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          className="pomo-primary"
          type="submit"
        >
          Uložit nastavení
        </button>
      </form>
    </Sheet>
  )
}

export function Pomodoro({
  onBack,
}: {
  onBack?: () => void
}) {
  const p = usePomodoro()
  const status = usePomodoroStatus()
  const planner = useStudyPlanner()
  const { rootAttributes } =
    useSurfaceAppearance('pomodoro')

  const [panel, setPanel] = useState<
    'settings' | 'stats' | 'task' | null
  >(null)

  const [query, setQuery] = useState('')
  const [title, setTitle] = useState('')

  const [period, setPeriod] = useState<
    'day' | 'week' | 'month'
  >('week')

  const [limit, setLimit] = useState(12)

  const [confirmation, setConfirmation] =
    useState<{
      title: string
      text: string
      action: () => void
    } | null>(null)

  const run = (action: () => void) => {
    try {
      action()
    } catch (cause) {
      usePomodoroStatus.setState({
        error:
          cause instanceof Error
            ? cause.message
            : 'Změna selhala.',
      })
    }
  }

  const changeMode = (mode: TimerMode) => {
    if (mode === p.mode) return

    if (p.block) {
      setConfirmation({
        title: 'Změnit režim?',
        text:
          'Rozpracovaný blok se ukončí bez připsání minut a odměny.',
        action: () => p.switchMode(mode),
      })
    } else {
      run(() => p.switchMode(mode))
    }
  }

  const today = localDay()

  const daily = p.dailyTotals[today] ?? {
    minuty: 0,
    bloky: 0,
  }

  const remaining = `${Math.floor(
    p.timeLeft / 60
  )
    .toString()
    .padStart(2, '0')}:${(p.timeLeft % 60)
    .toString()
    .padStart(2, '0')}`

  const selected = planner.tasks.find(
    item => item.id === p.aktivniUkolId
  )

  const taskLabel =
    p.block?.title ??
    p.aktivniPredmet ??
    'Vybrat úkol nebo činnost'

  const days = useMemo(
    () =>
      Array.from(
        {
          length:
            period === 'day'
              ? 1
              : period === 'week'
                ? 7
                : 30,
        },
        (_, index) => {
          const d = new Date()
          d.setDate(d.getDate() - index)
          return localDay(d.getTime())
        }
      ).reverse(),
    [period, today]
  )

  const sum = days.reduce(
    (result, key) => ({
      minuty:
        result.minuty +
        (p.dailyTotals[key]?.minuty ?? 0),
      bloky:
        result.bloky +
        (p.dailyTotals[key]?.bloky ?? 0),
    }),
    { minuty: 0, bloky: 0 }
  )

  const filteredLog = p.sessionLog.filter(
    item => days.includes(localDay(item.at))
  )

  const bySubject =
    spocitejSouhrnPodlePredmetu(filteredLog)

  const max = Math.max(
    1,
    ...days.map(
      key => p.dailyTotals[key]?.minuty ?? 0
    )
  )

  const finishedTask =
    status.finished?.session?.taskId
      ? planner.tasks.find(
          item =>
            item.id ===
            status.finished?.session?.taskId
        )
      : null

  return (
    <div
      className="pomodoro-app buddy-theme-scope"
      {...rootAttributes}
    >
      <header className="pomo-header">
        <button
          type="button"
          className="pomo-icon"
          aria-label="Zpět"
          onClick={
            onBack ??
            (() =>
              useAppStore
                .getState()
                .setActiveAppId(null))
          }
        >
          <Icon name="back" />
        </button>

        <h1>Pomodoro</h1>

        <button
          type="button"
          className="pomo-icon"
          aria-label="Statistiky soustředění"
          onClick={() => setPanel('stats')}
        >
          <Icon name="chart" />
        </button>

        <button
          type="button"
          className="pomo-icon"
          aria-label="Nastavení časovače"
          onClick={() => setPanel('settings')}
        >
          <Icon name="settings" />
        </button>
      </header>

      <div className="pomo-main">
        <div
          className="pomo-modes"
          role="group"
          aria-label="Režim časovače"
        >
          {(
            [
              'work',
              'shortBreak',
              'longBreak',
            ] as const
          ).map(mode => (
            <button
              key={mode}
              type="button"
              aria-pressed={p.mode === mode}
              onClick={() => changeMode(mode)}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="pomo-task"
          disabled={!!p.block}
          onClick={() => {
            setTitle(p.aktivniPredmet ?? '')
            setQuery('')
            setPanel('task')
          }}
        >
          <span>
            <small>NA ČEM PRACUJEŠ</small>
            <strong>{taskLabel}</strong>
            <em>
              {p.block
                ? 'Přiřazení je zachované pro tento blok'
                : selected
                  ? `${selected.subject || 'Úkol'} · Z Planneru`
                  : 'Volné soustředění nebo úkol z Planneru'}
            </em>
          </span>
          <Icon name="next" />
        </button>

        <div className="pomo-timer">
          <svg
            className="pomo-ring"
            viewBox="0 0 240 240"
            aria-hidden="true"
          >
            <circle
              className="pomo-track"
              cx="120"
              cy="120"
              r="108"
            />
            <circle
              className="pomo-fill"
              cx="120"
              cy="120"
              r="108"
              strokeDasharray={2 * Math.PI * 108}
              strokeDashoffset={
                2 * Math.PI * 108 * p.progress
              }
            />
          </svg>

          <div>
            <strong
              className="pomo-time"
              role="timer"
              aria-label={`${MODE_LABELS[p.mode]}, zbývá ${remaining}`}
            >
              {remaining}
            </strong>
            <span>
              {p.block && !p.isRunning
                ? 'Pozastaveno'
                : p.mode !== 'work'
                  ? p.isRunning
                    ? 'Teď odpočívej'
                    : 'Čas na přestávku'
                  : 'Čas na soustředění'}
            </span>
          </div>
        </div>

        <div
          className="pomo-cycle"
          aria-label={`Blok ${p.cyclePosition + 1} ze ${p.settings.cycleLength}`}
        >
          <div>
            {Array.from(
              { length: p.settings.cycleLength },
              (_, index) => (
                <i
                  key={index}
                  className={
                    index < p.cyclePosition
                      ? 'done'
                      : index === p.cyclePosition
                        ? 'current'
                        : ''
                  }
                />
              )
            )}
          </div>

          <span>
            {p.mode === 'longBreak'
              ? 'Dlouhá přestávka'
              : p.mode === 'shortBreak'
                ? `Dokončeno ${p.cyclePosition} ze ${p.settings.cycleLength}`
                : `Blok ${p.cyclePosition + 1} ze ${p.settings.cycleLength}`}
          </span>

          <small>
            {p.isRunning && p.endsAt
              ? `Konec v ${new Date(
                  p.endsAt
                ).toLocaleTimeString('cs-CZ', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : p.mode === 'work'
                ? `Krátká pauza · ${p.settings.shortBreak} min`
                : `Další soustředění · ${p.settings.work} min`}
          </small>
        </div>

        <div className="pomo-actions">
          <button
            type="button"
            className="pomo-primary"
            onClick={() => run(p.toggleTimer)}
          >
            <Icon
              name={
                p.isRunning ? 'pause' : 'play'
              }
            />
            {p.isRunning
              ? 'Pozastavit'
              : p.block
                ? 'Pokračovat'
                : 'Spustit'}
          </button>

          {p.block ? (
            <button
              type="button"
              className="pomo-text"
              onClick={() =>
                setConfirmation({
                  title: 'Ukončit blok?',
                  text:
                    'Tento rozpracovaný blok se nezapočítá do dokončených bloků.',
                  action: p.resetTimer,
                })
              }
            >
              Ukončit blok
            </button>
          ) : (
            <button
              type="button"
              className="pomo-text"
              onClick={() =>
                setPanel('settings')
              }
            >
              Upravit délku
            </button>
          )}
        </div>

        {status.finished && (
          <section
            className="pomo-finished"
            role="status"
          >
            <strong>
              {status.finished.mode === 'work'
                ? `Hotovo · ${status.finished.session?.minuty ?? 0} minut soustředění`
                : 'Přestávka skončila'}
            </strong>

            <div>
              {finishedTask &&
                !finishedTask.completed && (
                  <button
                    type="button"
                    className="pomo-text"
                    onClick={() =>
                      run(() => {
                        planner.toggleTask(
                          finishedTask.id
                        )
                        usePomodoroStatus.setState({
                          finished: null,
                        })
                      })
                    }
                  >
                    Označit úkol jako hotový
                  </button>
                )}

              <button
                type="button"
                className="pomo-text"
                onClick={() =>
                  usePomodoroStatus.setState({
                    finished: null,
                  })
                }
              >
                Zavřít
              </button>
            </div>
          </section>
        )}

        {status.error && (
          <div
            className="pomo-error"
            role="alert"
          >
            {status.error}

            <button
              type="button"
              className="pomo-text"
              onClick={() => {
                const state = getPomodoroState()

                if (
                  state.isRunning &&
                  state.endsAt &&
                  state.endsAt <= Date.now()
                ) {
                  run(state.complete)
                  return
                }

                if (
                  state.isRunning &&
                  state.endsAt &&
                  state.block
                ) {
                  void nahlasPomodoroCasovac(
                    state.endsAt,
                    state.mode === 'work'
                      ? 'prace'
                      : 'pauza',
                    state.block.id
                  )
                    .then(() =>
                      usePomodoroStatus.setState({
                        error: '',
                      })
                    )
                    .catch(cause =>
                      usePomodoroStatus.setState({
                        error:
                          cause instanceof Error
                            ? cause.message
                            : 'Opakování selhalo.',
                      })
                    )
                } else {
                  usePomodoroStatus.setState({
                    error: '',
                  })
                }
              }}
            >
              {p.isRunning
                ? 'Zkusit znovu'
                : 'Rozumím'}
            </button>
          </div>
        )}

        <button
          className="pomo-daily"
          type="button"
          onClick={() => setPanel('stats')}
          aria-label="Otevřít denní statistiky"
        >
          <small>DNES</small>
          <span>
            <strong>{daily.minuty} min</strong>
            <em>soustředění</em>
          </span>
          <span>
            <strong>{daily.bloky}</strong>
            <em>dokončené bloky</em>
          </span>
          <progress
            max={
              p.settings.dailyGoalMinutes ?? 100
            }
            value={Math.min(
              daily.minuty,
              p.settings.dailyGoalMinutes ?? 100
            )}
            aria-label="Denní cíl soustředění"
          />
        </button>
      </div>

      {panel === 'settings' && (
        <Settings
          onClose={() => setPanel(null)}
        />
      )}

      {panel === 'task' && (
        <Sheet
          title="Na čem chceš pracovat?"
          onClose={() => setPanel(null)}
        >
          <form
            onSubmit={event => {
              event.preventDefault()

              run(() => {
                if (
                  getPomodoroState().setTask(
                    null,
                    title.trim() || null
                  )
                ) {
                  setPanel(null)
                }
              })
            }}
          >
            <label className="pomo-field stacked">
              Vlastní činnost
              <input
                autoFocus
                maxLength={300}
                value={title}
                onChange={event =>
                  setTitle(event.target.value)
                }
                placeholder="Například příprava prezentace"
              />
            </label>

            <button
              type="submit"
              className="pomo-secondary"
            >
              Použít vlastní činnost
            </button>
          </form>

          <h3>Úkoly z Planneru</h3>

          <input
            className="pomo-search"
            type="search"
            aria-label="Hledat úkol"
            placeholder="Hledat úkol…"
            value={query}
            onChange={event =>
              setQuery(event.target.value)
            }
          />

          {planner.tasks
            .filter(
              item =>
                !item.completed &&
                `${item.topic} ${item.subject}`
                  .toLocaleLowerCase('cs')
                  .includes(
                    query.toLocaleLowerCase('cs')
                  )
            )
            .map(item => (
              <button
                key={item.id}
                type="button"
                className="pomo-task-choice"
                aria-label={`${item.topic} ${item.subject}`}
                onClick={() =>
                  run(() => {
                    if (
                      getPomodoroState().setTask(
                        item.id,
                        [
                          item.subject,
                          item.topic,
                        ]
                          .filter(Boolean)
                          .join(': ')
                      )
                    ) {
                      setPanel(null)
                    }
                  })
                }
              >
                <strong>{item.topic}</strong>
                <small>
                  {item.subject || 'Bez projektu'}
                </small>
              </button>
            ))}

          {planner.pendingCount === 0 && (
            <p className="pomo-hint">
              V Planneru zatím nejsou žádné
              otevřené úkoly. Můžeš použít
              vlastní činnost.
            </p>
          )}
        </Sheet>
      )}

      {panel === 'stats' && (
        <Sheet
          title="Přehled soustředění"
          onClose={() => setPanel(null)}
        >
          <div
            className="pomo-modes"
            role="group"
            aria-label="Období statistik"
          >
            {(
              ['day', 'week', 'month'] as const
            ).map((value, index) => (
              <button
                type="button"
                key={value}
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
              >
                {['Dnes', '7 dní', '30 dní'][index]}
              </button>
            ))}
          </div>

          <div className="pomo-summary">
            <strong>{sum.minuty} min</strong>
            <span>
              {sum.bloky} dokončených bloků
            </span>
            <small>
              Celkem dokončeno:{' '}
              {p.completedSessions}
            </small>
          </div>

          <div
            className="pomo-chart"
            role="img"
            aria-label={`Soustředění za období: ${days
              .map(
                key =>
                  `${key}: ${p.dailyTotals[key]?.minuty ?? 0} minut`
              )
              .join(', ')}`}
          >
            {days.map(key => (
              <div
                key={key}
                title={`${key}: ${p.dailyTotals[key]?.minuty ?? 0} min`}
              >
                <i
                  style={{
                    height: `${Math.max(
                      2,
                      (p.dailyTotals[key]?.minuty ??
                        0) /
                        max *
                        100
                    )}%`,
                  }}
                />
              </div>
            ))}
          </div>

          <p className="pomo-hint">
            Denní cíl:{' '}
            {p.settings.dailyGoalMinutes ?? 100}{' '}
            min. Starší souhrny vycházejí z dříve
            dostupné historie.
          </p>

          <h3>Podle činnosti</h3>

          {bySubject.map(item => (
            <div
              className="pomo-stat-row"
              key={item.predmet ?? 'none'}
            >
              <span>
                {item.predmet || 'Bez přiřazení'}
              </span>
              <strong>{item.minuty} min</strong>
            </div>
          ))}

          <h3>Poslední bloky</h3>

          {[...filteredLog]
            .reverse()
            .slice(0, limit)
            .map((item, index) => (
              <div
                className="pomo-stat-row"
                key={
                  item.id ??
                  `${item.at}-${index}`
                }
              >
                <span>
                  {item.predmet ||
                    'Volné soustředění'}
                  <small>
                    {new Date(
                      item.at
                    ).toLocaleString('cs-CZ', {
                      day: 'numeric',
                      month: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                </span>
                <strong>
                  {item.minuty} min
                </strong>
              </div>
            ))}

          {filteredLog.length > limit && (
            <button
              type="button"
              className="pomo-text"
              onClick={() =>
                setLimit(value => value + 12)
              }
            >
              Zobrazit další
            </button>
          )}

          <p className="pomo-hint">
            Podrobnosti podle činností a seznam
            vycházejí z posledních 300 uložených
            bloků. Denní součty se od této verze
            uchovávají i po oříznutí seznamu.
          </p>

          <button
            className="pomo-text danger"
            type="button"
            onClick={() =>
              setConfirmation({
                title: 'Vymazat statistiky?',
                text:
                  'Smažou se místní bloky a souhrny Pomodora. Už připsaná XP zůstávají.',
                action: () => {
                  p.resetStats()
                  setPanel(null)
                },
              })
            }
          >
            Vymazat statistiky
          </button>
        </Sheet>
      )}

      {confirmation && (
        <Sheet
          title={confirmation.title}
          onClose={() =>
            setConfirmation(null)
          }
        >
          <p>{confirmation.text}</p>

          <button
            type="button"
            className="pomo-primary"
            onClick={() => {
              run(confirmation.action)
              setConfirmation(null)
            }}
          >
            Potvrdit
          </button>

          <button
            type="button"
            className="pomo-text"
            onClick={() =>
              setConfirmation(null)
            }
          >
            Vrátit se
          </button>
        </Sheet>
      )}
    </div>
  )
}
