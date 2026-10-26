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
          name: 'Buddy',
          short_name: 'Buddy',
          description: 'Tvůj parťák pro práci, studium i volný čas.',
          theme_color: '#0a0e1a',
          background_color: '#0a0e1a',
          display: 'standalone',
          // Ne 'portrait' — nainstalovaná appka (na rozdíl od pouhé
          // otevřené záložky v prohlížeči, která manifest ignoruje a řídí
          // se jen fyzickým natočením telefonu) by s pevným 'portrait'
          // zůstala uzamčená na výšku navždy, i kdyby appka sama volala
          // screen.orientation.lock('landscape') (viz GamesHubModule.tsx/
          // Ovladac.tsx) — manifest vyhrává nad JS. 'any' nechá appku
          // otáčet se s telefonem stejně, jako to dělá běžná webová
          // stránka, a appčiny vlastní @media (orientation: portrait)
          // "otoč telefon" výzvy (BuddyZone, Souboj) pak fungují správně
          // i po instalaci.
          orientation: 'any',
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
          //
          // souboj/postavy/** (Grafika — Kenney "Toon Characters" sprity
          // pro čtyři bojovníky Souboje, viz PostavaGrafika.tsx, ~300 kB)
          // je z instalační precache vyloučené stejným důvodem — jsou to
          // .png, na rozdíl od RPG portrétů (.jpg, mimo globPatterns úplně
          // samo od sebe) by se jinak do precache dostaly automaticky.
          //
          // survival/** (Grafika — Kenney sprity pro Survival Night's
          // hráče/8 monster/bosse, viz useSurvivalScene.ts, ~30 kB) ze
          // stejného důvodu — /hra/survival-night otevře jen část hráčů.
          //
          // deskova-hra/trh-*.png (textury Buddyho Trhu vyříznuté ze
          // skutečné fotky desky, co appce poslal uživatel — viz
          // useTrhScene.ts, ~1.1 MB) ze stejného důvodu jako výš —
          // /hra/trh otevře jen část hráčů appky. Zbytek deskova-hra/
          // (Čtyři království, pár kB) zůstává v běžné precache, protože
          // je zanedbatelně malý.
          //
          // buddyworld/artpack-v46/painted-materials.png (malovaný
          // textury atlas pro appčin Frontier — viz frontier/art46.ts,
          // ~3,2 MB) musí z precache ven ze dvou důvodů najednou: je to
          // .png (na rozdíl od .glb appka v globPatterns vůbec nemá), a
          // appčin výchozí limit workboxu je stejně jen 2 MiB o kus níž
          // zvednutý appkou na 3 MiB, což 3,22 MB souboru ani tak
          // nestačí. Runtime caching pravidlo níž ho dostane do appčiny
          // cache, jen jakmile ho appka doopravdy potřebuje.
          //
          // buddy-themes/** (Buddy v2 per-obrazovkové motivy, viz
          // CLAUDE.md "Vzhled aplikace" — 5 motivů × 72 obrazovek plus
          // odznaky, ~37 MB/4266 souborů dnes) stejným důvodem jako
          // mediapipe/mapa-sveta/postavy výš: drtivá většina souborů
          // patří motivům a obrazovkám, co uživatel vůbec neotevře
          // (appka zatím zapojila jen Profil a Achievementy — viz
          // appčin komentář u wiredSurfaceIds v
          // VzhledARamecekSekce.tsx), takže by appka všem instalujícím
          // stahovala desítky MB grafiky, co 99 % z nich nikdy neuvidí.
          globIgnores: [
            '**/js/auto-update.js',
            '**/mediapipe/**',
            '**/push-sw.js',
            '**/souboj/postavy/**',
            '**/survival/**',
            '**/deskova-hra/trh-*',
            '**/buddyworld/artpack-v46/**',
            '**/buddy-themes/**',
          ],
          navigateFallbackDenylist: [/^\/api\//, /^\/version\.json$/, /^\/js\//],
          // Precache staré verze se po aktivaci nového SW smaže,
          // takže se v prohlížeči nehromadí zastaralé soubory.
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          // generateSW nedovolí vlastní event listener napsat přímo —
          // tohle je jediná cesta, jak dostat push-sw.js's `push`/
          // `notificationclick` handlery do vygenerovaného sw.js.
          importScripts: ['/push-sw.js'],
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
            },
            // Grafika — Buddy v2 per-obrazovkové motivy (public/buddy-themes/**,
            // viz CLAUDE.md "Vzhled aplikace"), vyloučená z instalační
            // precache výš (globIgnores) stejným důvodem jako mediapipe
            // výš, jen appka tu na rozdíl od miniaplikačních assetů
            // nemůže omezit pravidlo na jednu konkrétní cestu/route —
            // motivy appka postupně zapojuje obrazovku po obrazovce
            // (zatím Profil a Achievementy), ne appku jako celek
            // najednou, takže tohle pravidlo chytá celou /buddy-themes/
            // větev bez ohledu na to, která konkrétní obrazovka si
            // zrovna svůj obrázek/ikonu/odznak natahuje. maxEntries 500
            // dává appce rezervu nad reálnou dnešní potřebou (2 zapojené
            // obrazovky × 5 motivů × pár souborů + 47 odznaků × 5 motivů
            // ≈ 350) — appka ho bude muset zvednout, až přibydou další
            // zapojené obrazovky z appčina staženého plánu.
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/buddy-themes/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'buddy-themes-runtime',
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            // Mapa světa (~400 kB) stejným důvodem jako mediapipe výš:
            // stáhne se jen tomu, kdo doopravdy otevře /hra, ne každému
            // při instalaci PWA. .jpg navíc není v globPatterns vůbec,
            // takže by se do precache nedostala ani omylem.
            {
              urlPattern: ({ url }) => url.pathname === '/backgrounds/mapa-sveta.jpg',
              handler: 'CacheFirst',
              options: {
                cacheName: 'mapa-sveta-runtime',
                expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            // Portréty hrdinů (public/postavy/*.jpg, ~310 kB za všech
            // pět) stejným důvodem jako mapa výš — /hra otevře jen část
            // uživatelů, takže portréty nepatří do instalační precache.
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/postavy/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'postavy-runtime',
                expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            // Grafika — Souboj bojovníků (public/souboj/postavy/**),
            // stejným důvodem jako mediapipe/mapa-sveta/postavy výš:
            // /hra/souboj otevře jen část uživatelů appky.
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/souboj/postavy/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'souboj-postavy-runtime',
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            // Grafika — Survival Night's hráč/8 monster/boss (public/survival/**),
            // stejným důvodem jako mediapipe/mapa-sveta/postavy/souboj-postavy výš:
            // /hra/survival-night otevře jen část hráčů appky.
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/survival/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'survival-runtime',
                expiration: { maxEntries: 15, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            // Textury Buddyho Trhu (public/deskova-hra/trh-*.png), stejným
            // důvodem jako výš: /hra/trh otevře jen část hráčů appky.
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/deskova-hra/trh-'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'trh-textury-runtime',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            // Grafika — Buddy World (public/buddyworld/maskoti|nepratele|
            // prostredi|mestecko|artpack-v1/**.glb, 34 souborů dnes
            // nakopírovaných), stejným důvodem jako výš: /buddy-world
            // otevře jen část uživatelů appky. .glb navíc v globPatterns
            // vůbec není (jen js,css,html,png,svg,ico,woff2), takže by
            // se do instalační precache nedostalo ani omylem — žádný
            // globIgnores zápis proto není potřeba, jen tohle runtime
            // caching pravidlo. maxEntries 50 dává appce rezervu nad
            // dnešních 34 souborů pro další appčiny modely bez potřeby
            // znovu zvedat limit. Koncept-art SVG (public/buddyworld/
            // koncept/**, artpack-v47/**) tímhle pravidlem úmyslně
            // NEprochází — jsou malé a zůstávají v běžné instalační
            // precache (.svg v globPatterns je).
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/buddyworld/') && url.pathname.endsWith('.glb'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'buddyworld-runtime',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            // Malovaný textury atlas appčina Frontieru (public/buddyworld/
            // artpack-v46/painted-materials.png, ~3,2 MB) — vyloučený z
            // instalační precache výš (globIgnores), appka ho sem dostane
            // teprve při prvním otevření appčina Frontieru a od té chvíle
            // jede z cache, přesně jako appčiny ostatní velké herní assety.
            {
              urlPattern: ({ url }) => url.pathname === '/buddyworld/artpack-v46/painted-materials.png',
              handler: 'CacheFirst',
              options: {
                cacheName: 'buddyworld-art46-runtime',
                expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            // Mapové dlaždice OpenStreetMap pro Běhání/Kardio (src/miniapps/
            // behani/TrasaMapa.tsx) — cizí origin, ne tento web, proto url.
            // hostname místo pathname jako u ostatních pravidel výš. Server
            // dlaždic nevrací CORS hlavičky, takže odpověď je "opaque"
            // (status 0) — bez cacheableResponse by je Workbox mlčky
            // přeskočil, tile server by se tak volal znovu při každém
            // otevření appky místo jednou.
            {
              urlPattern: ({ url }) => url.hostname === 'tile.openstreetmap.org',
              handler: 'CacheFirst',
              options: {
                cacheName: 'osm-dlazdice-runtime',
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] }
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
