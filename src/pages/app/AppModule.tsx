import React, { useMemo, useState, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppHeader } from './components/AppHeader'
import { AppToolbar, ALL_CATEGORIES, FAVORITES_CATEGORY } from './components/AppToolbar'
import { AppCard } from './components/AppCard'
import { AppBanner } from './components/AppBanner'
import { AppIcon } from './components/AppIcon'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { MINI_APP_REGISTRY } from '@/features/miniapps/registry'
import { useAppStore, AppItem } from '@/core/store/useAppStore'
import {
  ProfilNotifications,
  useNotificationItems,
} from '@/pages/profil/components/ProfilNotifications'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
// Panel upozornění je sdílený s profilem včetně svých stylů. Import je
// tady schválně explicitní — kdyby profil někdy přestal být načítaný
// hned při startu, tenhle řádek zajistí, že panel nezůstane bez vzhledu.
import '@/pages/profil/ProfilModule.css'
import './AppModule.css'

interface AppModuleProps {
  onBack?: () => void
}

// Hledání bez ohledu na diakritiku — student píše "matika" i "uceni"
// a nemá důvod dostat prázdný výsledek jen kvůli chybějící čárce.
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    // U+0300 až U+036F je blok spojovacích diakritických znamének,
    // které z písmen oddelil rozklad NFD.
    .replace(/[\u0300-\u036f]/g, '')

export const AppModule: React.FC<AppModuleProps> = ({ onBack }) => {
  const navigate = useNavigate()

  // Načtení globálního stavu ze Zustand storu
  const {
    apps,
    activeAppId,
    returnPath,
    sortMode,
    viewMode,
    setActiveAppId,
    toggleFavorite,
    toggleAppVisible,
    setSortMode,
    setViewMode,
  } = useAppStore()

  const { profile, markNotificationRead } = useProfileData()

  // Hub umí odkázat rovnou na konkrétní kategorii (např. Library → Vzdělávání)
  const [searchParams] = useSearchParams()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(
    () => searchParams.get('kategorie') ?? ALL_CATEGORIES
  )
  const [showHidden, setShowHidden] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)

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

  // Kategorie bereme ze skutečných dlaždic. Napevno psaný seznam obsahoval
  // i "Zábava" a "Ostatní", pod kterými nikdy nic nebylo — kliknutí vedlo
  // na prázdnou stránku.
  const categories = useMemo(
    () => [...new Set(apps.map((app) => app.category))].sort((a, b) => a.localeCompare(b, 'cs')),
    [apps]
  )

  const hiddenCount = useMemo(() => apps.filter((app) => !app.active).length, [apps])
  const favoriteCount = useMemo(() => apps.filter((app) => app.favorite).length, [apps])

  // Poslední otevřená miniaplikace pro banner — skryté sem nepatří
  const lastApp = useMemo<AppItem | null>(() => {
    const opened = apps.filter((app) => app.active && app.lastOpenedAt)
    if (opened.length === 0) return null
    return opened.reduce((best, app) =>
      (app.lastOpenedAt ?? 0) > (best.lastOpenedAt ?? 0) ? app : best
    )
  }, [apps])

  const visibleApps = useMemo(
    () => apps.filter((app) => showHidden || app.active),
    [apps, showHidden]
  )

  const filteredApps = useMemo(() => {
    const query = normalize(searchQuery.trim())

    const matching = visibleApps.filter((app) => {
      const matchesSearch =
        query === '' ||
        normalize(app.title).includes(query) ||
        normalize(app.category).includes(query)

      const matchesCategory =
        activeCategory === ALL_CATEGORIES
          ? true
          : activeCategory === FAVORITES_CATEGORY
            ? app.favorite
            : app.category === activeCategory

      return matchesSearch && matchesCategory
    })

    const byTitle = (a: AppItem, b: AppItem) => a.title.localeCompare(b.title, 'cs')

    switch (sortMode) {
      case 'name':
        return [...matching].sort(byTitle)
      case 'category':
        return [...matching].sort(
          (a, b) => a.category.localeCompare(b.category, 'cs') || byTitle(a, b)
        )
      case 'recent':
        return [...matching].sort(
          (a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0) || byTitle(a, b)
        )
      case 'favorites':
      default:
        return [...matching].sort(
          (a, b) => Number(b.favorite) - Number(a.favorite) || byTitle(a, b)
        )
    }
  }, [visibleApps, searchQuery, activeCategory, sortMode])

  const hasActiveFilters = searchQuery.trim() !== '' || activeCategory !== ALL_CATEGORIES

  const resetFilters = () => {
    setSearchQuery('')
    setActiveCategory(ALL_CATEGORIES)
  }

  // Číslo u zvonku počítáme ze stejného seznamu, jaký panel vykreslí
  const notifications = useNotificationItems()
  const unreadCount = notifications.filter(
    (item) => !profile.readNotifications.includes(item.id)
  ).length

  // Zobrazení plné stránky pro vybranou miniaplikaci
  if (activeApp && ActiveComponent) {
    return (
      <div className="app-fullscreen-view">
        <header className="app-fullscreen-header">
          <button className="app-back-btn" onClick={handleCloseApp}>
            <AppIcon name="arrow-left" size={18} />
            <span>{returnPath ? 'Zpět' : 'Zpět do seznamu'}</span>
          </button>
          <h2>{activeApp.title}</h2>
        </header>

        <main className="app-fullscreen-content">
          <ErrorBoundary fallbackTitle={`Chyba při načítání ${activeApp.title}`}>
            <Suspense fallback={<div className="app-suspense-fallback">Načítání…</div>}>
              <ActiveComponent />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    )
  }

  return (
    <div className="app-container">
      <AppHeader
        onBack={handleBack}
        onOpenNotifications={() => setNotifOpen(true)}
        onOpenSettings={() => navigate('/nastaveni')}
        unreadCount={unreadCount}
      />

      <AppToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        categories={categories}
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortMode={sortMode}
        setSortMode={setSortMode}
        hiddenCount={hiddenCount}
        showHidden={showHidden}
        toggleShowHidden={() => setShowHidden((v) => !v)}
        resultCount={filteredApps.length}
        totalCount={visibleApps.length}
      />

      {filteredApps.length === 0 ? (
        <div className="app-empty-state">
          <AppIcon name="search-off" size={38} />
          <h3>Nic tu není</h3>
          <p>
            {hasActiveFilters
              ? 'Žádná aplikace neodpovídá tomu, co hledáš.'
              : 'Všechny aplikace máš schované. Vrať si je zpátky přes nabídku u dlaždice.'}
          </p>
          {hasActiveFilters && (
            <button className="app-empty-btn" onClick={resetFilters}>
              Zrušit filtry
            </button>
          )}
        </div>
      ) : (
        <div className={`app-grid-container ${viewMode}`}>
          {filteredApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              menuOpen={openMenuId === app.id}
              onMenuToggle={setOpenMenuId}
              onClick={(selectedApp) => setActiveAppId(selectedApp.id)}
              onToggleFavorite={(id) => toggleFavorite(id)}
              onToggleVisible={(id) => toggleAppVisible(id)}
            />
          ))}
        </div>
      )}

      <AppBanner
        lastApp={lastApp}
        onOpen={(id) => setActiveAppId(id)}
        favoriteCount={favoriteCount}
      />

      <ProfilNotifications
        open={notifOpen}
        readIds={profile.readNotifications}
        onMarkRead={markNotificationRead}
        onClose={() => setNotifOpen(false)}
      />
    </div>
  )
}

export default AppModule
