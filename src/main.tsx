import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/global.css'

// Service worker se registruje jen jednou, přes setupPWAUpdates() v App.tsx —
// druhé volání registerSW() tady by vytvořilo druhou nezávislou instanci
// Workboxu se zdvojenými listenery.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
