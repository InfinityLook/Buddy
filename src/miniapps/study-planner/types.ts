export type TaskPriority = 'Vysoká' | 'Střední' | 'Nízká'

export const TASK_PRIORITIES: TaskPriority[] = ['Vysoká', 'Střední', 'Nízká']

export type TaskFilter = 'Vše' | 'Nesplněné' | 'Splněné'

export const TASK_FILTERS: TaskFilter[] = ['Vše', 'Nesplněné', 'Splněné']

export interface StudyTask {
  id: string
  subject: string
  topic: string
  // Termín ve tvaru YYYY-MM-DD. Starší úkoly tu můžou mít volný text
  // ("Dnes") — proto se všude formátuje přes formatDueDate, který si
  // s neplatnou hodnotou poradí.
  dueDate: string
  priority: TaskPriority
  completed: boolean
}

// Nový uživatel začíná s prázdným plánem — viz DEMO_TASK_IDS níž.
export const INITIAL_TASKS: StudyTask[] = []

// Ukázkové úkoly z matematiky a fyziky se tvářily jako uživatelovy
// a prosakovaly až do denní výzvy v Hubu ("Dnes tě čeká 1 úkol
// z matematiky"), přestože si je nikdo nezadal. Poznáme je podle id
// i tématu zároveň, ať se nesmaže vlastní úkol se stejným id.
export const DEMO_TASK_IDS = ['1', '2']
export const DEMO_TASK_TOPICS = [
  'Integrální počet - příprava na test',
  'Laboratorní práce #3',
]

// Dnešek jako YYYY-MM-DD v místním čase. toISOString() by tu byl chyba —
// vrací UTC, takže večer v našem pásmu ukazuje už zítřek.
export const todayIso = (): string => {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export interface DueInfo {
  label: string
  // 'overdue' = po termínu, 'today' = dnes, 'soon' = do tří dnů, jinak 'later'
  tone: 'overdue' | 'today' | 'soon' | 'later'
}

// Převede termín na lidský popisek. Neplatnou nebo starou textovou
// hodnotu vrátí beze změny místo "Invalid Date".
export const formatDueDate = (dueDate: string): DueInfo => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { label: dueDate || 'Bez termínu', tone: 'later' }
  }

  const today = todayIso()
  if (dueDate === today) return { label: 'Dnes', tone: 'today' }

  const diffDays = Math.round(
    (new Date(`${dueDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) /
      86_400_000
  )

  const formatted = new Date(`${dueDate}T00:00:00`).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
  })

  if (diffDays === -1) return { label: 'Včera', tone: 'overdue' }
  if (diffDays < 0) return { label: `Po termínu · ${formatted}`, tone: 'overdue' }

  if (diffDays === 1) return { label: 'Zítra', tone: 'soon' }
  if (diffDays <= 3) return { label: `Za ${diffDays} dny · ${formatted}`, tone: 'soon' }

  return { label: formatted, tone: 'later' }
}
