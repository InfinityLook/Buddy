import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Login from './pages/login/Login.tsx'
import Hub from './pages/hub/Hub.tsx'
import AppModule from '@/pages/app/AppModule.tsx'
import ProfilModule from '@/pages/profil/ProfilModule.tsx'
import RewardModule from '@/pages/reward/RewardModule.tsx'
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner'
import { setupPWAUpdates } from '@/core/utils/registerSW'
import { useAuthStore } from '@/core/store/useAuthStore'

export default function App() {
  // Přihlášení je perzistentní, takže reload nechá uživatele tam, kde byl.
  const { isAuthed, login, logout } = useAuthStore()

  // Registrace PWA aktualizací při načtení aplikace
  useEffect(() => {
    setupPWAUpdates()
  }, [])

  return (
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Globální indikátor offline připojení */}
      <NetworkStatusBanner />
    </BrowserRouter>
  )
}
