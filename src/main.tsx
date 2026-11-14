import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SurfaceThemeScope } from '@/features/appearance/SurfaceAppearance'
import './styles/global.css'

// Service worker se registruje výhradně v setupPWAUpdates() (App.tsx).
// Dvojí registrace by vytvořila dvě instance Workboxu, které si po aktivaci
// nové verze navzájem přebíjely reload — a aktualizace tím občas zamrzla.

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('V index.html chybí element #root.')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary wrapFallback={content => (
      <SurfaceThemeScope surfaceId="boot" className="buddy-ui-screen-state">{content}</SurfaceThemeScope>
    )}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
