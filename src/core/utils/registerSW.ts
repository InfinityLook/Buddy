import { registerSW } from 'virtual:pwa-register'

export const setupPWAUpdates = (onNeedRefresh?: () => void) => {
  if ('serviceWorker' in navigator) {
    registerSW({
      onNeedRefresh() {
        if (onNeedRefresh) {
          onNeedRefresh()
        } else if (confirm('Je k dispozici nová verze SchoolBuddy. Chceš ji načíst?')) {
          window.location.reload()
        }
      },
      onOfflineReady() {
        console.log('SchoolBuddy je připraven k použití v offline režimu.')
      },
    })
  }
}
