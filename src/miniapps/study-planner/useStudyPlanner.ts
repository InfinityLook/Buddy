import { useState } from 'react'
import { StudyTask, INITIAL_TASKS } from './types'

export const useStudyPlanner = () => {
  const [tasks, setTasks] = useState<StudyTask[]>(INITIAL_TASKS)

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  const addTask = (subject: string, topic: string, dueDate: string, priority: StudyTask['priority']) => {
    if (!subject.trim() || !topic.trim()) return
    const newTask: StudyTask = {
      id: Date.now().toString(),
      subject,
      topic,
      dueDate,
      priority,
      completed: false,
    }
    setTasks((prev) => [newTask, ...prev])
  }

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  return { tasks, toggleTask, addTask, deleteTask }
}
