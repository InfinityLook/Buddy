import { registerSW } from 'virtual:pwa-register'

// ==========================================
// Jediné místo, odkud se registruje service worker (viz useEffect v App.tsx).
//
// vite.config.ts má registerType: 'autoUpdate' — jakmile prohlížeč zjistí
// nový service worker, sám se aktivuje (skipWaiting/clientsClaim) a stránka
// se automaticky obnoví, jakmile nový SW převezme kontrolu. V tomto režimu
// knihovna onNeedRefresh vůbec nevolá (to platí jen pro registerType:
// 'prompt'), proto tu žádný potvrzovací dialog není — update proběhne
// tiše, bez zásahu uživatele.
// ==========================================
export const setupPWAUpdates = () => {
  if ('serviceWorker' in navigator) {
    registerSW({
      immediate: true,
      onOfflineReady() {
        console.log('SchoolBuddy je připraven k použití v offline režimu.')
      },
    })
  }
}
