self.addEventListener('push', event => {
  if (!event.data) return

  let payload

  try {
    payload = event.data.json()
  } catch {
    return
  }

  event.waitUntil(
    self.registration.showNotification(
      payload.title ?? 'Buddy',
      {
        body: payload.body ?? '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'pomodoro',
        data: {
          url: '/apps?pomodoro=1',
        },
      }
    )
  )
})

self.addEventListener(
  'notificationclick',
  event => {
    event.notification.close()

    const target =
      event.notification.tag === 'pomodoro'
        ? '/apps?pomodoro=1'
        : '/'

    event.waitUntil(
      self.clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then(clientList => {
          for (const client of clientList) {
            if ('focus' in client) {
              return client
                .navigate(target)
                .then(window => window?.focus())
            }
          }

          if (self.clients.openWindow) {
            return self.clients.openWindow(
              target
            )
          }
        })
    )
  }
)
