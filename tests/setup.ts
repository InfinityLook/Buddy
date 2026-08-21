import '@testing-library/jest-dom/vitest'

// Pevná časová zóna pro celý testovací běh — několik testů (streak,
// finance period filtry) staví data z `new Date('...')` bez zóny,
// což se parsuje jako místní čas. Bez tohohle by testy procházely na
// tomhle stroji (UTC), ale mohly by selhat na jiném CI běžci s jinou
// výchozí zónou — samo o sobě to je varovný stín stejné třídy chyby,
// jakou core/utils/date.ts řeší uvnitř appky (viz komentář tam).
process.env.TZ = 'UTC'

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
