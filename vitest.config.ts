import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ==========================================
// Konfigurace pro Vitest — samostatná od vite.config.ts, protože ta
// řeší i produkční build (verzování, PWA plugin), který testy vůbec
// nepotřebují. Alias @/* se ale musí držet ve shodě se třemi ostatními
// místy (vite.config.ts, tsconfig.json) — stejná dvoumístní... teď
// čtyřmístní vazba, co dokumentuje CLAUDE.md u @/* aliasu.
// ==========================================

export default defineConfig({
  // Audit #5 — vite.config.ts appce definuje __APP_VERSION__/__APP_BUILD_ID__
  // (čte je z public/version.json pro skutečný build), ale vitest.config.ts
  // je záměrně samostatná, minimální konfigurace bez téhle logiky. Testy,
  // co volají core/utils/backup.ts's own collectFullBackup() (čte
  // __APP_VERSION__ přímo), bez téhle definice spadnou na "ReferenceError:
  // __APP_VERSION__ is not defined" — appka tu hodnotu v testech nikdy
  // nepotřebuje skutečnou, jen aby vůbec existovala.
  define: {
    __APP_VERSION__: JSON.stringify('test'),
    __APP_BUILD_ID__: JSON.stringify('test'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/components/**/*.test.tsx'],
    // e2e/ a security/ běží přes @playwright/test, ne přes Vitest —
    // vlastní test runner, vlastní config (playwright.config.ts).
    exclude: ['tests/e2e/**', 'tests/security/**', 'node_modules/**'],
  },
})
