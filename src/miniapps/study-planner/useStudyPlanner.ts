import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { requestNotificationPermission, showAppNotification } from '@/core/utils/notify'
import {
  DEMO_TASK_IDS,
  DEMO_TASK_TOPICS,
  INITIAL_TASKS,
  StudyTask,
  TaskFilter,
  TaskPriority,
  todayIso,
} from './types'

// XP odměna za dokončení studijního úkolu
const XP_PER_COMPLETED_TASK = 10

interface StudyPlannerState {
  tasks: StudyTask[]
  // Datum (YYYY-MM-DD), kdy naposledy odešlo upozornění na termíny —
  // nejvýš jedno za den, ať appka nenotifikuje při každém návratu.
  lastReminderDate: string | null
  toggleTask: (id: string) => void
  addTask: (subject: string, topic: string, dueDate: string, priority: TaskPriority) => void
  updateTask: (
    id: string,
    subject: string,
    topic: string,
    dueDate: string,
    priority: TaskPriority
  ) => void
  deleteTask: (id: string) => void
}

const isDemoTask = (task: StudyTask) =>
  DEMO_TASK_IDS.includes(task.id) && DEMO_TASK_TOPICS.includes(task.topic)

const useStudyPlannerStore = create<StudyPlannerState>()(
  persist(
    (set) => ({
      tasks: INITIAL_TASKS,
      lastReminderDate: null,

      toggleTask: (id) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === id)
          // XP jen za odškrtnutí (splnění) úkolu, ne za jeho zpětné odškrtnutí.
          // recordAction, ne holé addXp — počítadlo splněných úkolů a XP se
          // tak nemůžou rozejít, stejně jako u ostatních miniapek.
          if (task && !task.completed) {
            useGamificationStore.getState().recordAction('task', XP_PER_COMPLETED_TASK)
          }
          return {
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
          }
        }),

      addTask: (subject, topic, dueDate, priority) => {
        if (!subject.trim() || !topic.trim()) return

        const newTask: StudyTask = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          subject: subject.trim(),
          topic: topic.trim(),
          dueDate: dueDate || todayIso(),
          priority,
          completed: false,
        }

        set((state) => ({ tasks: [newTask, ...state.tasks] }))

        // Založení prvního úkolu je nejpřirozenější chvíle zeptat se na
        // svolení k notifikacím — teprve teď je jasné, že uživatel chce
        // termíny hlídat. Volá se synchronně uvnitř kliknutí na "Přidat
        // do plánu", pořád v gestu uživatele. Bez svolení volání jen
        // tiše nic neudělá (viz core/utils/notify.ts).
        requestNotificationPermission()
      },

      updateTask: (id, subject, topic, dueDate, priority) => {
        if (!subject.trim() || !topic.trim()) return

        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  subject: subject.trim(),
                  topic: topic.trim(),
                  dueDate: dueDate || task.dueDate,
                  priority,
                }
              : task
          ),
        }))
      },

      deleteTask: (id) =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
    }),
    {
      name: 'schoolbuddy-study-planner-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const saved = persisted as Partial<StudyPlannerState> | undefined
        const tasks = (saved?.tasks ?? []).filter((task) => !isDemoTask(task))
        return { ...current, ...saved, tasks, lastReminderDate: saved?.lastReminderDate ?? null }
      },
    }
  )
)

// ==========================================
// Upozornění na termíny — systémová notifikace, ne jen ta v aplikaci
// (zvonek v profilu, ProfilNotifications.tsx, ten už "N nesplněných
// úkolů" ukazoval dřív, ale jen uvnitř appky, a bez rozlišení naléhavosti).
//
// Kontroluje se stejným "modulovým" vzorem jako Pomodoro
// (core/utils/registerSW.ts, usePomodoro.ts) — setupStudyPlannerReminders
// se volá jednou z App.tsx, ne z komponenty StudyPlanner.tsx, protože
// AppModule/ProfilModule (a tím i tenhle store) se do hlavního balíčku
// načítají hned při startu appky (viz import v ProfilNotifications.tsx),
// takže kontrola termínů má fungovat i pro uživatele, co Study Planner
// zrovna nemá otevřený.
// ==========================================

let remindersStarted = false

const checkDueReminders = () => {
  const state = useStudyPlannerStore.getState()
  const today = todayIso()
  // Nejvýš jedno upozornění za den — bez týhle podmínky by se kontrola
  // spouštěla při každém návratu do appky.
  if (state.lastReminderDate === today) return

  const overdue = state.tasks.filter(
    (t) => !t.completed && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) && t.dueDate < today
  ).length
  const dueToday = state.tasks.filter((t) => !t.completed && t.dueDate === today).length
  if (overdue === 0 && dueToday === 0) return

  useStudyPlannerStore.setState({ lastReminderDate: today })

  const parts: string[] = []
  if (overdue > 0) parts.push(`${overdue}× po termínu`)
  if (dueToday > 0) parts.push(`${dueToday}× dnes`)

  void showAppNotification('📚 Termíny v Planeru', parts.join(' · '), 'study-planner')
}

/** Zapne kontrolu termínů. Volá se jednou ze startu aplikace (App.tsx). */
export const setupStudyPlannerReminders = (): void => {
  if (remindersStarted) return
  remindersStarted = true

  checkDueReminders()

  // Nová kalendářní den mohl začít i bez toho, aby appka prošla plným
  // znovunačtením — telefon jen probudil PWA na pozadí.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkDueReminders()
  })
  window.addEventListener('focus', checkDueReminders)
  window.addEventListener('online', checkDueReminders)
}

// Nesplněné napřed, uvnitř podle termínu a při shodě podle priority.
// Úkol po termínu tak nikdy nezapadne pod ten, co je až za měsíc.
const PRIORITY_WEIGHT: Record<TaskPriority, number> = { Vysoká: 0, Střední: 1, Nízká: 2 }

const compareTasks = (a: StudyTask, b: StudyTask) => {
  if (a.completed !== b.completed) return a.completed ? 1 : -1
  if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
}

export const useStudyPlanner = () => {
  const { tasks, toggleTask, addTask, updateTask, deleteTask } = useStudyPlannerStore()
  const [filter, setFilter] = useState<TaskFilter>('Vše')

  // POZOR: `tasks` se vrací nesetříděné a nefiltrované schválně — čte je
  // i Hub (denní výzva) a panel upozornění v profilu, kterým do filtru
  // nastaveného uvnitř miniaplikace nic není.
  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (filter === 'Nesplněné') return !task.completed
      if (filter === 'Splněné') return task.completed
      return true
    })
    return [...filtered].sort(compareTasks)
  }, [tasks, filter])

  const pendingCount = tasks.filter((task) => !task.completed).length
  const overdueCount = tasks.filter(
    (task) => !task.completed && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) && task.dueDate < todayIso()
  ).length

  return {
    tasks,
    visibleTasks,
    totalCount: tasks.length,
    pendingCount,
    overdueCount,
    filter,
    setFilter,
    toggleTask,
    addTask,
    updateTask,
    deleteTask,
  }
}
