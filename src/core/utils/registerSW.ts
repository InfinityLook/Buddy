import { registerSW } from 'virtual:pwa-register'

/**
 * Verze a build ID naservírovaného bundlu. Doplňuje je build z public/version.json
 * (viz `define` ve vite.config.ts) — ve vývoji se obě rovnají verzi.
 */
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'
export const APP_BUILD_ID: string = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : APP_VERSION

// Nainstalovaná PWA se z plochy telefonu skoro nikdy nenačítá znovu — jen se
// probouzí z pozadí. Kdyby se na aktualizaci ptala pouze při startu (což je
// výchozí chování vite-plugin-pwa), zůstala by na staré verzi klidně týdny.
const CHECK_INTERVAL = 5 * 60 * 1000

let registration: ServiceWorkerRegistration | null = null
let serviceWorkerUrl = ''
let checking = false
let started = false

const hasServiceWorker = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator

/** Aktuální registrace service workeru, pokud už proběhla — používá ji
 *  core/utils/notify.ts pro systémové notifikace (Pomodoro, Study
 *  Planner…) přes ServiceWorkerRegistration.showNotification, na
 *  Androidu jediný funkční způsob u nainstalované PWA. */
export const getServiceWorkerRegistration = (): ServiceWorkerRegistration | null => registration

/**
 * Zeptá se serveru, jestli neexistuje novější service worker.
 *
 * Když ano, nový SW se díky `registerType: 'autoUpdate'` sám aktivuje
 * (skipWaiting + clientsClaim) a vite-plugin-pwa stránku obnoví.
 *
 * @returns true, pokud se kontrolu podařilo provést
 */
export const checkForUpdates = async (): Promise<boolean> => {
  if (!hasServiceWorker() || checking) return false
  // Offline by kontrola jen zbytečně padala na síťové chybě.
  if (navigator.onLine === false) return false

  checking = true
  try {
    const reg = registration ?? (await navigator.serviceWorker.getRegistration()) ?? null
    if (!reg) return false
    registration = reg

    // Nový SW se právě instaluje — do toho nemá smysl sahat.
    if (reg.installing) return false

    // Starší build mohl uvíznout ve stavu "waiting". Pobídneme ho,
    // ať se pustí ke slovu, jinak by na telefonu zůstal navždy.
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })

    if (serviceWorkerUrl) {
      // Prohlížeč si smí sw.js držet v HTTP cache až 24 hodin. Tímhle
      // dotazem mimo cache si vynutíme čerstvou kopii, kterou pak
      // reg.update() porovná — bez toho by aktualizace často „neviděl“.
      const response = await fetch(serviceWorkerUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      if (!response.ok) return false
    }

    await reg.update()
    return true
  } catch (error) {
    console.warn('[update] Kontrola service workeru selhala:', error)
    return false
  } finally {
    checking = false
  }
}

interface ServerVersion {
  version: string
  buildId?: string
}

/**
 * Načte verzi, kterou právě servíruje server. Nikdy nesmí jít z cache,
 * jinak by se odpověď „zamrzla“ na té staré.
 */
export const fetchServerVersion = async (): Promise<ServerVersion | null> => {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
    if (!response.ok) return null
    const data = (await response.json()) as ServerVersion
    return data?.version ? data : null
  } catch {
    return null
  }
}

/** Zjistí, jestli na serveru leží novější build, než jaký běží v prohlížeči. */
export const hasNewerVersion = async (): Promise<boolean> => {
  const server = await fetchServerVersion()
  if (!server) return false
  // Build ID se mění při každém buildu, verze jen když ji někdo zvedne ručně.
  return server.buildId ? server.buildId !== APP_BUILD_ID : server.version !== APP_VERSION
}

/**
 * Tvrdě nasadí novou verzi: zahodí cache se starými soubory, odregistruje
 * service worker a načte aplikaci znovu ze sítě. Data uživatele
 * v localStorage zůstávají nedotčená.
 */
export const applyUpdateNow = async (): Promise<void> => {
  try {
    if (hasServiceWorker()) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((reg) => reg.unregister()))
    }
    if (typeof caches !== 'undefined') {
      const names = await caches.keys()
      await Promise.all(names.map((name) => caches.delete(name)))
    }
  } catch (error) {
    console.warn('[update] Úklid cache se nepovedl, obnovuji i tak:', error)
  }
  window.location.replace(window.location.pathname + window.location.search)
}

/**
 * Naváže kontrolu aktualizací na okamžiky, kdy se uživatel k aplikaci vrací.
 * Pro PWA na ploše telefonu jsou tyhle události důležitější než interval —
 * aplikace se totiž typicky jen odloží a znovu probudí.
 */
const registerResumeTriggers = () => {
  const check = () => {
    void checkForUpdates()
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
  window.addEventListener('focus', check)
  window.addEventListener('online', check)
  // Návrat ze zpětné/bfcache — na iOS takhle standalone PWA ožívá nejčastěji.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) check()
  })
}

/**
 * Zaregistruje service worker a nastartuje hlídání nových verzí.
 * Volá se právě jednou, z App.tsx.
 */
export const setupPWAUpdates = () => {
  if (started || !hasServiceWorker()) return
  started = true

  registerSW({
    immediate: true,
    onRegisteredSW(swUrl, reg) {
      serviceWorkerUrl = swUrl
      registration = reg ?? null
      if (!registration) return

      registerResumeTriggers()
      window.setInterval(() => {
        void checkForUpdates()
      }, CHECK_INTERVAL)
      void checkForUpdates()
    },
    onOfflineReady() {
      console.info('[update] Buddy je připraven k použití offline.')
    },
    onRegisterError(error) {
      console.warn('[update] Service worker se nepodařilo zaregistrovat:', error)
    }
  })
}
