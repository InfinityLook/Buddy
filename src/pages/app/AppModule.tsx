import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppHeader } from './components/AppHeader'
import { BuddyHeader } from '@/components/buddy-ui/BuddyHeader'
import { RychleSpusteni } from './components/RychleSpusteni'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppBottomNav } from '@/components/AppBottomNav'
import { resolveModuleSurface } from '@/features/appearance/moduleThemeRouting'
import { MINI_APP_REGISTRY } from '@/features/miniapps/registry'
import { useAppStore } from '@/core/store/useAppStore'
import { usePomodoroStatus } from '@/miniapps/pomodoro/usePomodoro'
import {
  ProfilNotifications,
  useNotificationItems,
} from '@/pages/profil/components/ProfilNotifications'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import {
  SurfaceBackdrop,
  useSurfaceAppearance,
} from '@/features/appearance/SurfaceAppearance'
import '@/pages/profil/ProfilModule.css'
import './AppModule.css'

const FULLSCREEN_LAYOUT = new Map([
  ['study-planner', 'planner'],
  ['pomodoro', 'pomo'],
  ['quick-notes', 'notes'],
  ['goal-tracker', 'goals'],
])

interface AppModuleProps {
  onBack?: () => void
}

export const AppModule: React.FC<AppModuleProps> = ({ onBack }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    apps,
    activeAppId,
    returnPath,
    setActiveAppId,
  } = useAppStore()

  const { profile, markNotificationRead } = useProfileData()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifications = useNotificationItems()

  const unreadCount = notifications.filter(
    item => !profile.readNotifications.includes(item.id)
  ).length

  const miniaplikace = useMemo(
    () => apps.filter(app => !app.route),
    [apps]
  )

  const activeApp = miniaplikace.find(
    app => app.id === activeAppId
  )

  const ActiveComponent = activeApp
    ? MINI_APP_REGISTRY[activeApp.id]
    : null

  const surfaceId = resolveModuleSurface('/apps', { activeAppId: ActiveComponent ? activeAppId : null })
  const { rootAttributes } = useSurfaceAppearance(surfaceId ?? 'apps-launcher')
  const fullscreenLayout = activeApp ? FULLSCREEN_LAYOUT.get(activeApp.id) : undefined

  const handleBack = onBack ?? (() => navigate('/hub'))

  const fromPlanner = usePomodoroStatus(
    state => state.returnToPlanner
  )

  useEffect(() => () => {
    usePomodoroStatus.setState({ returnToPlanner: false })
  }, [])

  useEffect(() => {
    if (
      new URLSearchParams(location.search).get('pomodoro') === '1'
    ) {
      setActiveAppId('pomodoro')
      navigate('/apps', { replace: true })
    }
  }, [location.search, navigate, setActiveAppId])

  const handleCloseApp = () => {
    if (activeAppId === 'pomodoro' && fromPlanner) {
      usePomodoroStatus.setState({ returnToPlanner: false })
      setActiveAppId('study-planner', returnPath)
      return
    }

    // Cíl si ponecháme před vyčištěním otevřené aplikace.
    const cilNavratu = returnPath

    setActiveAppId(null)

    if (cilNavratu) navigate(cilNavratu)
  }

  if (activeApp && ActiveComponent) {
    const Content = fullscreenLayout === 'planner' || fullscreenLayout === 'notes' ? 'div' : 'main'
    return (
      <div
        className={`app-fullscreen-view buddy-theme-scope${fullscreenLayout ? ` app-fullscreen-view--${fullscreenLayout}` : ''}`}
        {...rootAttributes}
      >
        {!fullscreenLayout && (
          <BuddyHeader
            title={activeApp.title}
            headingLevel={activeApp.id === 'exam-prep' ? 2 : 1}
            className="app-fullscreen-header"
            variant="quiet"
            onBack={handleCloseApp}
            backLabel={returnPath ? 'Zpět' : 'Zpět do seznamu'}
          />
        )}

        <Content className="app-fullscreen-content">
          <ErrorBoundary
            key={activeApp.id}
            onBack={fullscreenLayout ? handleCloseApp : undefined}
            fallbackTitle={`Chyba při načítání ${activeApp.title}`}
          >
            <Suspense
              fallback={
                <div className="buddy-ui-fallback">
                  <p className="buddy-ui-status" role="status">Načítání…</p>
                  {fullscreenLayout && (
                    <button type="button" className="buddy-ui-button" onClick={handleCloseApp}>Zpět</button>
                  )}
                </div>
              }
            >
              <ActiveComponent {...(fullscreenLayout ? { onBack: handleCloseApp } : {})} />
            </Suspense>
          </ErrorBoundary>
        </Content>

        <AppBottomNav placement="edge" />
      </div>
    )
  }

  return (
    <div
      className="app-page buddy-theme-scope"
      {...rootAttributes}
    >
      <SurfaceBackdrop surfaceId="apps-launcher" />

      <div className="app-container app-container--shared-header app-container--launcher">
        <AppHeader
          onBack={handleBack}
          onOpenNotifications={() => setNotifOpen(true)}
          unreadCount={unreadCount}
        />

        <main className="app-catalog-content">
          <RychleSpusteni
            miniaplikace={miniaplikace}
            onOpen={id => setActiveAppId(id)}
          />
        </main>

        <AppBottomNav />

        <ProfilNotifications
          callerId="apps-launcher"
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
