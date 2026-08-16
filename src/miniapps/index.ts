import React from 'react'

// Importy jednotlivých miniaplikací
import { StudyPlanner } from './study-planner/StudyPlanner'
import { Flashcards } from './flashcards/Flashcards'
import { Pomodoro } from './pomodoro/Pomodoro'
import { MathSolver } from './math-solver/MathSolver'
import { QuickNotes } from './quick-notes/QuickNotes'
import { GoalTracker } from './goal-tracker/GoalTracker'
import { MindMap } from './mind-map/MindMap'
import { FileManager } from './file-manager/FileManager'

export interface MiniAppConfig {
  id: string
  name: string
  category: 'Produktivita' | 'Vzdělávání' | 'Nástroje'
  component: React.FC
}

export const MINI_APPS: Record<string, MiniAppConfig> = {
  'study-planner': { id: 'study-planner', name: 'Study Planner', category: 'Produktivita', component: StudyPlanner },
  'flashcards': { id: 'flashcards', name: 'Flashcards', category: 'Vzdělávání', component: Flashcards },
  'pomodoro': { id: 'pomodoro', name: 'Pomodoro', category: 'Produktivita', component: Pomodoro },
  'math-solver': { id: 'math-solver', name: 'Math Solver', category: 'Nástroje', component: MathSolver },
  'quick-notes': { id: 'quick-notes', name: 'Quick Notes', category: 'Produktivita', component: QuickNotes },
  'goal-tracker': { id: 'goal-tracker', name: 'Goal Tracker', category: 'Produktivita', component: GoalTracker },
  'mind-map': { id: 'mind-map', name: 'Mind Map', category: 'Vzdělávání', component: MindMap },
  'file-manager': { id: 'file-manager', name: 'File Manager', category: 'Nástroje', component: FileManager },
}
