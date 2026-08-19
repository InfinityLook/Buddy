# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

SchoolBuddy ("Buddy") is a Czech-language, offline-first PWA study companion for students. It is client-side first: "login" is still a local flag in `localStorage`, and **all** user data lives in the browser via Zustand-persisted state, which stays the source of truth. Since v1.7 there is one optional exception — gamification and two profile fields are additionally mirrored to Supabase (see **Cloud sync** below). Everything else — apps, all miniapp content, file blobs — is browser-only, and the app runs completely without the cloud. All UI copy and code comments are written in Czech; keep new strings/comments in Czech to stay consistent with the rest of the codebase.

## Commands

There is no lint or test setup in this repo (no ESLint/Prettier config, no test framework). There *is* a standalone typecheck: `tsconfig.json` exists purely for `tsc --noEmit` (`noEmit`, strict, `noUnusedLocals`/`noUnusedParameters`); the actual transpile is still done by Vite/esbuild. Its `paths` mirror `resolve.alias` in `vite.config.ts` and must stay in sync.

```bash
npm install       # install dependencies
npm run dev        # start Vite dev server on port 5173
npm run build       # production build (outputs to dist/)
npm run preview     # preview the production build locally
npm run typecheck   # tsc --noEmit — the only automated check in the repo
```

Run `npm run typecheck` before considering a change done — it is the only automated gate here. Since there's no test runner, also verify behaviour by running `npm run dev` and exercising the affected route/miniapp manually (or use the `run` skill to launch and screenshot the app).

## Architecture

### Routing & auth gate

`src/App.tsx` is the single `BrowserRouter` with five routes: `/` (Login), `/hub`, `/apps`, `/profil`, `/odmeny` (Rewards — level, streak and the full badge list; `src/pages/reward/`). Every route except `/` redirects to `/` unless `useAuthStore().isAuthed` is true — there's no route-level guard component, the check is inlined per-`<Route>`. PWA update registration (`setupPWAUpdates`) is kicked off once from `App.tsx`'s `useEffect`.

### State: Zustand + encrypted localStorage

All persistent state uses Zustand's `persist` middleware backed by a **custom storage adapter**, `secureStorage` (`src/core/utils/secureStorage.ts`), which XORs values against a hardcoded key before base64-encoding them. This is obfuscation, not real encryption — don't treat it as a security boundary, and don't add secrets to persisted stores.

Stores live in `src/core/store/` (app-wide: `useAppStore`, `useAuthStore`, `useGamificationStore`) and additionally inside individual miniapp folders for feature-local state (e.g. `src/miniapps/pomodoro/usePomodoro.ts` has its own tiny persisted store for session stats, separate from the timer's transient React state). Follow this pattern: app-wide/cross-feature state goes in `core/store`, miniapp-local state stays colocated with the miniapp.

When persisted data can come from an external/untrusted source (e.g. JSON import), validate it with a `valibot` schema before committing to the store — see `core/utils/validation.ts` (`validateAppsData`), `gamificationValidation.ts`, `profileValidation.ts` and `backupValidation.ts`. The `persist` `migrate`/`merge` callbacks re-validate and fall back to defaults on corruption rather than trusting stored data blindly.

### Miniapps — the core feature unit

Each miniapp under `src/miniapps/<name>/` is self-contained: `<Name>.tsx` (component, named export), `use<Name>.ts` (hook holding logic, and its own Zustand store if it needs persistence), `types.ts`, `<Name>.css`. Look at `src/miniapps/pomodoro/` as the reference shape for a new miniapp.

Two places wire a miniapp into the app, and **both must be updated when adding one**:
1. `src/core/store/useAppStore.ts` — `DEFAULT_APPS` entry (id, title, category, icon, color) controls whether/how the app card shows up in `/apps`.
2. `src/features/miniapps/registry.ts` — `MINI_APP_REGISTRY` maps the same id to a `React.lazy()` import. Miniapps use named exports, so each lazy import is adapted with `.then((m) => ({ default: m.X }))` — `React.lazy` requires a default export.

`src/pages/app/AppModule.tsx` renders the grid of `AppCard`s from `useAppStore`, and when an app is selected, looks it up in `MINI_APP_REGISTRY` and renders it inside `<ErrorBoundary><Suspense>...</Suspense></ErrorBoundary>` (fallback UI at `src/components/ErrorBoundary.tsx`).

Other pages deep-link into a miniapp by setting `useAppStore().setActiveAppId(id)` before navigating to `/apps` (`AppModule` picks the id up from the store) — that's how the Hub's daily-challenge banner opens Study Planner. To land on the grid pre-filtered to a category instead, navigate to `/apps?kategorie=<Category>`; `AppModule` seeds its `activeCategory` state from that param on mount only, so it stays a starting point the user can then change.

### Gamification

`useGamificationStore` (`src/core/store/useGamificationStore.ts`) tracks XP, level, streak days, badges and per-activity `counters` independently of any single miniapp. `recordActivity()` (called e.g. from `Hub.tsx` on mount) updates the streak and can unlock streak-based badges; `addXp()` recomputes level via `getLevelFromXp` and can unlock XP/level-based badges.

**Miniapps should award XP via `recordAction(kind, xp)`, not bare `addXp()`.** It bumps the matching counter, adds the XP and checks the count-based badge in `COUNT_BADGES` in one step, so the counter and the XP can never drift apart. `ActivityKind` lists the recognised kinds.

Badge unlock conditions are hand-checked per action rather than declaratively — when adding a new badge, follow the existing pattern of checking-and-updating inline in the store action, using `core/utils/gamificationUtils.ts` for the level/streak math. New badges must be appended to `DEFAULT_BADGES`; the store's `merge` reconciles saved badges against that list on every load, so existing users pick up new badges without losing their unlock dates. Anything added to the persisted shape has to be **optional** in `core/utils/gamificationValidation.ts`, or older saved states fail validation and the user's progress is reset.

### PWA / offline

`vite-plugin-pwa` is configured in `vite.config.ts` (manifest, Workbox precache globs, dev-mode SW enabled), with `registerType: 'autoUpdate'` — so the generated `sw.js` calls `skipWaiting()`/`clientsClaim()` and `virtual:pwa-register` reloads the page once a new SW activates. `src/components/NetworkStatusBanner.tsx` + `core/hooks/useOnlineStatus.ts` show a fixed banner when `navigator.onLine` is false.

#### Versioning

`public/version.json` holds the single hand-maintained version number (`package.json`'s version is unrelated). At build time `vite.config.ts` reads it and derives a **build ID** (`<version>-<base36 timestamp>`) that changes on *every* build, so a deploy propagates to clients even when nobody bumped the version. Both values are injected in three places that must stay in sync:

- `__APP_VERSION__` / `__APP_BUILD_ID__` — `define`d into the bundle (typed in `src/vite-env.d.ts`, re-exported from `core/utils/registerSW.ts`).
- `<meta name="app-version">` / `<meta name="app-build-id">` in `index.html` — substituted by the `schoolbuddy-version-meta` plugin, so the *served HTML* carries the version of the build it came from.
- `dist/version.json` — rewritten by the `schoolbuddy-version-manifest` plugin in `closeBundle` (i.e. after Vite copies `public/`), gaining `buildId` and `buildTime`.

In dev the build ID is deliberately set equal to the plain version, and `public/version.json` has no `buildId`, so the comparison always matches and nothing reload-loops while you work.

#### Two update mechanisms

1. **Service worker (the graceful path).** `core/utils/registerSW.ts` (`setupPWAUpdates`, called once from `App.tsx`) is the *only* place that registers the SW — `main.tsx` must not register it too, or two Workbox instances race each other's reload. Beyond registering, it calls `registration.update()` every 5 minutes **and on every resume signal** (`visibilitychange`, `focus`, `online`, `pageshow` with `persisted`). Those resume triggers are the important part: a PWA launched from a phone's home screen is usually just woken from the background and never reloads on its own, which is why update-on-boot alone left users on a stale build for days. Before each `update()` it re-fetches `swUrl` with `cache: 'no-store'` to defeat the browser's 24h HTTP cache on `sw.js`, and nudges any SW stuck in `waiting` with a `SKIP_WAITING` message.
2. **`public/js/auto-update.js` (the watchdog).** A plain non-bundled IIFE loaded from `index.html` via an absolute `/js/...` path (a relative one would resolve to `/apps/js/...` and 404 on deep routes). It compares the `app-build-id` meta of the *currently served HTML* against a live no-store fetch of `/version.json` — comparing served-vs-server is what makes it able to detect "this client is stale", which the previous server-vs-server version could not do. On a mismatch it gives the SW `SW_GRACE_MS` to update gracefully, then falls back to unregistering the SW, deleting all Cache Storage, and `location.replace()`. A `sessionStorage` attempt counter caps this at `MAX_ATTEMPTS` reloads per version so a deploy race can't wedge the app in a reload loop, and it no-ops on localhost, offline, and while hidden. It is deliberately kept out of precache (`globIgnores`) so a stale copy can never be the thing that's broken.

`core/utils/registerSW.ts` also exports `hasNewerVersion()` / `applyUpdateNow()` / `checkForUpdates()`, used by the "Verze aplikace" row in `pages/profil/ProfilModule.tsx` as a manual escape hatch.

Practical consequences: keep `json` out of the Workbox `globPatterns` and keep the `NetworkOnly` runtime-caching route for `/version.json` — precaching it would freeze the version and silently disable both mechanisms. `vercel.json` sets `no-cache`/`no-store` headers on `sw.js`, `index.html`, `version.json`, `manifest.webmanifest` and `js/auto-update.js` while marking hashed `/assets/*` immutable; without those headers the CDN can serve a stale `sw.js` and no amount of client-side checking helps. Both `version.json` and `js/auto-update.js` must live in `public/` — anything outside it isn't copied to `dist/`.

### Cloud sync (Supabase, optional)

`src/core/supabase/` mirrors gamification (XP, level, streak, badges, activity counters) plus the profile's `name`/`motto` to a Supabase project. It is **strictly additive**: `client.ts` exports `isSupabaseConfigured`, and when `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are missing the client is `null`, `startCloudSync()` returns immediately and the app behaves exactly as before. Never make a code path depend on the cloud being reachable — offline is the normal case, not the error case.

Identity comes from **anonymous auth** (`supabase.auth.signInAnonymously()`), started invisibly from `startCloudSync()` — the login screen is untouched. Each device therefore gets its own `auth.uid()`, and every table is locked to its owner by RLS. When a real login is built later, anonymous users can be upgraded to permanent accounts without losing rows.

The merge rule is **"higher wins"** (`merge.ts`, pure and unit-testable): max XP, max streak, max per-counter, union of badges keeping the earliest unlock date, level recomputed from the merged XP. This mirrors the decision already encoded in `BACKUP_STORES` — gamification is `restorable: false` because earned progress must never go backwards. Because of it, sync needs no clock comparison and is idempotent.

`cloudSync.ts` owns the wiring: an initial `syncNow()` (sign in → fetch → merge → write back locally → push), then debounced pushes on any store change, plus a resync on `visibilitychange`/`online` and a flush on `pagehide`. Sync status is exposed through `useCloudStatus` and shown as a row in `pages/profil`.

Schema lives in the `SChoolBuddy-System` Supabase project: `profiles` (one row per user, FK to `auth.users`), `user_badges`, `activity_counters`. Adding a synced field means touching the SQL, `CloudSnapshot` in `types.ts`, and `mergeSnapshots` together. Avatars are deliberately not synced — they are data URIs and belong in Storage, not a text column.

### Backup & restore

`core/utils/backup.ts` is the only way a user can get their data off a device — there is no backend. `BACKUP_STORES` is a hand-maintained catalogue of every persisted key; `collectFullBackup()` reads them into one versioned envelope (`format`/`version`/`createdAt`/`appVersion`/`data`) and `restoreFullBackup()` writes them back, recognising the pre-catalogue `{ apps: [...] }` format so older backups keep working. `backupValidation.ts` validates only the envelope — each store re-validates its own contents on rehydrate.

**Adding a miniapp with a persisted store means adding its key to `BACKUP_STORES`.** Miss it and the miniapp's data silently drops out of every backup. The auth store is deliberately excluded (restoring data shouldn't log anyone in or out). After a restore the app reloads, because the Zustand stores are already hydrated in memory and would not notice the new values on their own.

### File storage

File Manager keeps file *contents* in IndexedDB via `core/utils/fileStorage.ts` (`putFileBlob`/`getFileBlob`/`deleteFileBlob`/`listStoredFileIds`), not in `localStorage` — the 5 MB text-only limit there can't hold real files. Only the metadata (name, byte size, type, date) lives in the Zustand store. Consequently blobs are **not** in the JSON backup: after restoring on another device the entries exist but the content doesn't, and the UI says so instead of offering a broken download.

### Path alias

`@/*` resolves to `src/*`, configured in **two places that must stay in sync**: `resolve.alias` in `vite.config.ts` (used at build time) and `paths` in `tsconfig.json` (used by `npm run typecheck`). Use `@/...` imports for anything outside a feature's own folder; use relative imports within a miniapp/page's own directory.

### Directory map

- `src/core/` — cross-app state (`store/`), hooks, utils, types. Shared infrastructure only.
- `src/pages/` — route-level screens (`login/`, `hub/`, `app/`, `profil/`, `reward/`), each with its own `components/` subfolder and a single hand-written `.css` file (no CSS modules/CSS-in-JS).
- `src/miniapps/` — the individual study tools (see above).
- `src/features/miniapps/registry.ts` — the lazy-loading wiring between `pages/app` and `miniapps/`.
- `src/components/` — small app-wide shared components (`ErrorBoundary`, `NetworkStatusBanner`).
- `src/styles/global.css` — global styles, imported once from `main.tsx`.
- `tsconfig.json` — typecheck-only config for `npm run typecheck`; Vite never reads it for the build.
- `vercel.json` — cache headers for the update pipeline plus the SPA fallback rewrite (Vercel checks the filesystem before rewrites, so real files still win).
