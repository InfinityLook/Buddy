import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { isPlannerDate, normalizePlannerTask, normalizePlannerTasks, shiftDate, togglePlannerTask, validatePlannerInput, weekDates } from '@/miniapps/study-planner/plannerDomain'
import { fromPlannerRow, toPlannerRow } from '@/miniapps/study-planner/plannerSync'
import type { StudyTask } from '@/miniapps/study-planner/types'
vi.mock('@/core/utils/notify', () => ({ notificationsEnabled: () => false, showAppNotification: vi.fn(), requestNotificationPermission: vi.fn() }))
vi.mock('@/core/utils/push', () => ({ nahlasPomodoroCasovac: vi.fn(), zajistiPushPrihlaseni: vi.fn(), zrusPomodoroCasovac: vi.fn() }))
import { getRawStudyPlannerState, setRawStudyPlannerState, useStudyPlannerStore } from '@/miniapps/study-planner/useStudyPlanner'
import { getPomodoroState, spustitSoustredeniUkolu } from '@/miniapps/pomodoro/usePomodoro'
const task = (patch: Partial<StudyTask> = {}): StudyTask => ({ id: 't', topic: 'Test', subject: '', dueDate: '2026-11-08', priority: 'Střední', completed: false, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: 10, deletedAt: null, ...patch })
const input = { topic: 'Úkol', subject: '', dueDate: '', priority: 'Střední' as const }
beforeEach(() => { useStudyPlannerStore.setState({ tasks: [] }); getPomodoroState().resetTimer() })
afterEach(() => { vi.restoreAllMocks(); getPomodoroState().resetTimer(); vi.useRealTimers() })

describe('Planner completion and persistence', () => {
  it('allows the inbox with no subject or dates, refuses blank title and invalid estimate', () => {
    expect(validatePlannerInput(input)).toBeNull()
    expect(validatePlannerInput({ ...input, topic: '  ' })).toBeTruthy()
    expect(validatePlannerInput({ ...input, estimateMinutes: 1.5 })).toBeTruthy()
    expect(validatePlannerInput({ ...input, opakovani: 'tydne' })).toBeTruthy()
    expect(getRawStudyPlannerState().addTask(input).ok).toBe(true)
    expect(getRawStudyPlannerState().tasks[0]).toMatchObject({ subject: '', dueDate: '', planDate: null })
  })
  it('completing, reopening and recompleting rewards once and makes only one successor', () => {
    const t = task({ opakovani: 'tydne', podukoly: [{ id: 'p', text: 'Krok', hotovo: true }], prilohy: [{ id: 'f', nazev: 'f.pdf', mime: 'application/pdf' }] })
    const first = togglePlannerTask([t], 't', 100)
    expect(first.reward).toBe(true)
    expect(first.tasks).toHaveLength(2)
    expect(first.tasks[0]).toMatchObject({ id: 'repeat:t:2026-11-15', completed: false, rewardedAt: null, prilohy: [], podukoly: [{ id: 'p', text: 'Krok', hotovo: false }] })
    const undo = togglePlannerTask(first.tasks, 't', 101)
    const again = togglePlannerTask(undo.tasks, 't', 102)
    expect(undo.reward).toBe(false)
    expect(again.reward).toBe(false)
    expect(again.tasks).toHaveLength(2)
    expect(togglePlannerTask([t], 't', 200).tasks[0].id).toBe(first.tasks[0].id)
  })
  it('never resurrects a deleted successor and handles plan-only repetition', () => {
    const first = togglePlannerTask([task({ dueDate: '', planDate: '2026-11-08', opakovani: 'tydne' })], 't', 100)
    expect(first.tasks[0]).toMatchObject({ dueDate: '', planDate: '2026-11-15' })
    first.tasks[0].deletedAt = 110
    const again = togglePlannerTask(togglePlannerTask(first.tasks, 't', 120).tasks, 't', 130)
    expect(again.tasks).toHaveLength(2)
    expect(again.tasks[0].deletedAt).toBe(110)
  })
  it('salvages old and malformed records without replacing store actions', () => {
    expect(normalizePlannerTasks([null, { topic: 'no id' }, task({ completed: true }), task({ updatedAt: 20, completed: true })])).toHaveLength(1)
    const legacy = normalizePlannerTask(task({ completed: true }))!
    expect(togglePlannerTask(togglePlannerTask([legacy], 't', 100).tasks, 't', 101).reward).toBe(false)
    setRawStudyPlannerState({ tasks: [legacy] })
    expect(typeof getRawStudyPlannerState().toggleTask).toBe('function')
  })
  it('preserves legacy text deadlines when editing a different field', () => {
    setRawStudyPlannerState({ tasks: [task({ dueDate: 'Příští pátek' })] })
    expect(getRawStudyPlannerState().updateTask('t', { ...input, dueDate: 'Příští pátek' }).ok).toBe(true)
    expect(getRawStudyPlannerState().tasks[0].dueDate).toBe('Příští pátek')
  })
  it('moves the workday separately from the deadline and restores soft-deleted tasks', () => {
    setRawStudyPlannerState({ tasks: [task()] })
    getRawStudyPlannerState().naplanovatPraci('t', '2026-11-10')
    expect(getRawStudyPlannerState().tasks[0]).toMatchObject({ dueDate: '2026-11-08', planDate: '2026-11-10' })
    getRawStudyPlannerState().deleteTask('t'); expect(getRawStudyPlannerState().tasks[0].deletedAt).toBeTruthy()
    getRawStudyPlannerState().restoreTask('t'); expect(getRawStudyPlannerState().tasks[0].deletedAt).toBeNull()
  })
  it('reports quota failure and preserves prior tasks instead of reporting successful save', () => {
    setRawStudyPlannerState({ tasks: [task()] })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota exceeded', 'QuotaExceededError') })
    expect(getRawStudyPlannerState().addTask(input)).toMatchObject({ ok: false })
    expect(getRawStudyPlannerState().tasks.map(t => t.id)).toEqual(['t'])
  })
  it('roundtrips every planner field through cloud rows, including tombstones', () => {
    const original = normalizePlannerTask(task({ planDate: '2026-11-07', estimateMinutes: 25, opakovani: 'tydne', poznamka: 'Poznámka', completed: true, completedAt: 500, rewardedAt: 500, seriesId: 'root', nextOccurrenceId: 'next', deletedAt: 600, prilohy: [{ id: 'f', nazev: 'f', mime: 'x' }] }))!
    expect(fromPlannerRow(toPlannerRow('user', original))).toEqual(original)
    expect(fromPlannerRow({ ...toPlannerRow('u', task()), planner_data: null }).topic).toBe('Test')
  })
  it('validates calendar dates and keeps weeks across years and DST', () => {
    expect(isPlannerDate('2026-02-30')).toBe(false)
    expect(isPlannerDate('2024-02-29')).toBe(true)
    expect(weekDates('2027-01-01')).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'])
    expect(shiftDate('2026-03-29', 1)).toBe('2026-03-30')
  })
})

describe('Pomodoro task attribution', () => {
  it('records a completed focus block against the exact task id', () => {
    vi.useFakeTimers()
    getPomodoroState().updateSettings({ work: 5, autoStartNextPhase: false, soundEnabled: false })
    getPomodoroState().switchMode('work')
    expect(spustitSoustredeniUkolu('finished-task', 'Dokončený blok')).toBe(true)
    vi.advanceTimersByTime(5 * 60 * 1000 + 10)
    expect(getPomodoroState().sessionLog.at(-1)).toMatchObject({ taskId: 'finished-task', minuty: 5 })
  })
  it('starts/resumes the selected task and refuses to reassign a partial block', () => {
    vi.useFakeTimers()
    expect(spustitSoustredeniUkolu('one', 'První')).toBe(true)
    vi.advanceTimersByTime(1100)
    expect(getPomodoroState()).toMatchObject({ isRunning: true, aktivniUkolId: 'one', aktivniPredmet: 'První' })
    expect(spustitSoustredeniUkolu('two', 'Druhý')).toBe(false)
    getPomodoroState().pause()
    expect(spustitSoustredeniUkolu('two', 'Druhý')).toBe(false)
    expect(spustitSoustredeniUkolu('one', 'První')).toBe(true)
  })
})
