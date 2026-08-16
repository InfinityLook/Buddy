import { BrowserRouter, Routes, Route, Navigate } from 'react_router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/login/Login.tsx'
import Hub from './pages/hub/Hub.tsx'
import AppModule from '@/features/apps/AppModule.tsx'
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner'
import { setupPWAUpdates } from '@/core/utils/registerSW'

export default function App() {
  const [isAuthed, setIsAuthed] = useState(false)

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
              <Login onLogin={() => setIsAuthed(true)} />
            )
          }
        />

        <Route
          path="/hub"
          element={
            isAuthed ? (
              <Hub onLogout={() => setIsAuthed(false)} />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Globální indikátor offline připojení */}
      <NetworkStatusBanner />
    </BrowserRouter>
  )
}
