import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { MAX_FILE_BYTES, deleteFileBlob, getFileBlob, putFileBlob } from '@/core/utils/fileStorage'
import { stahnoutBlob } from '@/core/utils/download'
import { useTaskFocusMinutes } from '@/miniapps/pomodoro/usePomodoro'
import { useStudyPlannerStore } from './useStudyPlanner'
import { isPlannerDate } from './plannerDomain'
import { OPAKOVANI_LABELS, PRILOHA_ID_PREFIX, TASK_PRIORITIES } from './types'
import type { Opakovani, StudyTask, TaskPriority } from './types'
import { PlannerIcon } from './PlannerIcon'

interface Props {
  task: StudyTask | null
  defaultPlan: string | null
  onClose: () => void
  onSaved: (id: string) => void
  onFocus: (task: StudyTask) => void
  onDelete: (task: StudyTask) => void
}
export function PlannerTaskSheet({ task, defaultPlan, onClose, onSaved, onFocus, onDelete }: Props) {
  const { rootAttributes } = useSurfaceAppearance('study-planner')
  const dialog = useRef<HTMLDialogElement>(null)
  const store = useStudyPlannerStore()
  const [topic, setTopic] = useState(task?.topic ?? '')
  const [subject, setSubject] = useState(task?.subject ?? '')
  const [dueDate, setDueDate] = useState(task && isPlannerDate(task.dueDate) ? task.dueDate : '')
  const [dueTouched, setDueTouched] = useState(false)
  const legacyDeadline = task?.dueDate && !isPlannerDate(task.dueDate) ? task.dueDate : ''
  const [planDate, setPlanDate] = useState(task ? task.planDate ?? '' : defaultPlan ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'Střední')
  const [estimate, setEstimate] = useState(task?.estimateMinutes != null ? String(task.estimateMinutes) : '')
  const [repeat, setRepeat] = useState<Opakovani>(task?.opakovani ?? 'zadne')
  const [note, setNote] = useState(task?.poznamka ?? '')
  const [step, setStep] = useState('')
  const [advanced, setAdvanced] = useState(!!task)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [noteStatus, setNoteStatus] = useState('')
  const mounted = useRef(true)
  const minutes = useTaskFocusMinutes(task?.id ?? null)
  // Změny formuláře porovnáváme s otevřením, nezahrnujeme automatický zápis poznámky.
  const initial = useRef({ topic, subject, dueDate, planDate, priority, estimate, repeat })
  const dirty = Boolean(legacyDeadline && dueTouched) || JSON.stringify({ topic, subject, dueDate, planDate, priority, estimate, repeat }) !== JSON.stringify(initial.current)

  useEffect(() => {
    mounted.current = true
    const element = dialog.current
    const previous = document.activeElement as HTMLElement | null
    if (element?.showModal) element.showModal()
    else element?.setAttribute('open', '')
    return () => { mounted.current = false; element?.close?.(); previous?.focus() }
  }, [])

  useEffect(() => {
    if (!task || note === (task.poznamka ?? '')) return
    setNoteStatus('Ukládám poznámku…')
    const timer = window.setTimeout(() => {
      try { store.nastavPoznamku(task.id, note); setNoteStatus('Poznámka uložena') }
      catch (cause) { setNoteStatus('Poznámka není uložená'); setError(cause instanceof Error ? cause.message : 'Uložení selhalo.') }
    }, 650)
    return () => window.clearTimeout(timer)
  }, [note, task?.id, task?.poznamka, store.nastavPoznamku])

  const run = (action: () => void) => {
    try { action(); setError('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Změna se nepovedla.') }
  }
  const requestClose = () => {
    if (dirty || (!task && note.trim())) {
      if (!window.confirm('Zahodit neuložené změny úkolu?')) return
    }
    if (task && note !== (task.poznamka ?? '')) {
      try { store.nastavPoznamku(task.id, note) }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Poznámku se nepodařilo uložit.'); return }
    }
    onClose()
  }
  const requestDelete = () => {
    if (!task) return
    try {
      if (note !== (task.poznamka ?? '')) store.nastavPoznamku(task.id, note)
      onDelete(useStudyPlannerStore.getState().tasks.find(item => item.id === task.id) ?? task)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Smazání se nepovedlo.') }
  }
  const save = () => {
    const input = { topic, subject, dueDate: legacyDeadline && !dueTouched ? legacyDeadline : dueDate, planDate: planDate || null, priority, estimateMinutes: estimate.trim() ? Number(estimate) : null, opakovani: repeat, poznamka: note }
    const result = task ? store.updateTask(task.id, input) : store.addTask(input)
    if (!result.ok) { setError(result.error); return }
    onSaved(result.id)
  }
  const attach = async (file: File) => {
    if (!task) return
    if (file.size > MAX_FILE_BYTES) { setError('Příloha může mít nejvýš 25 MB.'); return }
    const id = PRILOHA_ID_PREFIX + (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
    setUploading(true)
    try {
      await putFileBlob(id, file)
      if (!useStudyPlannerStore.getState().tasks.some(t => t.id === task.id && !t.deletedAt)) { await deleteFileBlob(id); return }
      try { store.pridatPrilohu(task.id, { id, nazev: file.name, mime: file.type || 'application/octet-stream' }) }
      catch (cause) { await deleteFileBlob(id); throw cause }
      if (mounted.current) setError('')
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Přílohu se nepodařilo uložit.') }
    finally { if (mounted.current) setUploading(false) }
  }
  const download = async (id: string, name: string) => {
    try { const blob = await getFileBlob(id); if (!blob) throw new Error('Příloha na tomto zařízení není dostupná.'); stahnoutBlob(name, blob) }
    catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Přílohu se nepodařilo otevřít.') }
  }

  return createPortal(
    <dialog ref={dialog} className="sp-dialog buddy-theme-scope" {...rootAttributes} aria-labelledby="sp-sheet-title" onCancel={event => { event.preventDefault(); requestClose() }} onClick={event => { if (event.target === event.currentTarget) requestClose() }}>
      <div className="sp-sheet">
        <header className="sp-sheet-header"><h2 id="sp-sheet-title">{task ? 'Detail úkolu' : 'Nový úkol'}</h2><button type="button" className="sp-control" aria-label="Zavřít detail" onClick={requestClose}><PlannerIcon name="close" /></button></header>
        <form className="sp-sheet-form" onSubmit={event => { event.preventDefault(); save() }}>
          <div className="sp-sheet-body">
            <label className="sp-field">Co potřebuješ udělat?<input autoFocus name="topic" value={topic} maxLength={300} onChange={event => setTopic(event.target.value)} placeholder="Například připravit prezentaci" aria-invalid={!!error && !topic.trim()} /></label>
            <div className="sp-form-grid">
              <label className="sp-field">Pracovat na úkolu<input name="planDate" type="date" value={planDate} min="1900-01-01" max="9999-12-31" onChange={event => setPlanDate(event.target.value)} /></label>
              <label className="sp-field">Odevzdat do<input name="dueDate" type="date" value={dueDate} min="1900-01-01" max="9999-12-31" onChange={event => { setDueTouched(true); setDueDate(event.target.value) }} /></label>
            </div>
            {legacyDeadline && !dueTouched && <p className="sp-inline-warning">Původní textový termín: „{legacyDeadline}“. Zůstane zachovaný, dokud nezvolíš datum. <button className="sp-text-button" type="button" onClick={() => setDueTouched(true)}>Odstranit textový termín</button></p>}
            <p className="sp-field-hint">Den práce můžeš přesunout, pevný termín tím nezměníš. Obě data jsou volitelná.</p>
            {planDate && dueDate && planDate > dueDate && <p className="sp-inline-warning">Práci plánuješ až po termínu odevzdání.</p>}
            <button type="button" className="sp-expand" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>Další možnosti <PlannerIcon name="chevron" /></button>
            {advanced && <div className="sp-form-options">
              <label className="sp-field">Předmět nebo projekt<input name="subject" value={subject} maxLength={100} onChange={event => setSubject(event.target.value)} placeholder="Volitelné" /></label>
              <div className="sp-form-grid"><label className="sp-field">Odhad v minutách<input name="estimate" type="number" min={1} max={10080} step={1} value={estimate} onChange={event => setEstimate(event.target.value)} placeholder="Např. 25" /></label><label className="sp-field">Priorita<select value={priority} onChange={event => setPriority(event.target.value as TaskPriority)}>{TASK_PRIORITIES.map(value => <option key={value}>{value}</option>)}</select></label></div>
              <label className="sp-field">Opakování<select value={repeat} onChange={event => setRepeat(event.target.value as Opakovani)}>{Object.entries(OPAKOVANI_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
              {repeat === 'mesicne' && <p className="sp-field-hint">Pokud den v měsíci neexistuje, přeskočí se tento měsíc (31. ledna → 31. března).</p>}
            </div>}
            {task && <section className="sp-sheet-section" aria-label="Kroky úkolu"><h3>Kroky <span>{(task.podukoly ?? []).filter(p => p.hotovo).length}/{task.podukoly?.length ?? 0}</span></h3>
              {(task.podukoly ?? []).map(item => <div className="sp-step" key={item.id}><label><input type="checkbox" checked={item.hotovo} onChange={() => run(() => store.prepnoutPodukol(task.id, item.id))} /><span className={item.hotovo ? 'sp-strike' : ''}>{item.text}</span></label><button type="button" className="sp-control" aria-label={`Smazat krok ${item.text}`} onClick={() => run(() => store.smazatPodukol(task.id, item.id))}><PlannerIcon name="close" size={16} /></button></div>)}
              <div className="sp-step-add"><input aria-label="Nový krok" placeholder="Přidat krok…" maxLength={300} value={step} onChange={event => setStep(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); run(() => { store.pridatPodukol(task.id, step); setStep('') }) } }} /><button type="button" className="sp-control" disabled={!step.trim()} aria-label="Přidat krok" onClick={() => run(() => { store.pridatPodukol(task.id, step); setStep('') })}><PlannerIcon name="plus" /></button></div>
            </section>}
            <label className="sp-field">Poznámka<textarea rows={3} value={note} maxLength={20000} onChange={event => setNote(event.target.value)} placeholder="Nápady, odkazy nebo zadání…" /></label>
            {task && <small className="sp-note-status" role="status">{noteStatus}</small>}
            {task && <section className="sp-sheet-section"><h3>Přílohy</h3><p className="sp-field-hint">Přílohy jsou zatím dostupné na tomto zařízení.</p>
              {(task.prilohy ?? []).map(file => <div className="sp-attachment" key={file.id}><button type="button" onClick={() => void download(file.id, file.nazev)}><PlannerIcon name="file" /><span>{file.nazev}</span></button><button type="button" className="sp-control" aria-label={`Smazat přílohu ${file.nazev}`} onClick={() => run(() => { store.smazatPrilohu(task.id, file.id); void deleteFileBlob(file.id).catch(() => {}) })}><PlannerIcon name="close" size={16} /></button></div>)}
              <label className="sp-attach-button"><PlannerIcon name="plus" />{uploading ? 'Ukládám přílohu…' : 'Přidat přílohu'}<input type="file" disabled={uploading} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void attach(file) }} /></label>
            </section>}
            {task && <section className="sp-sheet-section"><h3>Soustředění</h3><p className="sp-field-hint">Dokončené bloky k tomuto úkolu: {minutes} min. Rozpracované bloky se do součtu zatím nezapočítávají.</p><button className="sp-focus" type="button" disabled={dirty || note !== (task.poznamka ?? '')} onClick={() => onFocus(task)}><PlannerIcon name="play" size={16} />Soustředit se</button>{dirty && <p className="sp-field-hint">Nejdřív ulož změny úkolu.</p>}</section>}
            {error && <p className="sp-error" role="alert">{error}</p>}
          </div>
          <footer className="sp-sheet-footer">{task && <button className="sp-control sp-danger" type="button" aria-label="Smazat úkol" onClick={requestDelete}><PlannerIcon name="trash" /></button>}<button className="sp-primary" type="submit">{task ? 'Uložit změny' : 'Přidat úkol'}</button></footer>
        </form>
      </div>
    </dialog>, document.body
  )
}
