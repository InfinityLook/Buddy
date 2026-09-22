import React, { useMemo, useState, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from './components/AppHeader'
import { AppIcon } from './components/AppIcon'
import { RoomCarousel } from './components/RoomCarousel'
import { RychleSpusteni } from './components/RychleSpusteni'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppBottomNav } from '@/components/AppBottomNav'
import { MINI_APP_REGISTRY } from '@/features/miniapps/registry'
import { useAppStore } from '@/core/store/useAppStore'
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

export const AppModule: React.FC<AppModuleProps> = ({ onBack }) => {
  const navigate = useNavigate()

  // Načtení globálního stavu ze Zustand storu
  const { apps, activeAppId, returnPath, setActiveAppId, markAppOpened } = useAppStore()

  const { profile, markNotificationRead } = useProfileData()

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

  // Šest Roomů (route nastavené, viz useAppStore.ts's AppItem.route) —
  // vlastní carousel nad zbytkem stránky, schválený mockup (viz
  // CLAUDE.md). Pořadí bere appka rovnou z `apps`, co zachovává
  // pořadí DEFAULT_APPS.
  const roomy = useMemo(() => apps.filter((app) => !!app.route), [apps])

  // Appky bez vlastní route jsou ty, co appka umí otevřít jen
  // deep-linkem dovnitř nějakého Roomu (setActiveAppId) — po tom, co
  // úplně každá appka v DEFAULT_APPS dostala jenVeVlajkoveAppce: true,
  // je tohle (ne appyProMrizku filtrovaná na `!jenVeVlajkoveAppce`,
  // co by dnes vždycky vyšla prázdná) skutečný zdroj obsahu pro
  // Rychlé spuštění pod carouselem.
  const miniaplikace = useMemo(() => apps.filter((app) => !app.route), [apps])

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
        onOpenProfile={() => navigate('/profil')}
        unreadCount={unreadCount}
        avatarSrc={profile.avatar}
      />

      {roomy.length > 0 && (
        <RoomCarousel
          rooms={roomy}
          onEnter={(room) => {
            markAppOpened(room.id)
            if (room.route) navigate(room.route)
          }}
        />
      )}

      <RychleSpusteni miniaplikace={miniaplikace} onOpen={(id) => setActiveAppId(id)} />

      {/* Fáze 4 Social nav reworku (viz CLAUDE.md) — appka teď navigaci
          mezi hlavními obrazovkami nabízí i tady, ne jen na Hubu. */}
      <AppBottomNav />

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
