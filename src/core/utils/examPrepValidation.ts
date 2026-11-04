import * as v from 'valibot'
import { ExamSubject, ExamTopic } from '@/miniapps/exam-prep/useExamPrepStore'

// ==========================================
// Ověření uložených dat Maturitního centra — merge() ve
// useExamPrepStore.ts dřív jen ručně filtroval ukázková data bez
// jakékoli kontroly typů (saved?.subjects ?? []).filter(...) by na
// poškozené/netextové položce (třeba null v poli) spadlo a strhlo by
// s sebou celý seznam předmětů i okruhů). Stejný "poškozená položka se
// tiše vyřadí, ne celý seznam" vzor jako Kalendář/Rozvrh/Known/Flashcards.
// ==========================================

export const ExamSubjectSchema = v.object({
  id: v.string(),
  name: v.string(),
  color: v.optional(v.string(), '#a855f7'),
  examDate: v.optional(v.string(), ''),
  // Bez pipe na rozsah — poškozené/mimo rozsah číslo appka ořízne sama,
  // ne že by to zahodilo celý předmět jen pro špatnou cílovou známku.
  targetGrade: v.optional(v.number(), 1),
})

export const ExamTopicSchema = v.object({
  id: v.string(),
  subjectId: v.string(),
  topicNumber: v.optional(v.number(), 1),
  title: v.string(),
  notes: v.optional(v.string(), ''),
  confidenceLevel: v.optional(v.number(), 1),
  lastRevisedAt: v.optional(v.nullable(v.string()), null),
  nextRevisionAt: v.optional(v.nullable(v.string()), null),
  revisionCount: v.optional(v.number(), 0),
  simulatedAt: v.optional(v.nullable(v.string()), null),
})

export const ExamPrepDataSchema = v.object({
  subjects: v.optional(v.array(v.unknown()), []),
  topics: v.optional(v.array(v.unknown()), []),
})

const sanitizujPredmet = (raw: unknown): ExamSubject | null => {
  const jedna = v.safeParse(ExamSubjectSchema, raw)
  if (!jedna.success) return null
  const { id, name, color, examDate, targetGrade } = jedna.output

  // Prázdný název znamená poškozený předmět bez obsahu — appka ho
  // tiše vyřadí, ne že by ukázala bezejmenný předmět v záložce Okruhy.
  if (!name.trim()) return null

  return {
    id,
    name: name.trim(),
    color,
    examDate,
    targetGrade: Math.min(5, Math.max(1, Math.round(targetGrade))),
  }
}

const sanitizujOkruh = (raw: unknown): ExamTopic | null => {
  const jedna = v.safeParse(ExamTopicSchema, raw)
  if (!jedna.success) return null
  const {
    id,
    subjectId,
    topicNumber,
    title,
    notes,
    confidenceLevel,
    lastRevisedAt,
    nextRevisionAt,
    revisionCount,
    simulatedAt,
  } = jedna.output

  if (!title.trim()) return null

  return {
    id,
    subjectId,
    topicNumber: Math.max(1, Math.round(topicNumber)),
    title: title.trim(),
    notes,
    confidenceLevel: Math.min(5, Math.max(1, Math.round(confidenceLevel))) as ExamTopic['confidenceLevel'],
    lastRevisedAt,
    nextRevisionAt,
    revisionCount: Math.max(0, Math.round(revisionCount)),
    simulatedAt,
  }
}

export const validateExamPrepData = (data: unknown) => {
  const result = v.safeParse(ExamPrepDataSchema, data)
  if (!result.success) {
    console.warn('Data Maturitního centra neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const subjects = result.output.subjects
    .map(sanitizujPredmet)
    .filter((s): s is ExamSubject => s !== null)

  const platneSubjectIds = new Set(subjects.map((s) => s.id))

  // Okruh pod neplatným/smazaným předmětem by zůstal viset bez
  // předmětu a počítal by se do celkové připravenosti — stejná
  // úvaha jako u ukázkových dat v merge() níž.
  const topics = result.output.topics
    .map(sanitizujOkruh)
    .filter((t): t is ExamTopic => t !== null && platneSubjectIds.has(t.subjectId))

  return { success: true as const, data: { subjects, topics } }
}
