/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Doplňuje build z public/version.json — viz `define` ve vite.config.ts.
declare const __APP_VERSION__: string
declare const __APP_BUILD_ID__: string
