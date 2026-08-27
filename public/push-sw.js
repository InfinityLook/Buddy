// ==========================================
// Push handler, natažený do generovaného service workeru přes
// workbox.importScripts (vite.config.ts) — vite-plugin-pwa v režimu
// generateSW nedovolí přidat vlastní event listener přímo, jen takhle
// naimportovat samostatný skript vedle toho generovaného.
//
// Musí zůstat mimo precache (vite.config.ts's globIgnores), stejná
// úvaha jako u js/auto-update.js: jde o kód service workeru samotného,
// ne o asset appky.
// ==========================================

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    return
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Buddy', {
      body: payload.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'pomodoro',
    })
  )
})

// Klepnutí na notifikaci appku otevře (nebo přepne na už otevřenou
// záložku) místo výchozího chování, kdy notifikace jen zmizí.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/')
    })
  )
})
