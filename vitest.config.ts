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
