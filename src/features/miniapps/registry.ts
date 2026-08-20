import React, { lazy, LazyExoticComponent } from 'react'

// ==========================================
// Dynamické načítání jednotlivých miniaplikací.
//
// React.lazy() očekává modul s default exportem, ale miniaplikace
// používají pojmenované exporty (export const Pomodoro = ...).
// Bez převodu níže se každá karta v Apps rozbila o ErrorBoundary
// s hláškou "Chyba při načítání ...", proto pojmenovaný export
// explicitně mapujeme na default.
// ==========================================
export const MINI_APP_REGISTRY: Record<string, LazyExoticComponent<React.ComponentType<any>>> = {
  'study-planner': lazy(() =>
    import('../../miniapps/study-planner/StudyPlanner').then((m) => ({ default: m.StudyPlanner }))
  ),
  'flashcards': lazy(() =>
    import('../../miniapps/flashcards/Flashcards').then((m) => ({ default: m.Flashcards }))
  ),
  'pomodoro': lazy(() =>
    import('../../miniapps/pomodoro/Pomodoro').then((m) => ({ default: m.Pomodoro }))
  ),
  'math-solver': lazy(() =>
    import('../../miniapps/math-solver/MathSolver').then((m) => ({ default: m.MathSolver }))
  ),
  'quick-notes': lazy(() =>
    import('../../miniapps/quick-notes/QuickNotes').then((m) => ({ default: m.QuickNotes }))
  ),
  'goal-tracker': lazy(() =>
    import('../../miniapps/goal-tracker/GoalTracker').then((m) => ({ default: m.GoalTracker }))
  ),
  'mind-map': lazy(() =>
    import('../../miniapps/mind-map/MindMap').then((m) => ({ default: m.MindMap }))
  ),
  'file-manager': lazy(() =>
    import('../../miniapps/file-manager/FileManager').then((m) => ({ default: m.FileManager }))
  ),
  'exam-prep': lazy(() =>
    import('../../miniapps/exam-prep/ExamPrepApp').then((m) => ({ default: m.ExamPrepApp }))
  ),
  'document-editor': lazy(() =>
    import('../../miniapps/document-editor/DocumentEditor').then((m) => ({ default: m.DocumentEditor }))
  ),
  'finance': lazy(() =>
    import('../../miniapps/finance/Finance').then((m) => ({ default: m.Finance }))
  ),
}
