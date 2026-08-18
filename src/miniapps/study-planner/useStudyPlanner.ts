import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { StudyTask, INITIAL_TASKS } from './types'

// XP odměna za dokončení studijního úkolu
const XP_PER_COMPLETED_TASK = 10

interface StudyPlannerState {
  tasks: StudyTask[]
  toggleTask: (id: string) => void
  addTask: (subject: string, topic: string, dueDate: string, priority: StudyTask['priority']) => void
  deleteTask: (id: string) => void
}

const useStudyPlannerStore = create<StudyPlannerState>()(
  persist(
    (set) => ({
      tasks: INITIAL_TASKS,

      toggleTask: (id) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === id)
          // XP jen za odškrtnutí (splnění) úkolu, ne za jeho zpětné odškrtnutí
          if (task && !task.completed) {
            useGamificationStore.getState().addXp(XP_PER_COMPLETED_TASK)
          }
          return {
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
          }
        }),

      addTask: (subject, topic, dueDate, priority) => {
        if (!subject.trim() || !topic.trim()) return
        const newTask: StudyTask = {
          id: Date.now().toString(),
          subject,
          topic,
          dueDate,
          priority,
          completed: false,
        }
        set((state) => ({ tasks: [newTask, ...state.tasks] }))
      },

      deleteTask: (id) =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
    }),
    {
      name: 'schoolbuddy-study-planner-storage',
      storage: createJSONStorage(() => secureStorage),
    }
  )
)

export const useStudyPlanner = () => {
  const { tasks, toggleTask, addTask, deleteTask } = useStudyPlannerStore()
  return { tasks, toggleTask, addTask, deleteTask }
}
