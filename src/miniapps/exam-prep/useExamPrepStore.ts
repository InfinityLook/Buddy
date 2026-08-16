import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'

export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5

export interface ExamTopic {
  id: string
  subjectId: string
  topicNumber: number
  title: string
  notes: string
  confidenceLevel: ConfidenceLevel
  lastRevisedAt: string | null
  nextRevisionAt: string | null
  revisionCount: number
}

export interface ExamSubject {
  id: string
  name: string
  color: string
  examDate: string
  targetGrade: number
}

interface ExamPrepStore {
  subjects: ExamSubject[]
  topics: ExamTopic[]

  // Akce předmětů
  addSubject: (subject: Omit<ExamSubject, 'id'>) => void
  removeSubject: (id: string) => void

  // Akce otázek
  addTopic: (topic: Omit<ExamTopic, 'id' | 'lastRevisedAt' | 'nextRevisionAt' | 'revisionCount' | 'confidenceLevel'>) => void
  rateTopic: (topicId: string, confidence: ConfidenceLevel) => void
  updateNotes: (topicId: string, notes: string) => void
  
  // Pomocné výpočty
  getSubjectReadiness: (subjectId: string) => number
  getOverallReadiness: () => number
}

export const useExamPrepStore = create<ExamPrepStore>()(
  persist(
    (set, get) => ({
      subjects: [
        { id: 'sub-cj', name: 'Český jazyk a literatura', color: '#a855f7', examDate: '2027-05-18', targetGrade: 1 },
        { id: 'sub-aj', name: 'Anglický jazyk', color: '#38bdf8', examDate: '2027-05-20', targetGrade: 1 },
      ],
      topics: [
        {
          id: 'top-1',
          subjectId: 'sub-cj',
          topicNumber: 1,
          title: 'Karel Čapek a meziválečná próza',
          notes: 'R.U.R., Válka s Mloky, Krakatit, Bílá nemoc.',
          confidenceLevel: 3,
          lastRevisedAt: new Date().toISOString(),
          nextRevisionAt: new Date().toISOString(),
          revisionCount: 1,
        },
      ],

      addSubject: (newSub) =>
        set((state) => ({
          subjects: [...state.subjects, { ...newSub, id: `sub-${Date.now()}` }],
        })),

      removeSubject: (id) =>
        set((state) => ({
          subjects: state.subjects.filter((s) => s.id !== id),
          topics: state.topics.filter((t) => t.subjectId !== id),
        })),

      addTopic: (newTopic) =>
        set((state) => ({
          topics: [
            ...state.topics,
            {
              ...newTopic,
              id: `top-${Date.now()}`,
              confidenceLevel: 1,
              lastRevisedAt: null,
              nextRevisionAt: new Date().toISOString(),
              revisionCount: 0,
            },
          ],
        })),

      rateTopic: (topicId, confidence) =>
        set((state) => ({
          topics: state.topics.map((t) => {
            if (t.id !== topicId) return t
            
            // Jednoduchý interval posunu v dnech podle confidence (1-5)
            const daysToAdd = confidence === 1 ? 1 : confidence * 2
            const nextDate = new Date()
            nextDate.setDate(nextDate.getDate() + daysToAdd)

            return {
              ...t,
              confidenceLevel: confidence,
              lastRevisedAt: new Date().toISOString(),
              nextRevisionAt: nextDate.toISOString(),
              revisionCount: t.revisionCount + 1,
            }
          }),
        })),

      updateNotes: (topicId, notes) =>
        set((state) => ({
          topics: state.topics.map((t) => (t.id === topicId ? { ...t, notes } : t)),
        })),

      getSubjectReadiness: (subjectId) => {
        const subjectTopics = get().topics.filter((t) => t.subjectId === subjectId)
        if (subjectTopics.length === 0) return 0
        
        const totalScore = subjectTopics.reduce((acc, t) => acc + t.confidenceLevel, 0)
        const maxPossible = subjectTopics.length * 5
        return Math.round((totalScore / maxPossible) * 100)
      },

      getOverallReadiness: () => {
        const allTopics = get().topics
        if (allTopics.length === 0) return 0
        const totalScore = allTopics.reduce((acc, t) => acc + t.confidenceLevel, 0)
        return Math.round((totalScore / (allTopics.length * 5)) * 100)
      },
    }),
    {
      name: 'schoolbuddy-examprep-storage',
      storage: createJSONStorage(() => secureStorage),
    }
  )
)
      
