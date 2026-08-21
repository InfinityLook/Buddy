import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'fs'

// ==========================================
// @playwright/test config pro tests/e2e/ a tests/security/ — dva
// samostatné npm skripty (test:e2e/test:security), stejný config.
//
// Testy jedou proti produkčnímu buildu (`vite preview`), ne proti dev
// serveru — dev server dělá HMR/source maps navíc, které nic nepřidají
// k testu skutečného chování appky, a je pomalejší se zvednout znovu
// a znovu. Server se startuje samotným Playwrightem (webServer) a
// v CI se vždycky zvedá čerstvý, lokálně se dá znovupoužít běžící.
// ==========================================

const PORT = 4173

// Tenhle sandbox má Chromium předinstalovaný na pevné cestě mimo
// standardní umístění, kde ho Playwright hledá samo (viz poznámka
// v systémovém promptu o prostředí) — v běžném CI běžci (GitHub
// Actions) tahle cesta neexistuje a `npx playwright install` si
// stáhne prohlížeč tam, kde ho Playwright normálně čeká. Používá se
// jen když je opravdu k dispozici, ať config funguje na obou místech
// beze změny.
const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium'
const executablePath = existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined

export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts', 'security/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 7'],
        // Sandbox v CI kontejnerech obecně není dostupný — stejná
        // volba jako ve všech ručních Playwright skriptech používaných
        // celou tuhle session.
        launchOptions: { args: ['--no-sandbox'], executablePath },
      },
    },
  ],

  webServer: {
    // Sestavení je záměrně mimo tenhle příkaz (CI ho spouští jako
    // samostatný krok před testy) — `vite preview` čte hotové dist/,
    // build sem zabalený by ho pokaždé dělal znovu i lokálně.
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
