import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from './components/AppHeader'
import { AppIcon } from './components/AppIcon'
import { RychleSpusteni } from './components/RychleSpusteni'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppBottomNav } from '@/components/AppBottomNav'
import { MINI_APP_REGISTRY } from '@/features/miniapps/registry'
import { useAppStore } from '@/core/store/useAppStore'
import { usePlannerView } from '@/miniapps/study-planner/useStudyPlanner'
import {
  ProfilNotifications,
  useNotificationItems,
} from '@/pages/profil/components/ProfilNotifications'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import '@/pages/profil/ProfilModule.css'
import './AppModule.css'

interface AppModuleProps {
  onBack?: () => void
}

export const AppModule: React.FC<AppModuleProps> = ({ onBack }) => {
  const navigate = useNavigate()
  const { rootAttributes } = useSurfaceAppearance('apps-launcher')
  const { rootAttributes: plannerAttributes } = useSurfaceAppearance('study-planner')
  const { apps, activeAppId, returnPath, setActiveAppId } = useAppStore()
  const { profile, markNotificationRead } = useProfileData()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifications = useNotificationItems()
  const unreadCount = notifications.filter(
    (item) => !profile.readNotifications.includes(item.id)
  ).length

  const miniaplikace = useMemo(
    () => apps.filter((app) => !app.route),
    [apps]
  )
  const activeApp = miniaplikace.find((app) => app.id === activeAppId)
  const ActiveComponent = activeApp ? MINI_APP_REGISTRY[activeApp.id] : null
  const handleBack = onBack ?? (() => navigate('/hub'))

  const focusTaskId = usePlannerView((state) => state.focusTaskId)
  useEffect(() => () => {
    usePlannerView.setState({ focusTaskId: null, focusReturnPath: null })
  }, [])
  const handleCloseApp = () => {
    if (activeAppId === 'pomodoro' && focusTaskId) {
      const origin = usePlannerView.getState().focusReturnPath
      usePlannerView.setState({ focusTaskId: null, focusReturnPath: null })
      setActiveAppId('study-planner', origin)
      return
    }
    // Cíl si ponecháme před vyčištěním otevřené aplikace.
    const cilNavratu = returnPath
    setActiveAppId(null)
    if (cilNavratu) navigate(cilNavratu)
  }

  if (activeApp && ActiveComponent) {
    return (
      <div className={`app-fullscreen-view${activeAppId === 'study-planner' ? ' app-fullscreen-view--planner buddy-theme-scope' : ''}`} {...(activeAppId === 'study-planner' ? plannerAttributes : {})}>
        <header className="app-fullscreen-header">
          <button className="app-back-btn" onClick={handleCloseApp}>
            <AppIcon name="arrow-left" size={18} />
            <span>{activeAppId === 'pomodoro' && focusTaskId ? 'Zpět do Plánovače' : returnPath ? 'Zpět' : 'Zpět do seznamu'}</span>
          </button>
          <h2>{activeApp.title}</h2>
        </header>
        <main className="app-fullscreen-content">
          <ErrorBoundary fallbackTitle={`Chyba při načítání ${activeApp.title}`}>
            <Suspense fallback={<div className="app-suspense-fallback">Načítání…</div>}>
              <ActiveComponent {...(activeAppId === 'study-planner' ? { onBack: handleCloseApp } : {})} />
            </Suspense>
          </ErrorBoundary>
        </main>
        <AppBottomNav />
      </div>
    )
  }

  return (
    <div className="app-page buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId="apps-launcher" />
      <div className="app-container">
        <AppHeader
          onBack={handleBack}
          onOpenNotifications={() => setNotifOpen(true)}
          unreadCount={unreadCount}
        />
        <RychleSpusteni
          miniaplikace={miniaplikace}
          onOpen={(id) => setActiveAppId(id)}
        />
        <AppBottomNav />
        <ProfilNotifications
          open={notifOpen}
          readIds={profile.readNotifications}
          onMarkRead={markNotificationRead}
          onClose={() => setNotifOpen(false)}
        />
      </div>
    </div>
  )
}

export default AppModule
