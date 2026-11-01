import { normalizeIntentText } from './intentModel'
import type { TaskPriority } from '@/miniapps/study-planner/types'

export interface BuddyTaskDraft {
  title: string
  dueDate: string | null
  priority: TaskPriority | null
}

type TaskField = 'title' | 'due_date' | 'priority'

const DAYS: Record<string, number> = {
  pondeli: 1, utery: 2, streda: 3, stredu: 3, stredy: 3,
  ctvrtek: 4, ctvrtka: 4, patek: 5, patku: 5, sobota: 6, sobotu: 6,
  soboty: 6, nedele: 0, nedeli: 0,
}

/** Nejbližší den v týdnu zahrnuje dnešek; „příští“ znamená další kalendářní týden. */
export const parseBuddyDate = (text: string, now = new Date()): string | null => {
  const raw = text.trim().replace(/[,.!?;]+$/u, '')
    .replace(/^(?:(?:pros[ií]m|buddy)[\s,]+)+|(?:[\s,]+(?:pros[ií]m|buddy))+$/giu, '')
    .replace(/^(?:na|do|v|ve)\s+/iu, '')

  if (/^za\b/iu.test(raw) && /[-−]\s*\d/u.test(raw)) return null

  const value = normalizeIntentText(raw)
  const date = new Date(now)
  if (!Number.isFinite(date.getTime())) return null
  date.setHours(12, 0, 0, 0)

  const offsets: Record<string, number> = {
    dnes: 0, dnesek: 0, zitra: 1, zitrek: 1, pozitri: 2, pozitrek: 2,
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  const relative = /^za (\d{1,3}) (?:den|dny|dnu|dni)$/.exec(value)
  const nextWeek = value.startsWith('pristi ')
  const dayName = nextWeek ? value.slice(7) : value
  const weekday = DAYS[dayName]

  if (iso) {
    const [, year, month, day] = iso.map(Number)
    date.setFullYear(year, month - 1, day)

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null
    }
  } else if (Object.prototype.hasOwnProperty.call(offsets, value)) {
    date.setDate(date.getDate() + offsets[value])
  } else if (relative) {
    const days = Number(relative[1])
    if (days < 1 || days > 365) return null
    date.setDate(date.getDate() + days)
  } else if (Object.prototype.hasOwnProperty.call(DAYS, dayName)) {
    const offset = nextWeek
      ? 7 - ((date.getDay() + 6) % 7) + ((weekday + 6) % 7)
      : (weekday - date.getDay() + 7) % 7

    date.setDate(date.getDate() + offset)
  } else {
    return null
  }

  const year = date.getFullYear()
  if (!Number.isFinite(date.getTime()) || year < 1000 || year > 9999) return null

  return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

const parsePriority = (text: string): TaskPriority | null => {
  const value = normalizeIntentText(text)
    .replace(/\b(prosim|buddy)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (/^vysok(?:a|ou)$/.test(value)) return 'Vysoká'
  if (value === 'stredni') return 'Střední'
  if (/^nizk(?:a|ou)$/.test(value)) return 'Nízká'
  return null
}

const isDateCandidate = (text: string): boolean => {
  const value = normalizeIntentText(text)

  return /^\d{4}-/.test(text) ||
    /^(dnes|dnesek|zitra|zitrek|pozitri|pozitrek|za|pristi|pondeli|utery|streda|stredu|stredy|ctvrtek|ctvrtka|patek|patku|sobota|sobotu|soboty|nedele|nedeli)\b/.test(value)
}

/** Zpracovává obsah za slovem „úkol“, nikoli libovolné další příkazy. */
export const parseBuddyTask = (
  text: string,
  now = new Date(),
  field: TaskField = 'title',
): BuddyTaskDraft & { hasDate: boolean; hasPriority: boolean } => {
  let remaining = text.trim()
  let dueDate: string | null = null
  let priority: TaskPriority | null = 'Střední'
  let dates = 0
  let priorities = 0

  // Odebíráme pouze rozpoznané koncové údaje.
  // Název si zachová původní text.
  for (let step = 0; step < 8; step += 1) {
    const words = [...remaining.matchAll(/\S+/gu)].map((match) => ({
      raw: match[0],
      start: match.index,
      value: normalizeIntentText(match[0]),
    }))
    let changed = false

    for (let i = words.length - 1; i >= 0; i -= 1) {
      const word = words[i]
      const rest = remaining.slice(word.start)
      let priorityText: string | null = null

      if (/^priorita\s*:/iu.test(rest)) {
        priorityText = rest.replace(/^priorita\s*:\s*/iu, '')
      } else if (word.value === 's' && i + 1 < words.length) {
        if (words[i + 1].value === 'prioritou') {
          priorityText = words.slice(i + 2).map((item) => item.raw).join(' ')
        } else if (words.at(-1)?.value === 'prioritou') {
          priorityText = words.slice(i + 1, -1).map((item) => item.raw).join(' ')
        }
      }

      if (priorityText !== null) {
        priorities += 1
        priority = priorities === 1 ? parsePriority(priorityText) : null
        remaining = remaining.slice(0, word.start).replace(/[\s,;]+$/u, '')
        changed = true
        break
      }

      const candidate = word.value === 'za'
        ? rest
        : ['na', 'do', 'v', 've'].includes(word.value) && i + 1 < words.length
          ? remaining.slice(words[i + 1].start)
          : ''

      if (candidate && isDateCandidate(candidate)) {
        dates += 1
        dueDate = dates === 1 ? parseBuddyDate(candidate, now) : null
        remaining = remaining.slice(0, word.start).replace(/[\s,;]+$/u, '')
        changed = true
        break
      }
    }

    if (!changed) break
  }

  if (field === 'due_date') {
    if (remaining || dates === 0) {
      dates += 1
      dueDate = dates === 1 ? parseBuddyDate(remaining, now) : null
    }
    remaining = ''
  } else if (field === 'priority') {
    if (remaining || priorities === 0) {
      priorities += 1
      priority = priorities === 1 ? parsePriority(remaining) : null
    }
    remaining = ''
  } else if (remaining && parseBuddyDate(remaining, now)) {
    dates += 1
    dueDate = dates === 1 ? parseBuddyDate(remaining, now) : null
    remaining = ''
  }

  return {
    title: remaining,
    dueDate,
    priority,
    hasDate: dates > 0,
    hasPriority: priorities > 0,
  }
}
