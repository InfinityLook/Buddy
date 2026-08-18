import React, { useState, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppHeader } from './components/AppHeader'
import { AppToolbar } from './components/AppToolbar'
import { AppCard } from './components/AppCard'
import { AppBanner } from './components/AppBanner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { MINI_APP_REGISTRY } from '@/features/miniapps/registry'
import { useAppStore } from '@/core/store/useAppStore'
import './AppModule.css'

interface AppModuleProps {
  onBack?: () => void
}

export const AppModule: React.FC<AppModuleProps> = ({ onBack }) => {
  const navigate = useNavigate()

  // Načtení globálního stavu ze Zustand storu
  const { apps, activeAppId, returnPath, setActiveAppId, toggleFavorite } = useAppStore()

  // Hub umí odkázat rovnou na konkrétní kategorii (např. Library → Vzdělávání)
  const [searchParams] = useSearchParams()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(
    () => searchParams.get('kategorie') ?? 'Všechny'
  )
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const activeApp = apps.find((app) => app.id === activeAppId)
  const ActiveComponent = activeAppId ? MINI_APP_REGISTRY[activeAppId] : null

  // Bez vlastního onBack (např. při vstupu přes routu /apps) se vracíme do Hubu
  const handleBack = onBack ?? (() => navigate('/hub'))

  // Zavření otevřené miniaplikace — pokud sem uživatel přišel deep-linkem
  // (Hub, Profil), vrátí ho zpět tam; jinak zůstává v mřížce aplikací.
  const handleCloseApp = () => {
    setActiveAppId(null)
    if (returnPath) navigate(returnPath)
  }

  // Zobrazení plné stránky pro vybranou miniaplikaci
  if (activeApp && ActiveComponent) {
    return (
      <div className="app-fullscreen-view">
        <header className="app-fullscreen-header">
          <button
            className="app-back-btn"
            onClick={handleCloseApp}
          >
            {returnPath ? '← Zpět' : '← Zpět do seznamu'}
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
      <AppHeader onBack={handleBack} />
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
            onToggleFavorite={(id) => toggleFavorite(id)}
          />
        ))}
      </div>

      <AppBanner />
    </div>
  )
}

export default AppModule
