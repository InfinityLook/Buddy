import { getServiceWorkerRegistration } from './registerSW'

// ==========================================
// Systémové notifikace — sdílená vrstva nad Notification API.
//
// Vzniklo pro Pomodoro (upozornění po vypršení bloku, i když uživatel
// mezitím z miniaplikace odešel), Study Planner je druhé použití
// (upozornění na termíny) — proto obecná vrstva tady v core/utils/, ne
// zdvojená ve dvou miniapkách zvlášť (stejné pravidlo jako u ostatního
// sdíleného kódu, viz core/utils/date.ts, core/utils/text.ts).
//
// POZOR na mez spolehlivosti: tohle běží jen dokud žije JS kontext
// stránky/PWA na pozadí (přepnutá appka, chvíli zamčená obrazovka).
// Appka nemá vlastní push server (viz api/ v CLAUDE.md), takže po
// úplném zavření PWA z multitaskingu nebo po delším zhasnutí displeje
// se naplánovaná/kontrolovaná notifikace nezobrazí — na to by byl
// potřeba vlastní push backend, o řád větší práce.
// ==========================================

const hasNotificationSupport = (): boolean => typeof window !== 'undefined' && 'Notification' in window

/** Appka už má svolení a smí notifikaci rovnou zobrazit. */
export const notificationsEnabled = (): boolean =>
  hasNotificationSupport() && Notification.permission === 'granted'

/**
 * Vyžádá svolení k notifikacím — jen pokud o něm appka ještě nerozhodla
 * (jinak by prohlížeč dialog znovu nenabídl a volání by bylo zbytečné).
 * Volat vždycky synchronně uvnitř skutečného gesta uživatele (klik na
 * tlačítko), jinak by prohlížeč dialog odmítl zobrazit.
 */
export const requestNotificationPermission = (): void => {
  if (!hasNotificationSupport() || Notification.permission !== 'default') return
  void Notification.requestPermission().catch(() => {
    // Dialog uživatel zavřel/prohlížeč ho nepodporuje — notifikace prostě nepůjdou.
  })
}

/**
 * Zobrazí notifikaci. Přes registraci service workeru, pokud existuje —
 * u nainstalované PWA na Androidu je to jediný funkční způsob,
 * `new Notification()` tam rovnou hodí chybu. Bez service workeru
 * (např. ve vývoji) spadne zpátky na přímý konstruktor.
 *
 * `tag` odlišuje, odkud notifikace je (Pomodoro/Study Planner…) —
 * druhá notifikace se stejným tagem nahradí tu předchozí místo hromadění.
 */
export const showAppNotification = async (title: string, body: string, tag: string): Promise<void> => {
  if (!notificationsEnabled()) return

  try {
    const reg = getServiceWorkerRegistration()
    if (reg) {
      await reg.showNotification(title, { body, icon: '/icons/icon-192.png', tag })
    } else {
      new Notification(title, { body })
    }
  } catch {
    // Notifikace je bonus, ne podmínka pro to, co ji vyvolalo — selhání appku nesmí shodit.
  }
}
