import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './pages/Login.jsx'
import Hub from './pages/Hub.jsx'

// NOTE: this is a visual-only auth flow for now — no real backend call yet.
// Swap `handleLogin` for a real request once the API is ready.
export default function App() {
  const [isAuthed, setIsAuthed] = useState(false)

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
