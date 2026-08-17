import React, { lazy, LazyExoticComponent } from 'react'

// Dynamické načítání jednotlivých miniaplikací
export const MINI_APP_REGISTRY: Record<string, LazyExoticComponent<React.ComponentType<any>>> = {
  'study-planner': lazy(() => import('../../miniapps/study-planner/StudyPlanner')),
  'flashcards': lazy(() => import('../../miniapps/flashcards/Flashcards')),
  'pomodoro': lazy(() => import('../../miniapps/pomodoro/Pomodoro')),
  'math-solver': lazy(() => import('../../miniapps/math-solver/MathSolver')),
  'quick-notes': lazy(() => import('../../miniapps/quick-notes/QuickNotes')),
  'goal-tracker': lazy(() => import('../../miniapps/goal-tracker/GoalTracker')),
  'mind-map': lazy(() => import('../../miniapps/mind-map/MindMap')),
  'file-manager': lazy(() => import('../../miniapps/file-manager/FileManager')),
  'exam-prep': lazy(() => import('../../miniapps/exam-prep/ExamPrepApp')),
}
