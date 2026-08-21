import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Verze aplikace má jediný zdroj pravdy — public/version.json.
// Odsud se propíše do bundlu (__APP_VERSION__) i do <meta> v index.html,
// takže běžící klient sám pozná, že mu server servíruje novější build.
const readAppVersion = (): string => {
  try {
    const raw = fs.readFileSync(path.resolve(__dirname, 'public/version.json'), 'utf-8')
    return (JSON.parse(raw) as { version?: string }).version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const APP_VERSION = readAppVersion()

// Build ID se mění při KAŽDÉM buildu, i když se zapomene zvednout verze.
// Díky tomu se klientům novinky propíšou i bez ručního bumpu version.json.
const BUILD_ID = `${APP_VERSION}-${Date.now().toString(36)}`

/**
 * Nahradí zástupné tokeny v index.html skutečnou verzí a build ID.
 * Běží jako `pre`, aby se stihl uplatnit dřív než interní HTML pluginy Vite.
 */
const injectVersionMeta = (isBuild: boolean): Plugin => ({
  name: 'schoolbuddy-version-meta',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) =>
      html
        .replace(/__APP_VERSION__/g, APP_VERSION)
        // Ve vývoji se build ID nesmí lišit od version.json, jinak by
        // hlídač aktualizací neustále dokola obnovoval stránku.
        .replace(/__APP_BUILD_ID__/g, isBuild ? BUILD_ID : APP_VERSION)
  }
})

/**
 * Po dokončení buildu přepíše dist/version.json o build ID a čas buildu.
 * `closeBundle` běží až po zkopírování public/, takže se zápis neztratí.
 */
const emitVersionManifest = (outDir: string): Plugin => ({
  name: 'schoolbuddy-version-manifest',
  apply: 'build',
  closeBundle() {
    const target = path.resolve(__dirname, outDir, 'version.json')
    const payload = {
      version: APP_VERSION,
      buildId: BUILD_ID,
      buildTime: new Date().toISOString()
    }
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
  }
})

export default defineConfig(({ command }) => {
  const isBuild = command === 'build'

  return {
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
      __APP_BUILD_ID__: JSON.stringify(isBuild ? BUILD_ID : APP_VERSION)
    },
    plugins: [
      react(),
      injectVersionMeta(isBuild),
      emitVersionManifest('dist'),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'SchoolBuddy',
          short_name: 'SchoolBuddy',
          description: 'Tvůj studijní parťák, který ti pomůže zvládnout školu.',
          theme_color: '#0a0e1a',
          background_color: '#0a0e1a',
          display: 'standalone',
          orientation: 'portrait',
          // Explicitní `id` drží identitu nainstalované aplikace stabilní.
          // Odpovídá výchozí hodnotě odvozené ze start_url, takže se z toho
          // na ploše telefonu nestane druhá, nová ikona.
          id: '/',
          start_url: '/',
          scope: '/',
          lang: 'cs',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'icons/icon-maskable-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: 'icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
          // Záchranný skript musí být vždy čerstvý ze sítě — kdyby se
          // zaprecachoval, zůstal by na telefonu navěky ve staré podobě
          // a nemohl by rozseknout zaseknutý service worker.
          //
          // mediapipe/** (WASM běhové prostředí a model pro Form Check,
          // ~40 MB) je z precache vyloučené schválně — nikdo, kdo tuhle
          // miniaplikaci nikdy neotevře, ho nesmí stáhnout při instalaci
          // PWA. Runtime caching pravidlo níž ho místo toho uloží při
          // prvním otevření Form Checku a od té chvíle jede z cache.
          globIgnores: ['**/js/auto-update.js', '**/mediapipe/**'],
          navigateFallbackDenylist: [/^\/api\//, /^\/version\.json$/, /^\/js\//],
          // Precache staré verze se po aktivaci nového SW smaže,
          // takže se v prohlížeči nehromadí zastaralé soubory.
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            // version.json se nesmí nikdy dostat do cache, jinak by
            // kontrola verzí navždy hlásila tu starou.
            {
              urlPattern: ({ url }) => url.pathname === '/version.json',
              handler: 'NetworkOnly'
            },
            // WASM a model Form Checku: stáhne se jen tomu, kdo miniaplikaci
            // doopravdy otevře, a pak zůstává v cache napořád — soubory
            // nemají v názvu hash, takže při jejich změně je potřeba
            // přejmenovat (stejně jako u ostatních necachovaných assetů).
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/mediapipe/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'mediapipe-runtime',
                expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            }
          ],
          // Fotka pozadí Hubu má přes 2 MB a výchozí limit Workboxu (2 MiB)
          // by ji z precache vyřadil — build kvůli tomu skončil chybou.
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: 5173
    }
  }
})
