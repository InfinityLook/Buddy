# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

SchoolBuddy ("Buddy") is a Czech-language, offline-first PWA study companion for students. It's a pure client-side app — **no backend, no API calls, no auth server**. "Login" is a local flag in `localStorage`, and all user data (apps, gamification, per-miniapp content) lives in the browser via Zustand-persisted state. All UI copy and code comments are written in Czech; keep new strings/comments in Czech to stay consistent with the rest of the codebase.

## Commands

There is no lint or test setup in this repo (no ESLint/Prettier config, no test framework, no `tsconfig.json`). TypeScript is compiled/transpiled implicitly by Vite/esbuild during dev and build — there is no standalone typecheck step.

```bash
npm install       # install dependencies
npm run dev        # start Vite dev server on port 5173
npm run build       # production build (outputs to dist/)
npm run preview     # preview the production build locally
```

Since there's no test runner, verify changes by running `npm run dev` and exercising the affected route/miniapp manually (or use the `run` skill to launch and screenshot the app).

## Architecture

### Routing & auth gate

`src/App.tsx` is the single `BrowserRouter` with four routes: `/` (Login), `/hub`, `/apps`, `/profil`. Every route except `/` redirects to `/` unless `useAuthStore().isAuthed` is true — there's no route-level guard component, the check is inlined per-`<Route>`. PWA update registration (`setupPWAUpdates`) is kicked off once from `App.tsx`'s `useEffect`.

### State: Zustand + encrypted localStorage

All persistent state uses Zustand's `persist` middleware backed by a **custom storage adapter**, `secureStorage` (`src/core/utils/secureStorage.ts`), which XORs values against a hardcoded key before base64-encoding them. This is obfuscation, not real encryption — don't treat it as a security boundary, and don't add secrets to persisted stores.

Stores live in `src/core/store/` (app-wide: `useAppStore`, `useAuthStore`, `useGamificationStore`) and additionally inside individual miniapp folders for feature-local state (e.g. `src/miniapps/pomodoro/usePomodoro.ts` has its own tiny persisted store for session stats, separate from the timer's transient React state). Follow this pattern: app-wide/cross-feature state goes in `core/store`, miniapp-local state stays colocated with the miniapp.

When persisted data can come from an external/untrusted source (e.g. JSON import), validate it with a `valibot` schema before committing to the store — see `core/utils/validation.ts` (`validateAppsData`) and how `useAppStore.importState` / the `persist` `migrate` callback both re-validate and fall back to defaults on corruption, rather than trusting stored/imported data blindly.

### Miniapps — the core feature unit

Each miniapp under `src/miniapps/<name>/` is self-contained: `<Name>.tsx` (component, named export), `use<Name>.ts` (hook holding logic, and its own Zustand store if it needs persistence), `types.ts`, `<Name>.css`. Look at `src/miniapps/pomodoro/` as the reference shape for a new miniapp.

Two places wire a miniapp into the app, and **both must be updated when adding one**:
1. `src/core/store/useAppStore.ts` — `DEFAULT_APPS` entry (id, title, category, icon, color) controls whether/how the app card shows up in `/apps`.
2. `src/features/miniapps/registry.ts` — `MINI_APP_REGISTRY` maps the same id to a `React.lazy()` import. Miniapps use named exports, so each lazy import is adapted with `.then((m) => ({ default: m.X }))` — `React.lazy` requires a default export.

`src/pages/app/AppModule.tsx` renders the grid of `AppCard`s from `useAppStore`, and when an app is selected, looks it up in `MINI_APP_REGISTRY` and renders it inside `<ErrorBoundary><Suspense>...</Suspense></ErrorBoundary>` (fallback UI at `src/components/ErrorBoundary.tsx`).

**Note:** `src/miniapps/index.ts` (`MINI_APPS`, eagerly imported) is a second, separate registry keyed the same way as `MINI_APP_REGISTRY` but not referenced by `AppModule` or anything else — it appears to be superseded/dead code. Don't add new miniapps there; use `features/miniapps/registry.ts` instead. If touching miniapp registration, it's worth flagging/removing this stale file rather than propagating it.

### Gamification

`useGamificationStore` (`src/core/store/useGamificationStore.ts`) tracks XP, level, streak days, and badges independently of any single miniapp. `recordActivity()` (called e.g. from `Hub.tsx` on mount) updates the streak and can unlock streak-based badges; `addXp()` recomputes level via `getLevelFromXp` and can unlock XP-based badges. Badge unlock conditions are hand-checked per action rather than declaratively — when adding a new badge, follow the existing pattern of checking-and-updating inline in the store action, using `core/utils/gamificationUtils.ts` for the level/streak math.

### PWA / offline

`vite-plugin-pwa` is configured in `vite.config.ts` (manifest, Workbox precache globs, dev-mode SW enabled). `src/main.tsx` calls `registerSW({ immediate: true })` from `virtual:pwa-register` on boot; `core/utils/registerSW.ts` (`setupPWAUpdates`) additionally wires an `onNeedRefresh`/`onOfflineReady` flow (default behavior: `confirm()` + reload) invoked from `App.tsx`. `src/components/NetworkStatusBanner.tsx` + `core/hooks/useOnlineStatus.ts` show a fixed banner when `navigator.onLine` is false. `index.html` also loads a separate `js/auto-update.js` script tag ahead of the app bundle — check it before assuming service-worker update logic lives only in `registerSW.ts`.

### Path alias

`@/*` resolves to `src/*` (configured in `vite.config.ts`'s `resolve.alias`, no `tsconfig.json` paths mirror needed since there's no separate typecheck step). Use `@/...` imports for anything outside a feature's own folder; use relative imports within a miniapp/page's own directory.

### Directory map

- `src/core/` — cross-app state (`store/`), hooks, utils, types. Shared infrastructure only.
- `src/pages/` — route-level screens (`login/`, `hub/`, `app/`, `profil/`), each with its own `components/` subfolder and a single hand-written `.css` file (no CSS modules/CSS-in-JS).
- `src/miniapps/` — the individual study tools (see above).
- `src/features/miniapps/registry.ts` — the lazy-loading wiring between `pages/app` and `miniapps/`.
- `src/components/` — small app-wide shared components (`ErrorBoundary`, `NetworkStatusBanner`).
- `src/styles/global.css` — global styles, imported once from `main.tsx`.
