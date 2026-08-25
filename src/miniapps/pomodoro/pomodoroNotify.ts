import { getServiceWorkerRegistration } from '@/core/utils/registerSW'

// ==========================================
// Systémová notifikace po vypršení pomodoro bloku.
//
// Appka do teď Notification API vůbec nepoužívala. Přidává se jen tady,
// úzce zaměřené na jeden účel — upozornit, že blok doběhl, i když
// uživatel mezitím z Pomodora odešel jinam v appce.
//
// POZOR na mez spolehlivosti: tohle běží jen dokud žije JS kontext
// stránky/PWA na pozadí (přepnutá appka, chvíli zamčená obrazovka).
// Appka nemá vlastní push server (viz api/ v CLAUDE.md), takže po
// úplném zavření PWA z multitaskingu nebo po delším zhasnutí displeje
// se naplánovaný timeout nespustí a notifikace nepřijde — na to by byl
// potřeba vlastní push backend, o řád větší práce.
// ==========================================

const hasNotificationSupport = (): boolean => typeof window !== 'undefined' && 'Notification' in window

/** Appka už má svolení a smí notifikaci rovnou zobrazit. */
export const notificationsEnabled = (): boolean =>
  hasNotificationSupport() && Notification.permission === 'granted'

/**
 * Vyžádá svolení k notifikacím — jen pokud o něm appka ještě nerozhodla
 * (jinak by prohlížeč dialog znovu nenabídl a volání by bylo zbytečné).
 * Volá se ze `start()` v usePomodoro.ts, tedy synchronně uvnitř kliknutí
 * na Start — mimo gesto uživatele by prohlížeč dialog odmítl zobrazit.
 */
export const requestNotificationPermission = (): void => {
  if (!hasNotificationSupport() || Notification.permission !== 'default') return
  void Notification.requestPermission().catch(() => {
    // Dialog uživatel zavřel/prohlížeč ho nepodporuje — notifikace prostě nepůjdou.
  })
}

/**
 * Zobrazí notifikaci o dokončení bloku. Přes registraci service workeru,
 * pokud existuje — u nainstalované PWA na Androidu je to jediný funkční
 * způsob, `new Notification()` tam rovnou hodí chybu. Bez service workeru
 * (např. ve vývoji) spadne zpátky na přímý konstruktor.
 */
export const showCompletionNotification = async (title: string, body: string): Promise<void> => {
  if (!notificationsEnabled()) return

  try {
    const reg = getServiceWorkerRegistration()
    if (reg) {
      await reg.showNotification(title, { body, icon: '/icons/icon-192.png', tag: 'pomodoro' })
    } else {
      new Notification(title, { body })
    }
  } catch {
    // Notifikace je bonus, ne podmínka pro dokončení bloku — selhání appku nesmí shodit.
  }
}
