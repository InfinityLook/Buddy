import { dalsiTerminOpakovani, PRIORITY_WEIGHT, TASK_PRIORITIES, todayIso } from './types'
import type { Opakovani, StudyTask, TaskPriority } from './types'

export interface PlannerInput {
  subject: string
  topic: string
  dueDate: string
  priority: TaskPriority
  estimateMinutes?: number | null
  planDate?: string | null
  opakovani?: Opakovani
  poznamka?: string
}
export type PlannerResult = { ok: true; id: string } | { ok: false; error: string }

export const isPlannerDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  return year >= 1900 && year <= 9999 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}
export const localDate = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const shiftDate = (value: string, days: number): string => {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return localDate(date)
}
export const weekDates = (value: string): string[] => {
  const date = new Date(`${value}T12:00:00`)
  const monday = shiftDate(value, -((date.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => shiftDate(monday, index))
}
export const validatePlannerInput = (input: PlannerInput): string | null => {
  if (!input.topic.trim()) return 'Napiš název úkolu.'
  if (input.topic.trim().length > 300) return 'Název může mít nejvýš 300 znaků.'
  if (input.subject.trim().length > 100) return 'Předmět nebo projekt může mít nejvýš 100 znaků.'
  if (input.dueDate && !isPlannerDate(input.dueDate)) return 'Zkontroluj datum odevzdání.'
  if (input.planDate && !isPlannerDate(input.planDate)) return 'Zkontroluj plánovaný den práce.'
  if (!TASK_PRIORITIES.includes(input.priority)) return 'Vyber platnou prioritu.'
  if (input.estimateMinutes != null && (!Number.isFinite(input.estimateMinutes) || input.estimateMinutes < 1 || input.estimateMinutes > 10080 || !Number.isInteger(input.estimateMinutes))) return 'Odhad zadej jako celé minuty od 1 do 10 080.'
  if (input.opakovani && !['zadne', 'tydne', 'mesicne'].includes(input.opakovani)) return 'Vyber platné opakování.'
  if (input.opakovani && input.opakovani !== 'zadne' && !isPlannerDate(input.dueDate) && !isPlannerDate(input.planDate)) return 'Opakování potřebuje plánovaný den nebo termín.'
  if ((input.poznamka?.length ?? 0) > 20000) return 'Poznámka může mít nejvýš 20 000 znaků.'
  return null
}
const finiteTime = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
const text = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

/** Zachová platné záznamy; poškozená část dat nesmí shodit aplikaci. */
export const normalizePlannerTask = (value: unknown): StudyTask | null => {
  if (!object(value) || !text(value.id) || !text(value.topic).trim()) return null
  const completed = value.completed === true
  const updatedAt = finiteTime(value.updatedAt) ?? 0
  const completedAt = finiteTime(value.completedAt)
  return {
    id: text(value.id), topic: text(value.topic), subject: text(value.subject),
    // Staré textové termíny zachováme; nově zadaná data musí být platná.
    dueDate: text(value.dueDate), priority: TASK_PRIORITIES.includes(value.priority as TaskPriority) ? value.priority as TaskPriority : 'Střední',
    completed, createdAt: text(value.createdAt, new Date(0).toISOString()), updatedAt,
    deletedAt: finiteTime(value.deletedAt),
    estimateMinutes: typeof value.estimateMinutes === 'number' && Number.isFinite(value.estimateMinutes) && value.estimateMinutes > 0 ? value.estimateMinutes : null,
    planDate: isPlannerDate(value.planDate) ? value.planDate : null,
    opakovani: ['zadne', 'tydne', 'mesicne'].includes(value.opakovani as string) ? value.opakovani as Opakovani : 'zadne',
    poznamka: text(value.poznamka),
    podukoly: Array.isArray(value.podukoly) ? value.podukoly.filter(object).filter(p => text(p.id) && text(p.text).trim()).map(p => ({ id: text(p.id), text: text(p.text), hotovo: p.hotovo === true })) : [],
    prilohy: Array.isArray(value.prilohy) ? value.prilohy.filter(object).filter(p => text(p.id) && text(p.nazev)).map(p => ({ id: text(p.id), nazev: text(p.nazev), mime: text(p.mime, 'application/octet-stream') })) : [],
    posunuto: typeof value.posunuto === 'number' && Number.isFinite(value.posunuto) ? Math.max(0, Math.floor(value.posunuto)) : 0,
    puvodniTermin: isPlannerDate(value.puvodniTermin) ? value.puvodniTermin : null,
    completedAt,
    // Starší splněný úkol po znovuotevření nesmí znovu připsat XP.
    rewardedAt: finiteTime(value.rewardedAt) ?? (completed ? (completedAt ?? updatedAt) || 1 : null),
    seriesId: text(value.seriesId) || null,
    nextOccurrenceId: text(value.nextOccurrenceId) || null,
  }
}
export const normalizePlannerTasks = (value: unknown): StudyTask[] => {
  if (!Array.isArray(value)) return []
  const map = new Map<string, StudyTask>()
  for (const raw of value) {
    const task = normalizePlannerTask(raw)
    if (task && (!map.has(task.id) || task.updatedAt >= map.get(task.id)!.updatedAt)) map.set(task.id, task)
  }
  return [...map.values()]
}

/** Odměna patří prvnímu splnění; další výskyt má stabilní identifikátor. */
export const togglePlannerTask = (tasks: StudyTask[], id: string, now: number): { tasks: StudyTask[]; reward: boolean } => {
  const task = tasks.find(t => t.id === id && !t.deletedAt)
  if (!task) return { tasks, reward: false }
  if (task.completed) return { tasks: tasks.map(t => t.id === id ? { ...t, completed: false, completedAt: null, rewardedAt: t.rewardedAt ?? now, updatedAt: now } : t), reward: false }
  const reward = task.rewardedAt == null
  let next: StudyTask | null = null
  let nextId = task.nextOccurrenceId ?? null
  const anchor = isPlannerDate(task.dueDate) ? task.dueDate : task.planDate
  if (!nextId && anchor && task.opakovani && task.opakovani !== 'zadne') {
    const nextDate = dalsiTerminOpakovani(anchor, task.opakovani)
    if (nextDate !== anchor) {
      nextId = `repeat:${task.seriesId ?? task.id}:${nextDate}`
      if (!tasks.some(t => t.id === nextId)) next = {
        ...task, id: nextId, seriesId: task.seriesId ?? task.id, nextOccurrenceId: null,
        dueDate: isPlannerDate(task.dueDate) ? nextDate : '',
        planDate: isPlannerDate(task.dueDate) ? null : nextDate,
        completed: false, completedAt: null, rewardedAt: null,
        podukoly: (task.podukoly ?? []).map(p => ({ ...p, hotovo: false })),
        // Soubory zůstanou u původního úkolu, další výskyt je nepřebírá.
        prilohy: [], posunuto: 0, puvodniTermin: null,
        createdAt: new Date(now).toISOString(), updatedAt: now, deletedAt: null,
      }
    }
  }
  const updated = tasks.map(t => t.id === id ? { ...t, completed: true, completedAt: now, rewardedAt: t.rewardedAt ?? now, nextOccurrenceId: nextId, updatedAt: now } : t)
  return { tasks: next ? [next, ...updated] : updated, reward }
}
export const isOverdue = (task: StudyTask, day = todayIso()): boolean => !task.completed && isPlannerDate(task.dueDate) && task.dueDate < day
export const scheduledFor = (task: StudyTask): string => task.planDate || task.dueDate
export const comparePlannerTasks = (a: StudyTask, b: StudyTask): number => {
  const deadlineA = isPlannerDate(a.dueDate) ? a.dueDate : '9999-12-31'
  const deadlineB = isPlannerDate(b.dueDate) ? b.dueDate : '9999-12-31'
  return Number(a.completed) - Number(b.completed) || deadlineA.localeCompare(deadlineB) || PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] || a.topic.localeCompare(b.topic, 'cs')
}
