import '@testing-library/jest-dom/vitest'

// ==========================================
// Globální nastavení pro Vitest (component testy). Unit testy nad
// čistými funkcemi (core/utils/*) tohle nepotřebují vůbec — importují
// se přímo, žádné DOM prostředí.
//
// jsdom nemá matchMedia — appka ho čte na pár místech (prefers-
// -reduced-motion v animacích), bez napodobeniny by test spadl na
// "matchMedia is not a function" už při vykreslení, ne na tom, co se
// doopravdy testuje.
// ==========================================

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
