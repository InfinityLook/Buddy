import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
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
        return { ...current, ...saved, tasks }
      },
    }
  )
)

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
