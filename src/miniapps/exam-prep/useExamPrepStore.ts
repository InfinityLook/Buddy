import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'

// Kolik ohodnocených (aspoň jednou zrevidovaných) otázek stačí na odznak "Maturitní Mašina"
const TOPICS_RATED_FOR_BADGE = 20

// XP za dokončenou simulaci jedné otázky. Připíše se jen jednou za otázku —
// viz completeSimulation.
const XP_PER_SIMULATION = 100

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
  // Nastaví se po první dokončené simulaci téhle otázky a už se nemaže.
  // Bez toho šlo v simulátoru donekonečna mačkat "Dokončit" a "Jiná
  // otázka" a sbírat po stovce XP každých pár vteřin.
  simulatedAt?: string | null
}

export interface ExamSubject {
  id: string
  name: string
  color: string
  examDate: string
  targetGrade: number
}

// Ukázkový předmět a otázka o Karlu Čapkovi se tvářily jako data
// uživatele, přitom mu nepatřily — a otázka navíc počítala do indexu
// připravenosti. Poznáme je podle id i názvu zároveň.
const DEMO_SUBJECT_IDS = ['sub-cj', 'sub-aj']
const DEMO_SUBJECT_NAMES = ['Český jazyk a literatura', 'Anglický jazyk']
const DEMO_TOPIC_IDS = ['top-1']
const DEMO_TOPIC_TITLES = ['Karel Čapek a meziválečná próza']

interface ExamPrepStore {
  subjects: ExamSubject[]
  topics: ExamTopic[]

  // Akce předmětů
  addSubject: (subject: Omit<ExamSubject, 'id'>) => void
  updateSubject: (id: string, patch: Partial<Omit<ExamSubject, 'id'>>) => void
  removeSubject: (id: string) => void

  // Akce otázek
  addTopic: (
    topic: Omit<
      ExamTopic,
      'id' | 'lastRevisedAt' | 'nextRevisionAt' | 'revisionCount' | 'confidenceLevel' | 'simulatedAt'
    >
  ) => void
  updateTopic: (id: string, topicNumber: number, title: string) => void
  removeTopic: (id: string) => void
  rateTopic: (topicId: string, confidence: ConfidenceLevel) => void
  updateNotes: (topicId: string, notes: string) => void
  completeSimulation: (topicId: string) => void

  // Pomocné výpočty
  getSubjectReadiness: (subjectId: string) => number
  getOverallReadiness: () => number
}

// Otázka je "na řadě", když u ní ještě žádné opakování neproběhlo nebo
// když termín dalšího opakování už nastal.
const isDue = (topic: ExamTopic): boolean =>
  !topic.nextRevisionAt || new Date(topic.nextRevisionAt) <= new Date()

export const useExamPrepStore = create<ExamPrepStore>()(
  persist(
    (set, get) => ({
      subjects: [],
      topics: [],

      addSubject: (newSub) =>
        set((state) => ({
          subjects: [...state.subjects, { ...newSub, id: `sub-${Date.now()}` }],
        })),

      updateSubject: (id, patch) =>
        set((state) => ({
          subjects: state.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)),
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
              id: `top-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              confidenceLevel: 1,
              lastRevisedAt: null,
              nextRevisionAt: new Date().toISOString(),
              revisionCount: 0,
              simulatedAt: null,
            },
          ],
        })),

      updateTopic: (id, topicNumber, title) => {
        if (!title.trim()) return
        set((state) => ({
          topics: state.topics.map((t) =>
            t.id === id ? { ...t, topicNumber, title: title.trim() } : t
          ),
        }))
      },

      removeTopic: (id) =>
        set((state) => ({ topics: state.topics.filter((t) => t.id !== id) })),

      rateTopic: (topicId, confidence) => {
        const before = get().topics.find((t) => t.id === topicId)
        if (!before) return

        // XP jen za otázku, která je opravdu na řadě. Bez téhle podmínky
        // stačilo tutéž kartičku odklikat dokola a sbírat po 50 XP.
        const earnsXp = isDue(before)

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
        }))

        if (earnsXp) useGamificationStore.getState().addXp(confidence * 10)

        // Odznak "Maturitní Mašina" — jakmile bylo zrevidováno dost otázek
        const ratedTopicsCount = get().topics.filter((t) => t.revisionCount > 0).length
        if (ratedTopicsCount >= TOPICS_RATED_FOR_BADGE) {
          useGamificationStore.getState().unlockBadge('exam_master')
        }
      },

      updateNotes: (topicId, notes) =>
        set((state) => ({
          topics: state.topics.map((t) => (t.id === topicId ? { ...t, notes } : t)),
        })),

      completeSimulation: (topicId) => {
        const topic = get().topics.find((t) => t.id === topicId)
        if (!topic || topic.simulatedAt) return // odměna za otázku jen jednou

        set((state) => ({
          topics: state.topics.map((t) =>
            t.id === topicId ? { ...t, simulatedAt: new Date().toISOString() } : t
          ),
        }))

        useGamificationStore.getState().addXp(XP_PER_SIMULATION)
      },

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

      merge: (persisted, current) => {
        const saved = persisted as Partial<ExamPrepStore> | undefined

        const subjects = (saved?.subjects ?? []).filter(
          (s) => !(DEMO_SUBJECT_IDS.includes(s.id) && DEMO_SUBJECT_NAMES.includes(s.name))
        )
        const keptSubjectIds = new Set(subjects.map((s) => s.id))

        const topics = (saved?.topics ?? [])
          .filter((t) => !(DEMO_TOPIC_IDS.includes(t.id) && DEMO_TOPIC_TITLES.includes(t.title)))
          // Otázky pod smazaným ukázkovým předmětem by zůstaly viset bez
          // předmětu a počítaly by se do celkové připravenosti.
          .filter((t) => keptSubjectIds.has(t.subjectId))
          .map((t) => ({ ...t, simulatedAt: t.simulatedAt ?? null }))

        return { ...current, ...saved, subjects, topics }
      },
    }
  )
)
