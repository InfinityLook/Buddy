import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { exportDataToJson } from '@/core/utils/backup'
import { validateAppsData } from '@/core/utils/validation'

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
  
  setActiveAppId: (id: string | null) => void
  toggleFavorite: (id: string) => void
  addApp: (app: AppItem) => void
  exportState: () => void
  importState: (incomingData: unknown) => boolean
}

const DEFAULT_APPS: AppItem[] = [
  { id: 'study-planner', title: 'Study Planner', category: 'Produktivita', icon: 'study-planner', color: 'purple', active: true, favorite: false },
  { id: 'flashcards', title: 'Flashcards', category: 'Vzdělávání', icon: 'flashcards', color: 'cyan', active: true, favorite: true },
  { id: 'pomodoro', title: 'Pomodoro', category: 'Produktivita', icon: 'pomodoro', color: 'orange', active: true, favorite: false },
  { id: 'math-solver', title: 'Math Solver', category: 'Nástroje', icon: 'math-solver', color: 'green', active: true, favorite: false },
  { id: 'quick-notes', title: 'Quick Notes', category: 'Produktivita', icon: 'quick-notes', color: 'pink', active: true, favorite: true },
  { id: 'goal-tracker', title: 'Goal Tracker', category: 'Produktivita', icon: 'goal-tracker', color: 'purple', active: true, favorite: false },
  { id: 'mind-map', title: 'Mind Map', category: 'Vzdělávání', icon: 'mind-map', color: 'cyan', active: true, favorite: false },
  { id: 'file-manager', title: 'File Manager', category: 'Nástroje', icon: 'file-manager', color: 'orange', active: true, favorite: false },
  { id: 'exam-prep', title: 'Maturitní centrum', category: 'Vzdělávání', icon: 'exam-prep', color: 'pink', active: true, favorite: true },
  { id: 'document-editor', title: 'Textový editor', category: 'Produktivita', icon: 'document-editor', color: 'green', active: true, favorite: false },
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      apps: DEFAULT_APPS,
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

      exportState: () => {
        const state = get()
        exportDataToJson({ apps: state.apps }, `schoolbuddy-backup-${new Date().toISOString().slice(0, 10)}.json`)
      },

      // Bezpečný import s okamžitou validací
      importState: (incomingData: unknown) => {
        // Pokud přišel objekt obsahující 'apps', vytáhneme pole, jinak zkusíme přímo incomingData
        const rawApps = (typeof incomingData === 'object' && incomingData !== null && 'apps' in incomingData)
          ? (incomingData as { apps: unknown }).apps
          : incomingData

        const validation = validateAppsData(rawApps)
        if (validation.success && validation.data) {
          set({ apps: validation.data })
          return true
        } else {
          alert('Chyba: Nahraný soubor obsahuje neplatná nebo poškozená data.')
          return false
        }
      },
    }),
    {
      name: 'schoolbuddy-app-storage',
      version: 1,
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ apps: state.apps }),
      
      // Validace dat načítaných ze secureStorage
      migrate: (persistedState: any, version: number) => {
        if (persistedState && persistedState.apps) {
          const validation = validateAppsData(persistedState.apps)
          if (!validation.success) {
            console.error('Data v LocalStorage byla poškozena. Obnovuji výchozí stav.')
            return { apps: DEFAULT_APPS, activeAppId: null } as AppState
          }
        }
        return persistedState as AppState
      },
    }
  )
)
