import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import Login from './pages/login/Login.tsx'
import Hub from './pages/hub/Hub.tsx'
import AppModule from '@/pages/app/AppModule.tsx'
import ProfilModule from '@/pages/profil/ProfilModule.tsx'
import RewardModule from '@/pages/reward/RewardModule.tsx'
import SettingsModule from '@/pages/setting/SettingsModule.tsx'
import ShopModule from '@/pages/shop/ShopModule.tsx'
// Herní hub si s sebou nese Three.js, takže se načítá až při vstupu —
// zbytek aplikace tím nezůstane těžší.
const GameModule = lazy(() => import('@/game/GameModule'))
import { BootGate } from '@/components/BootGate'
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner'
import { setupPWAUpdates } from '@/core/utils/registerSW'
import { startCloudSync } from '@/core/supabase/cloudSync'
import { useAuthStore } from '@/core/store/useAuthStore'
import { setupRoleDevTools } from '@/core/role'

export default function App() {
  // Přihlášení je perzistentní, takže reload nechá uživatele tam, kde byl.
  const { isAuthed, login, logout } = useAuthStore()

  // Registrace PWA aktualizací při načtení aplikace
  useEffect(() => {
    setupPWAUpdates()
    // Cloud je doplněk: bez nastavených proměnných se tiše přeskočí
    // a aplikace jede dál jen nad localStorage.
    startCloudSync()
    // Přidělení role z konzole. Jen ve vývoji — v produkčním buildu se
    // celý blok vyhodí, viz core/role/devTools.ts.
    setupRoleDevTools()
  }, [])

  return (
    // Než se vykreslí aplikace, doběhne kontrola aktualizací —
    // uživatel tak nezačíná na staré verzi, kterou by mu obnova
    // za chvíli vytrhla pod rukama.
    <BootGate>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              isAuthed ? (
                <Navigate to="/hub" replace />
              ) : (
                <Login onLogin={login} />
              )
            }
          />

          <Route
            path="/hub"
            element={
              isAuthed ? (
                <Hub onLogout={logout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Route pro rozcestník miniaplikací (AppModule) */}
          <Route
            path="/apps"
            element={
              isAuthed ? (
                <AppModule />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Route pro profil uživatele */}
          <Route
            path="/profil"
            element={
              isAuthed ? (
                <ProfilModule />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Route pro odměny (úroveň, série a odznaky) */}
          <Route
            path="/odmeny"
            element={
              isAuthed ? (
                <RewardModule />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Route pro herní hub (3D město) */}
          <Route
            path="/hra"
            element={
              isAuthed ? (
                <Suspense fallback={<div className="app-suspense-fallback">Načítám město…</div>}>
                  <GameModule />
                </Suspense>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Route pro obchod (kredity, VIP a doplňky) */}
          <Route
            path="/obchod"
            element={
              isAuthed ? (
                <ShopModule />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Route pro nastavení aplikace */}
          <Route
            path="/nastaveni"
            element={
              isAuthed ? (
                <SettingsModule />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Globální indikátor offline připojení */}
        <NetworkStatusBanner />
      </BrowserRouter>
    </BootGate>
  )
}
