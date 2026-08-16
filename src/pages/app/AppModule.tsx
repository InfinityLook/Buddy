import React, { useState, Suspense } from 'react'
import { AppHeader } from './components/AppHeader'
import { AppStats } from './components/AppStats'
import { AppToolbar } from './components/AppToolbar'
import { AppCard, AppItem } from './components/AppCard'
import { AppBanner } from './components/AppBanner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { MINI_APP_REGISTRY } from '@/features/miniapps/registry'
import './AppModule.css'

interface AppModuleProps {
  onBack?: () => void
}

const INITIAL_APPS: AppItem[] = [
  { id: 'study-planner', title: 'Study Planner', category: 'Produktivita', icon: 'study-planner', color: 'purple', active: true, favorite: false },
  { id: 'flashcards', title: 'Flashcards', category: 'Vzdělávání', icon: 'flashcards', color: 'cyan', active: true, favorite: true },
  { id: 'pomodoro', title: 'Pomodoro', category: 'Produktivita', icon: 'pomodoro', color: 'orange', active: true, favorite: false },
  { id: 'math-solver', title: 'Math Solver', category: 'Nástroje', icon: 'math-solver', color: 'green', active: true, favorite: false },
  { id: 'quick-notes', title: 'Quick Notes', category: 'Produktivita', icon: 'quick-notes', color: 'pink', active: true, favorite: true },
  { id: 'goal-tracker', title: 'Goal Tracker', category: 'Produktivita', icon: 'goal-tracker', color: 'purple', active: true, favorite: false },
  { id: 'mind-map', title: 'Mind Map', category: 'Vzdělávání', icon: 'mind-map', color: 'cyan', active: true, favorite: false },
  { id: 'file-manager', title: 'File Manager', category: 'Nástroje', icon: 'file-manager', color: 'orange', active: true, favorite: false },
]

export const AppModule: React.FC<AppModuleProps> = ({ onBack }) => {
  const [apps, setApps] = useState<AppItem[]>(INITIAL_APPS)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Všechny')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // ID vybrané aplikace
  const [activeAppId, setActiveAppId] = useState<string | null>(null)

  const activeApp = apps.find((app) => app.id === activeAppId)
  const ActiveComponent = activeAppId ? MINI_APP_REGISTRY[activeAppId] : null

  const handleToggleFavorite = (id: string) => {
    setApps((prev) =>
      prev.map((app) => (app.id === id ? { ...app, favorite: !app.favorite } : app))
    )
  }

  const handleCreateNew = () => {
    alert('Otevírá se průvodce vytvořením nové aplikace!')
  }

  // Zobrazení plné stránky pro vybranou miniaplikaci
  if (activeApp && ActiveComponent) {
    return (
      <div className="app-fullscreen-view">
        <header className="app-fullscreen-header">
          <button 
            className="app-back-btn" 
            onClick={() => setActiveAppId(null)}
          >
            ← Zpět do seznamu
          </button>
          <h2>{activeApp.title}</h2>
        </header>

        <main className="app-fullscreen-content">
          <ErrorBoundary fallbackTitle={`Chyba při načítání ${activeApp.title}`}>
            <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem', color: '#fff' }}>Načítání...</div>}>
              <ActiveComponent />
            </Suspense>
          </ErrorBoundary>
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
            onClick={(selectedApp) => setActiveAppId(selectedApp.id)}
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
  
