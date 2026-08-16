import { create } from 'zustand'

export interface AppItem {
  id: string
  title: string
  category: string
  icon: string
  color: string
  active: boolean
  favorite: boolean
}

interface AppState {
  apps: AppItem[]
  activeAppId: string | null
  
  // Akce pro úpravu stavu
  setActiveAppId: (id: string | null) => void
  toggleFavorite: (id: string) => void
  addApp: (app: AppItem) => void
}

export const useAppStore = create<AppState>((set) => ({
  apps: [
    { id: 'study-planner', title: 'Study Planner', category: 'Produktivita', icon: 'study-planner', color: 'purple', active: true, favorite: false },
    { id: 'flashcards', title: 'Flashcards', category: 'Vzdělávání', icon: 'flashcards', color: 'cyan', active: true, favorite: true },
    { id: 'pomodoro', title: 'Pomodoro', category: 'Produktivita', icon: 'pomodoro', color: 'orange', active: true, favorite: false },
    { id: 'math-solver', title: 'Math Solver', category: 'Nástroje', icon: 'math-solver', color: 'green', active: true, favorite: false },
    { id: 'quick-notes', title: 'Quick Notes', category: 'Produktivita', icon: 'pink', active: true, favorite: true },
    { id: 'goal-tracker', title: 'Goal Tracker', category: 'Produktivita', icon: 'goal-tracker', color: 'purple', active: true, favorite: false },
    { id: 'mind-map', title: 'Mind Map', category: 'Vzdělávání', icon: 'mind-map', color: 'cyan', active: true, favorite: false },
    { id: 'file-manager', title: 'File Manager', category: 'Nástroje', icon: 'file-manager', color: 'orange', active: true, favorite: false },
  ],
  activeAppId: null,

  setActiveAppId: (id) => set({ activeAppId: id }),

  toggleFavorite: (id) =>
    set((state) => ({
      apps: state.apps.map((app) =>
        app.id === id ? { ...app, favorite: !app.favorite } : app
      ),
    })),

  addApp: (newApp) =>
    set((state) => ({
      apps: [...state.apps, newApp],
    })),
}))
     
