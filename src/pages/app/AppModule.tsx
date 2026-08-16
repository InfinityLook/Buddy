import React, { useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { AppStats } from './components/AppStats'
import { AppToolbar } from './components/AppToolbar'
import { AppCard, AppItem } from './components/AppCard'
import { AppBanner } from './components/AppBanner'
import './AppModule.css'

// Importy všech miniaplikací
import { StudyPlanner } from '../../miniapps/study-planner/StudyPlanner'
import { Flashcards } from '../../miniapps/flashcards/Flashcards'
import { Pomodoro } from '../../miniapps/pomodoro/Pomodoro'
import { MathSolver } from '../../miniapps/math-solver/MathSolver'
import { QuickNotes } from '../../miniapps/quick-notes/QuickNotes'
import { GoalTracker } from '../../miniapps/goal-tracker/GoalTracker'
import { MindMap } from '../../miniapps/mind-map/MindMap'
import { FileManager } from '../../miniapps/file-manager/FileManager'

interface AppModuleProps {
  onBack?: () => void
}

const INITIAL_APPS: AppItem[] = [
  { id: '1', title: 'Study Planner', category: 'Produktivita', icon: 'study-planner', color: 'purple', active: true, favorite: false },
  { id: '2', title: 'Flashcards', category: 'Vzdělávání', icon: 'flashcards', color: 'cyan', active: true, favorite: true },
  { id: '3', title: 'Pomodoro', category: 'Produktivita', icon: 'pomodoro', color: 'orange', active: true, favorite: false },
  { id: '4', title: 'Math Solver', category: 'Nástroje', icon: 'math-solver', color: 'green', active: true, favorite: false },
  { id: '5', title: 'Quick Notes', category: 'Produktivita', icon: 'quick-notes', color: 'pink', active: true, favorite: true },
  { id: '6', title: 'Goal Tracker', category: 'Produktivita', icon: 'goal-tracker', color: 'purple', active: true, favorite: false },
  { id: '7', title: 'Mind Map', category: 'Vzdělávání', icon: 'mind-map', color: 'cyan', active: true, favorite: false },
  { id: '8', title: 'File Manager', category: 'Nástroje', icon: 'file-manager', color: 'orange', active: true, favorite: false },
]

export const AppModule: React.FC<AppModuleProps> = ({ onBack }) => {
  const [apps, setApps] = useState<AppItem[]>(INITIAL_APPS)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Všechny')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Stav pro aktivní otevřenou miniaplikaci
  const [activeApp, setActiveApp] = useState<AppItem | null>(null)

  const handleToggleFavorite = (id: string) => {
    setApps((prev) =>
      prev.map((app) => (app.id === id ? { ...app, favorite: !app.favorite } : app))
    )
  }

  const handleCreateNew = () => {
    alert('Otevírá se průvodce vytvořením nové aplikace!')
  }

  const renderActiveMiniApp = () => {
    if (!activeApp) return null
    switch (activeApp.id) {
      case '1': return <StudyPlanner />
      case '2': return <Flashcards />
      case '3': return <Pomodoro />
      case '4': return <MathSolver />
      case '5': return <QuickNotes />
      case '6': return <GoalTracker />
      case '7': return <MindMap />
      case '8': return <FileManager />
      default: return null
    }
  }

  // Zobrazení plné stránky pro vybranou aplikaci
  if (activeApp) {
    return (
      <div className="app-fullscreen-view">
        <header className="app-fullscreen-header">
          <button 
            className="app-back-btn" 
            onClick={() => setActiveApp(null)}
          >
            ← Zpět do seznamu
          </button>
          <h2>{activeApp.title}</h2>
        </header>

        <main className="app-fullscreen-content">
          {renderActiveMiniApp()}
        </main>
      </div>
    )
  }

  const filteredApps = apps.filter((app) => {
    const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'Všechny' || app.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="app-container">
      <AppHeader onBack={onBack} />
      <AppStats />
      <AppToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <div className={`app-grid-container ${viewMode}`}>
        {filteredApps.map((app) => (
          <AppCard
            key={app.id}
            app={app}
            onClick={(selectedApp) => setActiveApp(selectedApp)}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
        <AppCard isCreateCard onCreateNew={handleCreateNew} />
      </div>

      <AppBanner onCreateNew={handleCreateNew} />
    </div>
  )
}

export default AppModule
    
