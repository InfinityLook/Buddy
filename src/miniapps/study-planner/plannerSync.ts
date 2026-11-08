import { normalizePlannerTask } from './plannerDomain'
import type { StudyTask } from './types'

/** Původní sloupce zachováváme; rozšiřující údaje ukládáme jako JSONB. */
export const toPlannerRow = (userId: string, task: StudyTask) => ({
  id: task.id, user_id: userId, subject: task.subject, topic: task.topic,
  due_date: task.dueDate, priority: task.priority, completed: task.completed,
  podukoly: task.podukoly ?? [], created_at: task.createdAt,
  updated_at: new Date(task.updatedAt).toISOString(),
  deleted_at: task.deletedAt != null ? new Date(task.deletedAt).toISOString() : null,
  planner_data: {
    planDate: task.planDate ?? null, estimateMinutes: task.estimateMinutes ?? null,
    opakovani: task.opakovani ?? 'zadne', poznamka: task.poznamka ?? '',
    prilohy: task.prilohy ?? [], posunuto: task.posunuto ?? 0, puvodniTermin: task.puvodniTermin ?? null,
    completedAt: task.completedAt ?? null, rewardedAt: task.rewardedAt ?? null,
    seriesId: task.seriesId ?? null, nextOccurrenceId: task.nextOccurrenceId ?? null,
  },
})

export const fromPlannerRow = (row: Record<string, unknown>): StudyTask => {
  const data = row.planner_data && typeof row.planner_data === 'object' && !Array.isArray(row.planner_data) ? row.planner_data : {}
  const task = normalizePlannerTask({
    ...data, id: row.id, subject: row.subject, topic: row.topic,
    dueDate: row.due_date, priority: row.priority, completed: row.completed,
    podukoly: row.podukoly, createdAt: row.created_at,
    updatedAt: typeof row.updated_at === 'string' ? Date.parse(row.updated_at) : 0,
    deletedAt: typeof row.deleted_at === 'string' ? Date.parse(row.deleted_at) : null,
  })
  if (!task) throw new Error('Neplatný záznam úkolu ze synchronizace.')
  return task
}
