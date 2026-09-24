import { vytvorZaznamovySync, naIso, zIso } from '@/core/supabase/recordSync'
import { getRawGoalTrackerState, setRawGoalTrackerState, subscribeGoalTrackerStore } from './useGoalTracker'
import { Goal, GoalCategory, GoalPriority, GoalTyp } from './types'

// ==========================================
// Cloudová synchronizace Growth Roomu (Goal Tracker) — na rozdíl od
// Writer's Roomu appka tady posílá cíl rozložený na sloupce (stejná
// "záznam po záznamu, plochá data" konvence jako u Financí), ne jeden
// JSONB blob — Goal je jeden plochý objekt s pár vnořenými poli
// (milníky, dny odškrtnutí návyku), ne hluboký strom.
// ==========================================

const toRow = (userId: string, g: Goal) => ({
  id: g.id,
  user_id: userId,
  title: g.title,
  current_value: g.current,
  target_value: g.target,
  unit: g.unit,
  category: g.category,
  completed_at: g.completedAt ? g.completedAt : null,
  deadline: g.deadline ?? null,
  priority: g.priority ?? 'stredni',
  poznamka: g.poznamka ?? '',
  milniky: g.milniky ?? [],
  typ: g.typ ?? 'cil',
  navyk_dny: g.navykDny ?? [],
  navyk_xp_dny: g.navykXpDny ?? [],
  updated_at: naIso(g.updatedAt),
  deleted_at: g.deletedAt ? naIso(g.deletedAt) : null,
})

const fromRow = (r: Record<string, any>): Goal => ({
  id: r.id,
  title: r.title,
  current: r.current_value,
  target: r.target_value,
  unit: r.unit ?? '',
  category: r.category as GoalCategory,
  completedAt: r.completed_at ?? null,
  deadline: r.deadline ?? null,
  priority: (r.priority ?? 'stredni') as GoalPriority,
  poznamka: r.poznamka ?? '',
  milniky: Array.isArray(r.milniky) ? r.milniky : [],
  typ: (r.typ ?? 'cil') as GoalTyp,
  navykDny: Array.isArray(r.navyk_dny) ? r.navyk_dny : [],
  navykXpDny: Array.isArray(r.navyk_xp_dny) ? r.navyk_xp_dny : [],
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: zIso(r.updated_at),
  deletedAt: r.deleted_at ? zIso(r.deleted_at) : null,
})

const {
  useSyncStatus: useGoalTrackerSyncStatus,
  syncNow: syncGoalTrackerNow,
  start: startGoalTrackerSync,
} = vytvorZaznamovySync(
  'schoolbuddy-goal-tracker-sync-cursor',
  () => [
    {
      table: 'goal_tracker_goals',
      getLocal: () => getRawGoalTrackerState().goals,
      setLocal: (items: Goal[]) => setRawGoalTrackerState({ goals: items }),
      toRow,
      fromRow,
    },
  ],
  (posluchac) => subscribeGoalTrackerStore(posluchac)
)

export { useGoalTrackerSyncStatus, syncGoalTrackerNow, startGoalTrackerSync }
