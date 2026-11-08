import { useEffect, useMemo, useRef, useState } from 'react'
import { useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { useAppStore } from '@/core/store/useAppStore'
import { useOnlineStatus } from '@/core/hooks/useOnlineStatus'
import { normalizeText } from '@/core/utils/text'
import { spustitSoustredeniUkolu } from '@/miniapps/pomodoro/usePomodoro'
import { usePlannerView, useStudyPlanner } from './useStudyPlanner'
import { comparePlannerTasks, isOverdue, scheduledFor, shiftDate, weekDates } from './plannerDomain'
import { formatDueDate, spocitejPodukoly, todayIso } from './types'
import type { StudyTask } from './types'
import { PlannerIcon } from './PlannerIcon'
import { PlannerTaskSheet } from './PlannerTaskSheet'
import './StudyPlanner.css'

export const StudyPlanner = ({ onBack }: { onBack?: () => void }) => {
  const { rootAttributes } = useSurfaceAppearance('study-planner')
  const planner = useStudyPlanner()
  const ui = usePlannerView()
  const online = useOnlineStatus()
  const [today, setToday] = useState(todayIso)
  const [creating, setCreating] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('Vše')
  const [inboxOnly, setInboxOnly] = useState(false)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null)
  const search = useRef<HTMLInputElement>(null)
  const previousToday = useRef(today)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const next = todayIso()
      if (next !== previousToday.current) {
        if (usePlannerView.getState().day === previousToday.current) ui.setDay(next)
        previousToday.current = next
        setToday(next)
      }
      const midnight = new Date(); midnight.setHours(24, 0, 0, 100)
      clearTimeout(timer); timer = setTimeout(tick, Math.max(1000, midnight.getTime() - Date.now()))
    }
    const resume = () => { if (!document.hidden) tick() }
    tick(); document.addEventListener('visibilitychange', resume)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', resume) }
  }, [ui.setDay])
  useEffect(() => { if (searchOpen) search.current?.focus() }, [searchOpen])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 6500); return () => window.clearTimeout(timer) }, [toast])

  const notify = (text: string, undo?: () => void) => setToast({ text, undo })
  const run = (action: () => void) => {
    try { action() } catch (cause) { notify(cause instanceof Error ? cause.message : 'Změna se nepovedla.') }
  }
  const filtered = useMemo(() => {
    const normalized = normalizeText(query.trim())
    return planner.tasks.filter(task => (!subject || task.subject === subject) && (!priority || task.priority === priority) && (status === 'Vše' || (status === 'Splněné' ? task.completed : !task.completed)) && (!inboxOnly || (!task.dueDate && !task.planDate)) && (!normalized || normalizeText(`${task.topic} ${task.subject} ${task.poznamka ?? ''} ${(task.podukoly ?? []).map(p => p.text).join(' ')}`).includes(normalized))).sort(comparePlannerTasks)
  }, [planner.tasks, query, subject, priority, status, inboxOnly])
  const subjects = useMemo(() => [...new Set(planner.tasks.map(task => task.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'cs')), [planner.tasks])
  const dates = weekDates(ui.day)
  const start = dates[0], end = dates[6]
  const inRange = (date: string) => !!date && date >= start && date <= end
  const scoped = filtered.filter(task => ui.view === 'vse' || (ui.view === 'tyden' ? inRange(scheduledFor(task)) || inRange(task.dueDate) : scheduledFor(task) === ui.day || task.dueDate === ui.day))
  const pending = scoped.filter(task => !task.completed)
  const completed = scoped.filter(task => task.completed)
  const overdue = filtered.filter(task => isOverdue(task, today))
  const dayTasks = pending.filter(task => scheduledFor(task) === ui.day && !(ui.day === today && isOverdue(task, today)))
  const deadlineOnly = pending.filter(task => task.dueDate === ui.day && scheduledFor(task) !== ui.day)
  const summaryTasks = planner.tasks.filter(task => !task.completed && (ui.view === 'vse' || (ui.view === 'tyden' ? inRange(scheduledFor(task)) : scheduledFor(task) === ui.day)))
  const estimated = summaryTasks.reduce((sum, task) => sum + (task.estimateMinutes ?? 0), 0)
  const unknownEstimates = summaryTasks.filter(task => !task.estimateMinutes).length
  const inboxCount = planner.tasks.filter(task => !task.completed && !task.dueDate && !task.planDate).length
  const selected = planner.tasks.find(task => task.id === ui.detailId) ?? null
  const activeFilters = Boolean(subject || priority || status !== 'Vše' || inboxOnly)
  const heading = ui.view === 'vse' ? 'Všechny úkoly' : ui.view === 'tyden' ? 'Tvůj týden' : ui.day === today ? 'Dnes' : new Date(`${ui.day}T12:00:00`).toLocaleDateString('cs-CZ', { weekday: 'long' })
  const dateLabel = ui.view === 'vse' ? 'Vše důležité na jednom místě' : ui.view === 'tyden' ? `${new Date(`${start}T12:00:00`).toLocaleDateString('cs-CZ')} – ${new Date(`${end}T12:00:00`).toLocaleDateString('cs-CZ')}` : new Date(`${ui.day}T12:00:00`).toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })

  const focus = (task: StudyTask) => run(() => {
    if (!spustitSoustredeniUkolu(task.id, [task.subject, task.topic].filter(Boolean).join(': '))) { notify('V Pomodoru je rozpracovaný jiný blok. Nejdřív ho dokonči nebo resetuj.'); return }
    const origin = useAppStore.getState().returnPath
    ui.setDetail(task.id)
    usePlannerView.setState({ focusTaskId: task.id, focusReturnPath: origin })
    useAppStore.getState().setActiveAppId('pomodoro', origin)
  })
  const toggle = (task: StudyTask) => run(() => {
    planner.toggleTask(task.id)
    notify(task.completed ? 'Úkol znovu otevřen' : 'Úkol dokončen', () => run(() => { planner.toggleTask(task.id); setToast(null) }))
  })
  const remove = (task: StudyTask) => run(() => {
    planner.deleteTask(task.id); ui.setDetail(null)
    notify('Úkol přesunut do smazaných', () => run(() => { planner.restoreTask(task.id); setToast(null) }))
  })
  const card = (task: StudyTask, deadline = false) => {
    const steps = spocitejPodukoly(task)
    return <article className={`sp-task${task.completed ? ' sp-task--done' : ''}${isOverdue(task, today) ? ' sp-task--overdue' : ''}`} key={task.id}>
      <button type="button" className="sp-check" role="checkbox" aria-checked={task.completed} aria-label={`Splněno: ${task.topic}`} onClick={() => toggle(task)}><span>{task.completed && <PlannerIcon name="check" size={16} />}</span></button>
      <div className="sp-task-main"><button type="button" className="sp-task-open" onClick={() => ui.setDetail(task.id)}><span className="sp-task-title">{task.topic}</span></button>
        <div className="sp-task-meta">{task.subject && <span className="sp-project">{task.subject}</span>}{task.priority === 'Vysoká' && <span className="sp-priority">Vysoká priorita</span>}</div>
        <div className="sp-task-meta">{task.estimateMinutes != null && <span><PlannerIcon name="clock" size={14} />{task.estimateMinutes} min</span>}{task.dueDate && <span className={isOverdue(task, today) ? 'sp-danger-text' : ''}>{deadline ? 'Odevzdat' : 'Termín'}: {formatDueDate(task.dueDate).label}</span>}{!!task.prilohy?.length && <span aria-label={`${task.prilohy.length} příloh`}><PlannerIcon name="file" size={14} />{task.prilohy.length}</span>}{task.opakovani && task.opakovani !== 'zadne' && <span aria-label="Opakovaný úkol"><PlannerIcon name="repeat" size={14} /></span>}</div>
        {steps.celkem > 0 && <div className="sp-progress-row"><span>{steps.hotovo}/{steps.celkem} kroky</span><progress value={steps.hotovo} max={steps.celkem} aria-label={`Kroky úkolu ${task.topic}`} /></div>}
        {!task.completed && <div className="sp-task-bottom"><button type="button" className="sp-focus" onClick={() => focus(task)}><PlannerIcon name="play" size={14} />Soustředit se</button>{isOverdue(task, today) && task.planDate !== today && <button type="button" className="sp-text-button" onClick={() => run(() => { planner.naplanovatPraci(task.id, today); notify('Práce naplánovaná na dnes. Termín zůstal stejný.') })}>Pracovat dnes</button>}</div>}
      </div>
      <button type="button" className="sp-control sp-task-menu" aria-label={`Možnosti úkolu ${task.topic}`} onClick={() => ui.setDetail(task.id)}><PlannerIcon name="more" /></button>
    </article>
  }
  const group = (title: string, tasks: StudyTask[], deadline = false) => tasks.length > 0 && <section className="sp-group" aria-label={title}><h3>{title}<span>{tasks.length}</span></h3>{tasks.map(task => card(task, deadline))}</section>

  return <div className="sp-app buddy-theme-scope" {...rootAttributes}>
    <header className="sp-header"><button type="button" className="sp-control" aria-label="Zpět" onClick={onBack ?? (() => useAppStore.getState().setActiveAppId(null))}><PlannerIcon name="back" /></button><h1>Plánovač</h1><button type="button" className="sp-control" aria-label="Hledat úkoly" aria-expanded={searchOpen} onClick={() => { if (searchOpen) setQuery(''); setSearchOpen(!searchOpen) }}><PlannerIcon name="search" /></button><button type="button" className={`sp-control${activeFilters ? ' sp-control--active' : ''}`} aria-label="Filtry úkolů" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><PlannerIcon name="filter" /></button></header>
    <div className="sp-toolbar">
      <div className="sp-heading"><h2>{heading}</h2><p>{dateLabel}</p></div>
      <div className="sp-tabs" role="group" aria-label="Zobrazení úkolů">{(['dnes', 'tyden', 'vse'] as const).map((view, i) => <button key={view} type="button" aria-pressed={ui.view === view} onClick={() => { ui.setView(view); setInboxOnly(false) }}>{['Dnes', 'Týden', 'Vše'][i]}</button>)}</div>
      {searchOpen && <div className="sp-search"><PlannerIcon name="search" /><input ref={search} type="search" aria-label="Hledat v úkolech" placeholder="Název, projekt nebo poznámka…" value={query} onChange={event => setQuery(event.target.value)} /><button type="button" className="sp-control" aria-label="Zrušit hledání" onClick={() => { setQuery(''); setSearchOpen(false) }}><PlannerIcon name="close" size={16} /></button></div>}
      {filtersOpen && <div className="sp-filter-panel"><label>Předmět / projekt<select value={subject} onChange={event => setSubject(event.target.value)}><option value="">Všechny</option>{subjects.map(value => <option key={value}>{value}</option>)}</select></label><label>Priorita<select value={priority} onChange={event => setPriority(event.target.value)}><option value="">Všechny</option>{['Vysoká', 'Střední', 'Nízká'].map(value => <option key={value}>{value}</option>)}</select></label><label>Stav<select value={status} onChange={event => setStatus(event.target.value)}>{['Vše', 'Nesplněné', 'Splněné'].map(value => <option key={value}>{value}</option>)}</select></label><button type="button" className="sp-text-button" onClick={() => { setSubject(''); setPriority(''); setStatus('Vše'); setInboxOnly(false) }}>Vymazat filtry</button></div>}
      {ui.view !== 'vse' && <div className="sp-week"><div className="sp-week-controls"><button type="button" className="sp-control" aria-label="Předchozí týden" onClick={() => ui.setDay(shiftDate(ui.day, -7))}><PlannerIcon name="back" size={16} /></button><button type="button" className="sp-text-button" onClick={() => ui.setDay(today)}>Zpět na dnešek</button><button type="button" className="sp-control" aria-label="Další týden" onClick={() => ui.setDay(shiftDate(ui.day, 7))}><PlannerIcon name="next" size={16} /></button></div><div className="sp-week-days">{dates.map(date => <button type="button" key={date} aria-pressed={ui.day === date} aria-label={new Date(`${date}T12:00:00`).toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })} onClick={() => { ui.setDay(date); ui.setView('dnes') }}><span>{new Date(`${date}T12:00:00`).toLocaleDateString('cs-CZ', { weekday: 'short' })}</span><strong>{Number(date.slice(-2))}</strong>{planner.tasks.some(task => !task.completed && scheduledFor(task) === date) && <i aria-hidden="true" />}</button>)}</div></div>}
      <div className="sp-summary"><span><strong>{summaryTasks.length}</strong> naplánovaných</span><span>{estimated} min{unknownEstimates > 0 && <small> + {unknownEstimates} bez odhadu</small>}</span></div>
      {!online && <p className="sp-offline" role="status">Jsi offline. Změny se ukládají do tohoto zařízení.</p>}
      {(inboxCount > 0 || inboxOnly) && <button type="button" className="sp-inbox" aria-pressed={inboxOnly} onClick={() => { ui.setView('vse'); setInboxOnly(!inboxOnly) }}>Schránka · {inboxCount} bez data{inboxOnly && <span>Zrušit filtr ×</span>}</button>}
    </div>
    <main className="sp-content" aria-label="Seznam úkolů">
      {ui.view === 'dnes' && <>{ui.day === today && group('Po termínu', overdue)}{group('Termíny tohoto dne', deadlineOnly, true)}{group('Plán práce', dayTasks)}</>}
      {ui.view === 'tyden' && dates.map(date => {
        const work = pending.filter(task => scheduledFor(task) === date)
        const deadlines = pending.filter(task => task.dueDate === date && scheduledFor(task) !== date)
        return <div key={date}>{group(new Date(`${date}T12:00:00`).toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric' }), work)}{group(`Odevzdat ${new Date(`${date}T12:00:00`).toLocaleDateString('cs-CZ')}`, deadlines, true)}</div>
      })}
      {ui.view === 'vse' && <>{group('Po termínu', pending.filter(task => isOverdue(task, today)))}{group('Naplánované a s termínem', pending.filter(task => !isOverdue(task, today) && !!scheduledFor(task)))}{group('Schránka · bez data', pending.filter(task => !scheduledFor(task)))}</>}
      {pending.length === 0 && !(ui.view === 'dnes' && ui.day === today && overdue.length) && <div className="sp-empty"><span className="sp-empty-icon"><PlannerIcon name="calendar" size={28} /></span><h3>{query || activeFilters ? 'Žádné odpovídající úkoly' : planner.totalCount === 0 ? 'Začni jedním úkolem' : 'Tady máš volno'}</h3><p>{query || activeFilters ? 'Zkus jiné hledání nebo uprav filtry.' : 'Přidej úkol nebo si naplánuj práci z přehledu Vše.'}</p><button type="button" className="sp-text-button" onClick={() => { ui.setView('vse'); setQuery(''); setSubject(''); setPriority(''); setStatus('Vše'); setInboxOnly(false) }}>Zobrazit všechny úkoly</button></div>}
      {completed.length > 0 && <section className="sp-completed"><button type="button" className="sp-expand" aria-expanded={completedOpen || status === 'Splněné'} onClick={() => setCompletedOpen(!completedOpen)}><PlannerIcon name="chevron" />Dokončené <span>{completed.length}</span></button>{(completedOpen || status === 'Splněné') && completed.map(task => card(task))}</section>}
    </main>
    {toast && <div className="sp-toast" role="status"><span>{toast.text}</span>{toast.undo && <button type="button" onClick={toast.undo}>Vrátit</button>}<button type="button" aria-label="Zavřít oznámení" onClick={() => setToast(null)}><PlannerIcon name="close" size={16} /></button></div>}
    <footer className="sp-actions"><button type="button" className="sp-primary" onClick={() => { ui.setDetail(null); setCreating(true) }}><PlannerIcon name="plus" />Přidat úkol</button></footer>
    {(creating || selected) && <PlannerTaskSheet key={creating ? 'new' : selected!.id} task={creating ? null : selected} defaultPlan={creating && ui.view !== 'vse' ? ui.day : null} onClose={() => { setCreating(false); ui.setDetail(null) }} onSaved={() => { setCreating(false); ui.setDetail(null); notify('Úkol uložen do zařízení') }} onFocus={focus} onDelete={remove} />}
  </div>
}
