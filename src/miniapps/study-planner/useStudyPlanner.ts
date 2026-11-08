import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { notificationsEnabled, showAppNotification } from '@/core/utils/notify'
import { DEMO_TASK_IDS, DEMO_TASK_TOPICS, todayIso, tydenniRozsah, jeVRozsahu, patriKeDni } from './types'
import type { Podukol, PrilohaUkolu, StudyTask, TaskFilter, TaskView } from './types'
import { comparePlannerTasks, isOverdue, isPlannerDate, normalizePlannerTasks, togglePlannerTask, validatePlannerInput } from './plannerDomain'
import type { PlannerInput, PlannerResult } from './plannerDomain'

export type VstupUkolu = PlannerInput
const STORAGE_ERROR = 'Změnu se nepodařilo uložit do zařízení. Zkontroluj volné místo a zkus to znovu.'
const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

interface StudyPlannerState {
  tasks: StudyTask[]
  lastReminderDate: string | null
  toggleTask: (id: string) => void
  addTask: (input: VstupUkolu) => PlannerResult
  updateTask: (id: string, input: VstupUkolu) => PlannerResult
  deleteTask: (id: string) => void
  restoreTask: (id: string) => void
  pridatPodukol: (taskId: string, text: string) => void
  prepnoutPodukol: (taskId: string, id: string) => void
  smazatPodukol: (taskId: string, id: string) => void
  posunoutUkol: (id: string, date: string) => void
  naplanovatPraci: (id: string, date: string | null) => void
  pridatPrilohu: (taskId: string, file: PrilohaUkolu) => void
  smazatPrilohu: (taskId: string, id: string) => void
  nastavPoznamku: (taskId: string, text: string) => void
}
export const useStudyPlannerStore = create<StudyPlannerState>()(persist((set, get) => {
  // Když zápis selže, vrátíme předchozí stav i v paměti.
  const commit = (tasks: StudyTask[]) => {
    const previous = get().tasks
    try { set({ tasks }) }
    catch {
      try { set({ tasks: previous }) } catch { /* Poslední uložená hodnota zůstává zachovaná. */ }
      throw new Error(STORAGE_ERROR)
    }
  }
  const patch = (id: string, update: (task: StudyTask) => StudyTask) => {
    commit(get().tasks.map(task => task.id === id && !task.deletedAt ? { ...update(task), updatedAt: Date.now() } : task))
  }
  const save = (id: string | null, input: VstupUkolu): PlannerResult => {
    const existing = id ? get().tasks.find(t => t.id === id && !t.deletedAt) : null
    // Pouhá úprava názvu nesmí odstranit starší textový termín.
    const legacyDeadline = existing && input.dueDate === existing.dueDate && !isPlannerDate(input.dueDate)
    const error = validatePlannerInput(legacyDeadline ? { ...input, dueDate: '' } : input)
    if (error) return { ok: false, error }
    if (id && !existing) return { ok: false, error: 'Úkol už není dostupný. Obnov přehled.' }
    const now = Date.now()
    const task: StudyTask = {
      ...(existing ?? { id: newId(), completed: false, createdAt: new Date(now).toISOString(), deletedAt: null, rewardedAt: null, completedAt: null }),
      topic: input.topic.trim(), subject: input.subject.trim(), dueDate: input.dueDate,
      priority: input.priority, planDate: input.planDate || null,
      estimateMinutes: input.estimateMinutes ?? null, opakovani: input.opakovani ?? 'zadne',
      poznamka: input.poznamka?.trim() ?? '', updatedAt: now,
    }
    try {
      commit(existing ? get().tasks.map(t => t.id === task.id ? task : t) : [task, ...get().tasks])
      return { ok: true, id: task.id }
    } catch { return { ok: false, error: STORAGE_ERROR } }
  }
  return {
    tasks: [], lastReminderDate: null,
    addTask: input => save(null, input),
    updateTask: (id, input) => save(id, input),
    toggleTask: id => {
      const result = togglePlannerTask(get().tasks, id, Date.now())
      if (result.tasks === get().tasks) return
      commit(result.tasks)
      if (result.reward) useGamificationStore.getState().recordAction('task', 10)
    },
    deleteTask: id => patch(id, t => ({ ...t, deletedAt: Date.now() })),
    restoreTask: id => commit(get().tasks.map(t => t.id === id ? { ...t, deletedAt: null, updatedAt: Date.now() } : t)),
    pridatPodukol: (id, value) => {
      if (!value.trim()) return
      if (value.trim().length > 300) throw new Error('Krok může mít nejvýš 300 znaků.')
      const step: Podukol = { id: newId(), text: value.trim(), hotovo: false }
      patch(id, t => ({ ...t, podukoly: [...(t.podukoly ?? []), step] }))
    },
    prepnoutPodukol: (id, stepId) => patch(id, t => ({ ...t, podukoly: (t.podukoly ?? []).map(p => p.id === stepId ? { ...p, hotovo: !p.hotovo } : p) })),
    smazatPodukol: (id, stepId) => patch(id, t => ({ ...t, podukoly: (t.podukoly ?? []).filter(p => p.id !== stepId) })),
    // Kompatibilita s místy, která výslovně přesouvají termín odevzdání.
    posunoutUkol: (id, date) => {
      if (!isPlannerDate(date)) throw new Error('Vyber platný termín.')
      patch(id, t => ({ ...t, dueDate: date, puvodniTermin: t.puvodniTermin ?? t.dueDate, posunuto: (t.posunuto ?? 0) + 1 }))
    },
    naplanovatPraci: (id, date) => {
      if (date && !isPlannerDate(date)) throw new Error('Vyber platný den práce.')
      patch(id, t => ({ ...t, planDate: date }))
    },
    pridatPrilohu: (id, file) => patch(id, t => ({ ...t, prilohy: [...(t.prilohy ?? []), file] })),
    smazatPrilohu: (id, fileId) => patch(id, t => ({ ...t, prilohy: (t.prilohy ?? []).filter(p => p.id !== fileId) })),
    nastavPoznamku: (id, value) => {
      if (value.length > 20000) throw new Error('Poznámka může mít nejvýš 20 000 znaků.')
      patch(id, t => ({ ...t, poznamka: value }))
    },
  }
}, {
  name: 'schoolbuddy-study-planner-storage',
  storage: createJSONStorage(() => secureStorage),
  partialize: state => ({ tasks: state.tasks, lastReminderDate: state.lastReminderDate }),
  merge: (persisted, current) => {
    const saved = persisted && typeof persisted === 'object' ? persisted as Partial<StudyPlannerState> : {}
    return {
      ...current,
      tasks: normalizePlannerTasks(saved.tasks).filter(t => !(DEMO_TASK_IDS.includes(t.id) && DEMO_TASK_TOPICS.includes(t.topic))),
      lastReminderDate: isPlannerDate(saved.lastReminderDate) ? saved.lastReminderDate : null,
    }
  },
}))
export const getRawStudyPlannerState = () => useStudyPlannerStore.getState()
export const setRawStudyPlannerState = (patch: Partial<{ tasks: StudyTask[] }>) => {
  if (patch.tasks) useStudyPlannerStore.setState({ tasks: normalizePlannerTasks(patch.tasks) })
}
export const subscribeStudyPlannerStore = (fn: () => void) => useStudyPlannerStore.subscribe(fn)

// Dočasný stav přehledu přežije přechod do Pomodora; neukládá se na disk.
export const usePlannerView = create<{
  view: 'dnes' | 'tyden' | 'vse'; day: string; detailId: string | null
  focusTaskId: string | null; focusReturnPath: string | null
  setView: (view: 'dnes' | 'tyden' | 'vse') => void
  setDay: (day: string) => void
  setDetail: (id: string | null) => void
}>(set => ({ focusTaskId: null, focusReturnPath: null, view: 'dnes', day: todayIso(), detailId: null, setView: view => set({ view }), setDay: day => set({ day }), setDetail: detailId => set({ detailId }) }))

let remindersStarted = false
const checkDueReminders = () => {
  const state = getRawStudyPlannerState()
  const today = todayIso()
  if (!notificationsEnabled() || state.lastReminderDate === today) return
  const active = state.tasks.filter(t => !t.deletedAt && !t.completed)
  const overdue = active.filter(t => isOverdue(t, today)).length
  const dueToday = active.filter(t => t.dueDate === today).length
  if (!overdue && !dueToday) return
  const parts = [overdue ? `${overdue}× po termínu` : '', dueToday ? `${dueToday}× dnes` : ''].filter(Boolean)
  useStudyPlannerStore.setState({ lastReminderDate: today })
  void showAppNotification('Termíny v Plánovači', parts.join(' · '), 'study-planner')
}
export const setupStudyPlannerReminders = (): void => {
  if (remindersStarted) return
  remindersStarted = true
  checkDueReminders()
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkDueReminders() })
  window.addEventListener('focus', checkDueReminders)
  window.addEventListener('online', checkDueReminders)
}
export interface SkupinaPodlePredmetu { predmet: string; tasks: StudyTask[] }
/** Hub, School Room a oznámení nadále dostávají všechny aktivní úkoly. */
export const useStudyPlanner = () => {
  const state = useStudyPlannerStore()
  const [filter, setFilter] = useState<TaskFilter>('Vše')
  const [view, setView] = useState<TaskView>('dnes')
  const tasks = useMemo(() => state.tasks.filter(t => !t.deletedAt), [state.tasks])
  const today = todayIso()
  const visibleTasks = useMemo(() => tasks.filter(t => {
    if (view === 'dnes' && !patriKeDni(t, today)) return false
    if (view === 'tyden') { const { od, doo } = tydenniRozsah(); if (!jeVRozsahu(t.planDate || t.dueDate, od, doo)) return false }
    if (view === 'nestihnute') return isOverdue(t, today)
    return filter === 'Vše' || (filter === 'Splněné' ? t.completed : !t.completed)
  }).sort(comparePlannerTasks), [tasks, today, filter, view])
  const skupinyPodlePredmetu = useMemo(() => {
    const map = new Map<string, StudyTask[]>()
    for (const task of visibleTasks) { const subject = task.subject || 'Bez předmětu'; map.set(subject, [...(map.get(subject) ?? []), task]) }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'cs')).map(([predmet, items]) => ({ predmet, tasks: items }))
  }, [visibleTasks])
  return { ...state, tasks, visibleTasks, skupinyPodlePredmetu, totalCount: tasks.length, pendingCount: tasks.filter(t => !t.completed).length, overdueCount: tasks.filter(t => isOverdue(t, today)).length, filter, setFilter, view, setView }
        }
