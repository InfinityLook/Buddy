import { normalizeText } from '@/core/utils/text'
import type { NovyCilVstup } from './useGoalTracker'
import {
  compareGoals,
  dnesniDatum,
  GOAL_CATEGORIES,
  GOAL_PRIORITIES,
  jeHotovyCil,
  jeNavykOznacenDnes,
  PRIORITA_LABEL,
  spocitejTydenniPokrokNavyku,
  spocitejSeriiNavyku,
} from './types'
import type { Goal } from './types'

export type GoalView = 'active' | 'habits' | 'done' | 'trash'
export type GoalSort = 'priority' | 'progress' | 'updated'

// goal_tracker_goals.current_value/target_value jsou ve Supabase typu
// integer (4bajtové), ne numeric/bigint — skutečný strop je tedy
// Postgresovo INT4_MAX, ne libovolné "1 bilion". Cíl s vyšší cílovou
// hodnotou (nebo vlastní krok pokroku nad tuhle hranici) appka dřív
// nechala uložit lokálně bez chyby, ale cloudová synchronizace
// (goalTrackerSync.ts's toRow → upsert) na něm spadla s "22003: integer
// out of range" — ověřeno přímo proti reálné databázi.
export const MAX_GOAL_VALUE = 2_147_483_647

export const validGoalDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T12:00:00`)

  return (
    Number.isFinite(date.getTime()) &&
    dnesniDatum(date) === value
  )
}

export function validateGoalInput(
  input: NovyCilVstup
): NovyCilVstup {
  const title = input.title.trim()

  if (!title || title.length > 160) {
    throw new Error('Název musí mít 1–160 znaků.')
  }

  if (
    !Number.isFinite(input.target) ||
    !Number.isInteger(input.target) ||
    input.target <= 0 ||
    input.target > MAX_GOAL_VALUE
  ) {
    throw new Error(
      `Cílová hodnota musí být celé kladné číslo, nejvýš ${MAX_GOAL_VALUE.toLocaleString('cs-CZ')}.`
    )
  }

  if (input.typ !== 'cil' && input.typ !== 'navyk') {
    throw new Error('Neplatný typ cíle.')
  }

  if (
    input.typ === 'navyk' &&
    (!Number.isInteger(input.target) || input.target > 7)
  ) {
    throw new Error(
      'U návyku vyber 1 až 7 dní za posledních 7 dní.'
    )
  }

  if (
    !GOAL_CATEGORIES.includes(input.category) ||
    !GOAL_PRIORITIES.includes(input.priority)
  ) {
    throw new Error('Vyber platnou kategorii a prioritu.')
  }

  if (input.unit.length > 30 || input.poznamka.length > 5000) {
    throw new Error(
      'Jednotka může mít 30 znaků, poznámka 5 000.'
    )
  }

  if (
    input.typ === 'cil' &&
    input.deadline &&
    !validGoalDate(input.deadline)
  ) {
    throw new Error('Zadej platný termín.')
  }

  return {
    ...input,
    title,
    unit: input.typ === 'navyk'
      ? ''
      : input.unit.trim() || 'kroků',
    deadline: input.typ === 'navyk'
      ? null
      : input.deadline || null,
    poznamka: input.poznamka.trim(),
  }
}

export function progressAmount(value: string): number {
  const trimmed = value.trim()

  // Celé číslo jen — current_value/target_value jsou ve Supabase typu
  // integer (viz komentář u MAX_GOAL_VALUE výš). Desetinný krok (dřív
  // "například 1 nebo 0,5") appka uložila lokálně v pořádku, ale
  // cloudová synchronizace ho tiše zaokrouhlila (0,5 → 1), takže se
  // číslo po dalším stažení z cloudu rozešlo s tím, co si uživatel
  // ve skutečnosti zapsal — appka tak musí stejnou desetinu odmítnout
  // hned na vstupu, ne až ji nechat zkazit až při synchronizaci.
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(
      'Zadej celé kladné číslo, například 1 nebo 5.'
    )
  }

  const number = Number(trimmed)

  if (
    !Number.isFinite(number) ||
    number <= 0 ||
    number > MAX_GOAL_VALUE
  ) {
    throw new Error(
      `Zadej celé kladné číslo, nejvýš ${MAX_GOAL_VALUE.toLocaleString('cs-CZ')}.`
    )
  }

  return number
}

export const goalPercent = (goal: Goal) =>
  Number.isFinite(goal.current) &&
  Number.isFinite(goal.target) &&
  goal.target > 0
    ? Math.max(
      0,
      Math.min(100, Math.round(goal.current / goal.target * 100))
    )
    : 0

export function selectGoals(
  goals: Goal[],
  view: GoalView,
  category: string,
  query: string,
  sort: GoalSort
) {
  const needle = normalizeText(query.trim())

  return goals
    .filter(goal =>
      (
        view === 'trash'
          ? !!goal.deletedAt
          : !goal.deletedAt && (
            view === 'habits'
              ? goal.typ === 'navyk'
              : view === 'done'
                ? jeHotovyCil(goal)
                : goal.typ !== 'navyk' && !jeHotovyCil(goal)
          )
      ) &&
      (category === 'all' || goal.category === category) &&
      normalizeText(
        `${goal.title} ${goal.poznamka ?? ''}`
      ).includes(needle)
    )
    .sort((a, b) =>
      sort === 'updated'
        ? b.updatedAt - a.updatedAt
        : sort === 'progress' && view !== 'habits'
          ? goalPercent(b) - goalPercent(a) || compareGoals(a, b)
          : compareGoals(a, b)
    )
}

export function goalSummary(
  goals: Goal[],
  now = new Date()
) {
  const visible = goals.filter(goal => !goal.deletedAt)
  const habits = visible.filter(goal => goal.typ === 'navyk')

  return {
    active: visible.filter(
      goal => goal.typ !== 'navyk' && !jeHotovyCil(goal)
    ).length,

    done: visible.filter(jeHotovyCil).length,

    habits: habits.length,

    checked: habits.filter(
      goal => jeNavykOznacenDnes(goal, now)
    ).length,

    overdue: visible.filter(goal =>
      goal.typ !== 'navyk' &&
      !jeHotovyCil(goal) &&
      goal.deadline &&
      goal.deadline < dnesniDatum(now)
    ).length,
  }
}

// Uživatelský text v Excelu nesmí spustit vzorec.
export function safeGoalCsv(goals: Goal[]) {
  const cell = (value: string) => {
    const safe = /^[\s]*[=+\-@\t\r]/.test(value)
      ? `'${value}`
      : value

    return `"${safe.replace(/"/g, '""')}"`
  }

  const rows = goals
    .filter(goal => !goal.deletedAt)
    .map(goal => [
      goal.title,
      goal.typ === 'navyk' ? 'Návyk' : 'Cíl',
      goal.category,
      PRIORITA_LABEL[goal.priority ?? 'stredni'],
      goal.deadline ?? '',

      goal.typ === 'navyk'
        ? `${spocitejTydenniPokrokNavyku(goal)}/${goal.target}× týdně, série ${spocitejSeriiNavyku(goal)}`
        : `${goal.current}/${goal.target} ${goal.unit}`,

      jeHotovyCil(goal) ? 'Splněno' : 'Aktivní',
      goal.completedAt ?? '',
      goal.poznamka ?? '',
    ].map(cell).join(';'))

  return '\ufeff' + [
    'Název;Typ;Kategorie;Priorita;Termín;Pokrok;Stav;Datum splnění;Poznámka',
    ...rows,
  ].join('\r\n')
}
