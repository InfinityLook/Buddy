# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

SchoolBuddy ("Buddy") is a Czech-language, offline-first PWA study companion for students. It is client-side first: "login" is still a local flag in `localStorage`, and **all** user data lives in the browser via Zustand-persisted state, which stays the source of truth. Since v1.7 there is one optional exception — gamification and two profile fields are additionally mirrored to Supabase (see **Cloud sync** below). Everything else — apps, all miniapp content, file blobs — is browser-only, and the app runs completely without the cloud. The pieces that structurally cannot work that way live in `api/`, deliberately as small and narrowly-scoped as each requirement demands: `buddy-chat.ts` (see **Buddy voice assistant**), because talking to a real AI needs a backend holding a secret API key, and `admin-ban.ts` (see **Admin panel**), because blocking someone's sign-in isn't something any client-side RLS policy can do. All UI copy and code comments are written in Czech; keep new strings/comments in Czech to stay consistent with the rest of the codebase.

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

`src/App.tsx` is the single `BrowserRouter` with ten routes: `/` (Login), `/hub`, `/apps`, `/profil`, `/odmeny` (Rewards — level, streak and the full badge list; `src/pages/reward/`), `/nastaveni` (`src/pages/setting/`), `/obchod` (Shop; `src/pages/shop/`), `/social` (`src/social/`, `React.lazy` — see **Accounts & Social** below), `/hra` (the 3D game hub; `src/game/`, also `React.lazy` — see **Game hub** below) and `/admin` (Admin panel; `src/pages/admin/`, gated on more than sign-in — see **Admin panel** below). Every route except `/` redirects to `/` unless `useAuthStore().isAuthed` is true — there's no route-level guard component, the check is inlined per-`<Route>`. PWA update registration (`setupPWAUpdates`) is kicked off once from `App.tsx`'s `useEffect`.

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

### Accounts & Social (`src/social/`)

**An account is required for the whole app**, not just Social. `App.tsx` gates every route on `useAccount().status === 'signed-in'` (`core/supabase/auth.ts` mirrors the real Supabase session: `off` / `loading` / `anonymous` / `signed-in`). Social therefore has **no gate of its own** — a second check would state the same rule twice and drift from the first one. This was a deliberate trade: the app is no longer usable without an account, so a new user with no signal cannot get in at all.

While `status === 'loading'` the app renders a placeholder rather than the login screen. Redirecting on `loading` flashes the login at users who do have a valid session and reads as an unexpected logout.

The one exception is `isSupabaseConfigured === false`. There accounts cannot exist at all, so the gate falls back to the local `isAuthed` flag — locking everyone out of a misconfigured build helps nobody and gives the user no way to fix it.

**Nothing creates anonymous sessions any more.** `ensureSession` returns the existing session or `null`; it never calls `signInAnonymously`. With login required, an anonymous account would be created on every start, immediately replaced by the real one, and leave an unreachable empty row behind. Sessions created by older versions are still honoured — `registerAccount` upgrades them via `supabase.auth.updateUser`, so those users keep the XP, streak and badges they earned before registering.

**The account rule is also enforced in the database.** `public.je_skutecny_ucet()` reads `is_anonymous` from the JWT and the INSERT policies on `messages`, `chats` and `friendships` require it. It still matters even though the client no longer creates anonymous sessions: RLS is what holds if someone talks to the API directly.

Signing out must call both `signOut()` and the local `logout()`. Clearing only the local flag leaves the Supabase session in the browser and the user is signed in again after a reload.

**Discovery is by friend code only** — there is deliberately no search by name. `profiles.friend_code` is 8 characters from an alphabet with no `I`, `O`, `0` or `1` so it survives being dictated over the phone. Lookup goes through `najdi_podle_kodu()`, a `SECURITY DEFINER` function returning one row and only name plus avatar; a normal RLS policy would have to permit reading every profile, which is the same as publishing a directory of children.

**Trigger functions must be `SECURITY DEFINER` if anything they call is revoked from `authenticated`.** The `profiles` insert trigger calls `vygeneruj_pratelsky_kod()`, which is deliberately not callable over `/rest/v1/rpc`. As `SECURITY INVOKER` the trigger ran with the caller's rights, hit that same revoke, and every profile upsert died with `permission denied for function vygeneruj_pratelsky_kod` — which killed cloud sync for XP and badges, far from anything that looked social. The app surfaced only "Synchronizace se nepovedla"; the reason is now shown under that row, because on a phone there is no console to check.

RLS helper functions take **one** argument and fill in `auth.uid()` themselves (`je_muj_pritel`, `je_blokovan_se_mnou`, `jsem_clenem`). The two-argument versions were callable over `/rest/v1/rpc` and let any signed-in user probe arbitrary pairs — enough to map the friendship graph. `jsem_clenem` must also stay `SECURITY DEFINER`: a policy on `chat_members` that queries `chat_members` recurses.

Blocking is symmetric and hides messages on read, so it covers group chats too. Deleting a message is soft (`deleted_at`), because a hard delete would remove the context an answer replies to.

**Reports reach a moderator.** `user_roles` is a separate table with a SELECT policy and *no write policy at all*, so a role can only be granted from the project dashboard — putting `role` on `profiles` would have let anyone set their own, because users may update their own profile row. `jsem_moderator()` gates report reading and resolving, and widens the `messages` and `profiles` SELECT policies just far enough to show the reported message and the two names involved. A moderator still cannot read ordinary private chats; that is asserted in the RLS tests.

`core/role/serverRole.ts` makes the server the authority for roles — the local store became the cache CLAUDE.md always said it would become. A network error deliberately leaves the stored role alone; dropping someone to `user` while offline would take away VIP they paid for.

**Unread messages are tracked app-wide** by `social/inbox.ts`, not only inside an open chat, so the Hub badge is right even when the user is elsewhere. It subscribes with no filter: Realtime applies the same RLS as a normal read, so only messages from the user's own chats arrive.

**Every realtime channel needs a unique name.** `supabase.channel(name)` returns the *existing* channel for a name already in use, and calling `.on()` on an already-subscribed channel throws — which blanked the entire app once the inbox and the Social screen both asked for `moje-zpravy`. `api.ts` appends a counter to every channel name.

**`INSERT ... RETURNING` also has to pass the SELECT policy.** `chats` is readable by `jsem_clenem(id)`, so `insert(...).select('id')` on a brand-new chat was rejected with `42501` — the creator only becomes a member on the *next* statement. Creating a chat therefore never worked at all. It now goes through `zaloz_chat(ucastnici, je_skupina, nazev)`, one `SECURITY DEFINER` call that creates the chat and every member together. That also removes an orphan-row hazard the three-statement version had: a failure after the first insert left a chat nobody was a member of, which no policy could then read or delete. Because it runs as the owner it re-checks the rules itself — real account, participants must be friends, nobody blocked — and returns the existing chat for a pair, so it is idempotent.

**Supabase errors are plain objects, not `Error`s.** A helper testing `err instanceof Error` therefore never matched, and every database failure reached the user as "Nepovedlo se to." — including the ones whose `message` said exactly what was wrong. On a phone there is no console, so that hid a 403 for hours. `chyba()` in `api.ts` reads `message`/`hint`/`code` off the object.

**Anything the UI must notice on its own needs to be in the `supabase_realtime` publication.** Only `messages` was, so a friend request sat invisible on the other device until Social was reopened, and it looked like sending had failed. `friendships` is in it too now. Realtime applies the same RLS as a normal read, so an unfiltered subscription still only delivers the user's own rows.

**Report the real reason, not the most likely one.** `najdiPodleKodu` used to return `null` for "nobody has that code", "that's your own code" and "the request failed" alike, and the UI always said the first. Entering your own code — the obvious thing to try with two devices — produced a flat lie. It returns a `NalezVysledek` discriminated union instead, and the panel checks the own-code case against `stav.profil.friendCode` before asking the server, because `najdi_podle_kodu` deliberately skips `auth.uid()` and cannot report it.

`src/social/api.ts` is the only place that talks to Supabase; components receive finished shapes. Realtime subscriptions return an unsubscribe function — `ChatView` must call it, or every visit leaves another open channel.

**Social carries a real Three.js scene as an ambient backdrop** (`social/scene/useAmbientScene.ts`) — a handful of soft glowing spheres drifting slowly behind the glass cards, matching the Hub orb's calm/subtle motion level but rendered in true 3D per an explicit choice (a CSS pseudo-3D approach was offered and declined). It follows the Game hub's ownership model exactly: lives outside React, cleans up every geometry/material/renderer on unmount, one `<canvas>` no matter how many times the user leaves and returns (verified by round-tripping in and out of `/social` three times). Because of that dependency, `SocialModule` is lazy-loaded in `App.tsx` just like `GameModule` — Social opens far more often than the game hub, so it would have been the worse place to eat the Three.js weight unconditionally. Vite notices both routes import the same `three` package and splits it into one shared chunk, so a user who visits both `/hra` and `/social` downloads Three.js once, not twice. The scene is decorative only (no raycasting, no controls) and stays `pointer-events: none`; it fades out via CSS opacity while a chat is open rather than unmounting, because unmounting the container would orphan the live WebGL canvas with nowhere to reattach when the chat closes.

**Avatars get a colour from the user's id, not a fixed gradient.** A flat cyan→violet circle for every single person made a friends list unreadable at a glance — nothing distinguished one row from the next except the name text. `avatarColor.ts` hashes the id to a hue deterministically (same id → same colour on every device, nothing stored), and `SocialAvatar.tsx` draws it as a rotating conic-gradient ring around the initial, using the same mask-based hole-punch as the Hub orb's ring (see the Hub section above) rather than the old padding-box trick, which breaks over a non-opaque background.

### Roles & shop

`src/core/role/` holds the role system. Each role is its own folder exporting a single `RoleDefinition` (`user/`, `vip/`, `moderator/`, `admin/`), and `registry.ts` is the only place they are enumerated — adding a role means a new folder plus one line there. **Nothing branches on a role's name**: every check goes through a `Permission` (`useHasPermission('cosmetics.premium')`), so a new role never means hunting for `roleId === 'vip'` comparisons. Import from the `@/core/role` barrel, not from the individual files.

VIP is a subscription, so a `RoleAssignment` carries `validUntil` (`null` = no expiry). **Expiry is evaluated on read, never stored** — `useActiveRole()` runs `resolveActiveRoleId` and silently returns `user` once the date has passed. A stored "still valid" flag would go stale while the app isn't running and nobody would correct it. `roleUtils.ts` holds that math as pure functions; `extendValidity` counts from the end of the running period, so renewing early never shortens what the user paid for. Corrupt or unreadable state always falls back to `user` — the safe direction is to grant nothing.

`FEATURE_GATING_ENABLED` in `registry.ts` is deliberately `false`: the `features.premium` permission exists but nothing hides behind it, because content users have today must not disappear behind a paywall. Only newly added features should ever be gated.

Credits live in `useWalletStore` (`core/store/`, because they are spent outside the shop too). The shop itself is `src/pages/shop/` — `catalog.ts` is the hand-maintained offer (prices in **haléře**, integers only), `useShop.ts` the logic, and `ShopModule.tsx` renders it.

**No purchase completes today, on purpose.** There is no payment gateway, and money-backed state cannot be decided by the browser: `secureStorage` is XOR obfuscation, so a user can hand-edit their own VIP or balance. Every purchase therefore funnels through the single `purchase()` in `useShop.ts`, which returns `{ status: 'unavailable' }` for anything costing money — wiring a gateway means changing that one function, not the components. For the same reason both `schoolbuddy-role-storage` and `schoolbuddy-wallet-storage` are `restorable: false` in `BACKUP_STORES`: an edited backup must not be able to grant VIP. When a real backend arrives, these stores become a *cache* of what the server says, never the authority.

### Admin panel (`src/pages/admin/`)

`/nastaveni` shows an "Administrace" section, visible only with the `admin.panel` permission (so only `ADMIN_ROLE`), linking to `/admin`. It's the app's **first route-level permission gate** — every other route only checks `dovnitr` (signed in), this one also checks `useHasPermission('admin.panel')` in `App.tsx` and redirects a non-admin to `/nastaveni`. That gate protects the UI only, same warning as everywhere else in `core/role/`: a user can edit their own client-side role. What actually protects the data is that every call the panel makes re-checks on the server — `jsem_admin()` (SQL, `SECURITY DEFINER`) backs both `admin_prehled()` and the reports RLS it shares with moderators, so a spoofed local role sees an empty panel, not real data.

**`jsem_admin()` is deliberately its own function, not a reuse of `jsem_moderator()`.** The latter passes both `'moderator'` and `'admin'` — right for reading reports, wrong for `admin_prehled()`'s database-wide aggregates (total accounts, messages sent), which a moderator must not get just because they can also see reports.

Four tabs: **Přehled** (status numbers from `admin_prehled()`, plus a live graph — see below), **SocialReport** (reuses `social/api.ts`'s `nactiHlaseni`/`vyriditHlaseni`/`popisDuvodu` directly rather than duplicating them, keeping "api.ts is the only place Social talks to Supabase" true; each report shows the reported person's raw Supabase id, not just their display name, since bans key off the id and a display name can be changed by its owner at any time), **Notifikace** (broadcast announcements — see below), and **Konzole** (a command registry in `commands.ts` — one command today, `appinfo`; adding another is one entry there, not a change to `KonzolePanel.tsx`, which only renders whatever a command returns).

**The "live parameters" graph only has real data for one of its three sources.** Supabase and Vercel both expose load/usage metrics only through their own management APIs, which require a secret access token — and a secret token embedded in this client-only PWA's JS bundle is readable by anyone who opens the network tab, admin-role gate or not (same class of problem as the money-backed stores above, one step worse: this isn't the user's own state, it's a credential to a shared account). Wiring those up for real means a small server component holding the token server-side (a Vercel/Supabase function the panel calls, authenticated) — deliberately unbuilt and, when last asked, deliberately deferred again rather than forgotten. The "Aplikace" source is real and live today — `metrics.ts` samples only what the browser can safely expose about itself (JS heap, Storage API quota, Cache Storage count, online status, build version) on a 3-second timer, capped to the last 20 samples so the sparkline in `PrehledPanel.tsx` shows a trend without the array growing forever.

**SocialReport carries two separate bans, and they live at two different layers on purpose.** "Zakázat Social" only ever needed RLS: `social_bans` is a table nobody can write except `zabanuj_ze_social()` (`SECURITY DEFINER`, admin-gated, same shape as `user_roles`), and the friendship/message/chat `INSERT` policies now also check `not je_zabanovan_ze_social()`. A banned account keeps read access to everything that already existed — banning is "no new writes," not retroactive deletion. "Zakázat celou appku" is a different kind of operation entirely: blocking sign-in isn't something any RLS policy can do, because RLS protects rows, not the auth handshake itself. That needs Supabase's admin API (`auth.admin.updateUserById(id, { ban_duration: '876000h' })`), which needs the **service role key** — a credential that bypasses RLS completely, sensitive enough that it doesn't reuse `api/buddy-chat.ts` and instead gets its own narrowly-scoped function, `api/admin-ban.ts`. That function is deliberately careful about *when* it touches that key: it decides whether the caller is really an admin first, by reading the caller's own `user_roles` row through the normal REST API with the caller's own token (RLS lets everyone read their own role) — only once that passes does it construct the service-role client, so the most dangerous credential in the project is never in scope for the one decision (is this person an admin?) that a spoofed client-side role could otherwise try to influence.

**Notifikace writes into the same `oznameni` table the Hub bell already reads.** There's no separate "admin broadcast" delivery path — `core/notifications/api.ts` is the one place anything talks to that table, and the existing notification bell (`useNotificationItems()` in `pages/profil/components/ProfilNotifications.tsx`, shared by both `ProfilModule` and `AppModule`'s badge count) just merges in whatever it returns alongside the locally-derived items (badges, streak, pending tasks). Announcements are prepended, not appended — they're things the user should notice before their own progress stats. `oznameni` doesn't need a `SECURITY DEFINER` function like `social_bans` or `user_roles` do: an admin broadcasting isn't touching anyone else's row, just inserting a new one, so a plain RLS `INSERT` policy gated on `jsem_admin()` is enough, and `created_by` defaults to `auth.uid()` server-side so a client can't claim someone else wrote it. Every signed-in user can `SELECT` — it's public content, not anyone's private data. Realtime is on (`supabase_realtime` publication), so an announcement posted while a user has the app open lights up the bell without a refresh, same mechanism as friend requests.

### Buddy voice assistant (`src/buddy/`, `api/buddy-chat.ts`)

Tap the mic in the Hub's bottom bar, or the glowing orb itself, and Buddy becomes a real conversational AI (Google Gemini, chosen because it has an actual free tier that needs no card) that you can talk to and that talks back.

**`api/buddy-chat.ts` was the first server-side code in the app**, and it exists for exactly one reason: an LLM API key is a real credential, and this is a client-only PWA whose whole JS bundle is public — anyone could pull a key straight out of it and spend against the account it belongs to. There is no way to make that safe by hiding harder; it has to never reach the browser. The Vercel serverless function holds `GEMINI_API_KEY` (no `VITE_` prefix — that prefix is precisely what makes Vite inline a variable into the shipped bundle, so this one deliberately doesn't get it) and is the only thing that ever calls Gemini. `vercel.json`'s SPA catch-all rewrite had to be narrowed to exclude `/api/` first, or the rewrite would swallow every request to the function before it ever ran. `api/admin-ban.ts` (see **Admin panel**) later reused that same exclusion and the same never-`VITE_`-prefix rule for its own, even more sensitive key.

The function still isn't open to the internet: it requires a valid Supabase session token (verified against `/auth/v1/user`) before it will spend a single token of the free quota. That's access control, not the per-user daily cap that was explicitly declined for v1 — an unauthenticated proxy risked the shared free-tier quota getting exhausted or the key throttled by randos finding the endpoint, hurting every real user, not just the requester.

**The conversation is turn-based ("walkie-talkie"), not continuously listening, on purpose.** `useBuddyVoice.ts` never has the microphone and speech synthesis active at the same time — recognition only starts on an explicit tap and stops itself when the sentence ends; Buddy's own spoken reply cannot therefore be picked back up by the mic and answered to, which is exactly the feedback-loop failure mode a hands-free design would risk. Tapping the mic again while Buddy is still talking interrupts the speech and starts listening immediately, so a "kolo" (turn) always ends in one of these ways, never both open at once.

**Speech synthesis is known to be flaky across browsers** — an utterance can occasionally fire neither `onend` nor `onerror` (observed for real: this sandbox's headless Chromium has zero installed TTS voices at all, so the "mluví" state couldn't even be watched directly here). Without a fallback, that would leave the state stuck on `mluvi` with the mic looking locked. `promluv()` in the hook sets a backup timer (scaled to the reply's length, 4–20 s) that forces the state back regardless, cleared immediately by a real `onend`/`onerror` when one does arrive.

Speech recognition (`SpeechRecognition`/`webkitSpeechRecognition`) has no TypeScript types in the DOM lib because it's still non-standard — `src/buddy/speechTypes.d.ts` declares only the surface the hook actually uses. It also has **no support at all on iOS Safari**, so `BuddyOverlay.tsx` always renders a typed-message fallback alongside the mic button, not only when recognition is unavailable — the same input path serves "can't talk right now" (a quiet classroom) as much as "can't talk at all" (an iPhone).

Conversation history lives only in the `useBuddyVoice` hook's React state, not in a persisted store — it resets on close by design (an explicit choice: Buddy remembers the running conversation, not a diary), and the hook is owned by `Hub.tsx` itself rather than by `BuddyOverlay`, because the orb needs to react to Buddy's state (`hub-orb--posloucha`/`--premysli`/`--mluvi`, reusing the orb's existing breathing/rotation animations at different speeds rather than inventing new ones) even before the overlay has been opened for the first time.

### Game hub (`src/game/`)

`/hra` renders a procedurally generated 3D medieval city (Three.js) that acts as a launcher: the arena, castle, market and gates are four clickable regions. Nothing behind them exists yet — every click opens a panel saying so. Wiring a region up means changing `otevriCast` in `GameModule.tsx`, nothing else.

**It is lazily-loaded, like Social.** Three.js is ~128 KB gzipped, more than the rest of the app put together, so `App.tsx` imports `GameModule` through `React.lazy`. Keep it that way — a static import would put Three.js in the main bundle and slow the first paint of every other screen. `/social` imports it too now (see **Accounts & Social**); Vite dedupes the shared `three` dependency into one chunk either way, so visiting both routes still only downloads the library once.

The scene lives entirely outside React. `useGameScene.ts` owns the renderer, camera, controls and render loop; React only receives projected label positions and the hovered region. Its cleanup disposes every geometry, material and the renderer — without that, each visit would leak a whole scene and the browser would start dropping WebGL contexts after a dozen or so.

Scene builders live in `scene/`, one file per part, all pure functions of a seeded RNG (`scene/random.ts`) so the city looks identical on every load. Two rules matter for performance, both learned by measuring:

- **Merge static geometry that shares a material** (`scene/merge.ts`). Crenellations, mountains and castle rocks as individual meshes cost 414 draw calls per frame; merged, the whole scene is 43 at the same triangle count. Draw calls, not triangles, are the mobile bottleneck.
- **Instance anything repeated** — houses and the ~1400 forest trees are `InstancedMesh`. Always set `.count` to the number actually placed, or the unused instances render at the origin as a pile at world centre.

Two non-obvious things about the look. The sky sphere renders with `depthTest: false` and `renderOrder = -1` so it behaves as a true backdrop; as ordinary geometry it gets overdrawn by the ground plane as soon as the camera backs out past its radius. And `PALETTE.mlha` is deliberately identical to the horizon sky colour — any difference shows up as a hard step along the horizon. Custom `ShaderMaterial` also needs `#include <colorspace_fragment>`; three.js adds it to its own materials but not to yours, and without it the sunset renders as muddy purple.

Camera distance is computed from the aspect ratio (`fitDistance`), never hard-coded: a portrait phone's horizontal field of view is far narrower than a desktop's, and a fixed distance that framed the city on a monitor put the camera inside the ring of mountains on a phone. The pitch matters too — too steep and the horizon leaves the frame entirely, so what looks like sky is actually fogged ground.

### Form Check (`src/miniapps/form-check/`)

A rep counter that watches the camera and counts squats via on-device pose detection — `@mediapipe/tasks-vision` (PoseLandmarker, WASM), no server ever sees the video. It's the template for "heavy on-device ML asset" if another miniapp needs one:

**The model and WASM runtime are self-hosted under `public/mediapipe/`, not fetched from Google's CDN**, so the app never depends on an external host staying up — same reasoning as "runs completely without the cloud" elsewhere in this file. That's ~28 MB (a 5.5 MB model, plus a SIMD WASM build and a no-SIMD fallback for older browsers) and it must **never** reach the install precache — nobody who skips this miniapp should download it. `vite.config.ts`'s `globIgnores` excludes `mediapipe/**`, and a `CacheFirst` `runtimeCaching` route fetches it lazily the first time Form Check actually opens, then serves it from the browser's cache offline after. Before assuming a library needs every file it ships, check what it actually requests over the network — the package here ships a third WASM variant (`vision_wasm_module_internal.*`) that `FilesetResolver` never asks for, confirmed by watching requests; it never went into the repo, saving another ~12 MB for nothing.

The camera + ML pipeline lives entirely outside React, same shape as the Game hub's `useGameScene.ts`: `usePoseEngine.ts` owns the `<video>`, the MediaStream, the `PoseLandmarker` instance and a `requestAnimationFrame` loop, and only pushes rep count / status / feedback into React state. Cleanup on unmount stops every media track and calls `.close()` on the landmarker — skip that and the camera keeps recording in the background after the user navigates away.

Rep-counting and posture math (`poseMath.ts`) are pure functions of landmark coordinates, deliberately kept free of the camera and of React, so they can be checked against made-up coordinates without a browser. The squat state machine needs a **gap between its two angle thresholds** (110°/160°, not one shared threshold) — without it, angle noise right at a single boundary counts a dozen reps a second instead of one. A rep counts on the way back *up*, not going down, so an unfinished squat never scores. Posture feedback ("narovnej záda") only fires during the down phase; everyone leans forward naturally at the top of a squat, and flagging that as wrong would just be noise.

Detection picks whichever side of the body (left/right) has higher landmark visibility each frame — a phone propped up for a side-on view of a squat always has one side partly self-occluded, and the model's guess for the hidden side is worse than for the visible one.

### Backup & restore

`core/utils/backup.ts` is the only way a user can get their data off a device — there is no backend. `BACKUP_STORES` is a hand-maintained catalogue of every persisted key; `collectFullBackup()` reads them into one versioned envelope (`format`/`version`/`createdAt`/`appVersion`/`data`) and `restoreFullBackup()` writes them back, recognising the pre-catalogue `{ apps: [...] }` format so older backups keep working. `backupValidation.ts` validates only the envelope — each store re-validates its own contents on rehydrate.

**Adding a miniapp with a persisted store means adding its key to `BACKUP_STORES`.** Miss it and the miniapp's data silently drops out of every backup. The auth store is deliberately excluded (restoring data shouldn't log anyone in or out). After a restore the app reloads, because the Zustand stores are already hydrated in memory and would not notice the new values on their own.

### File storage

File Manager keeps file *contents* in IndexedDB via `core/utils/fileStorage.ts` (`putFileBlob`/`getFileBlob`/`deleteFileBlob`/`listStoredFileIds`), not in `localStorage` — the 5 MB text-only limit there can't hold real files. Only the metadata (name, byte size, type, date) lives in the Zustand store. Consequently blobs are **not** in the JSON backup: after restoring on another device the entries exist but the content doesn't, and the UI says so instead of offering a broken download.

### Responsive layout

The app is phone-first and must adapt to whatever screen it lands on — verified from 320x568 up to a 1024px tablet, portrait and landscape. Two global rules in `styles/global.css` do most of the work and should not be removed:

- `img, svg, video, canvas { max-width: 100% }` — media never outgrows its parent.
- `* { min-width: 0 }` — flex and grid items default to `min-width/min-height: auto`, which makes them refuse to shrink below their content. That default is what pushed the Hub's bottom bar off-screen: the mascot rendered 325px tall inside a 217px section and overflowed it.

Because `html, body, #root` are `overflow: hidden` and each page scrolls itself, **overflow is clipped rather than shown** — a broken layout silently loses content instead of producing a scrollbar. Never rely on the page scrollbar to reveal a sizing bug; check element rectangles against the viewport.

When a page has a fixed-height element sized from the viewport, drive it from the space the layout leaves (`height: 100%` on a `flex: 1` parent), not from its own intrinsic size. The Hub's `.hub-pet-img` is the reference: height comes from the section, width follows the aspect ratio, and `max-width` caps it on tall screens.

The Hub's bottom bar is `position: sticky; bottom: 0` with a gradient backdrop. Android often reports `env(safe-area-inset-bottom)` as 0 while the gesture bar still covers the bottom of the screen, so a bar that merely sits at the end of the content can end up underneath it.

Every full-height page pairs `height: 100vh` with `height: 100dvh` — keep both. `100vh` alone includes the area behind mobile browser UI and clips the bottom of the page.

### Path alias

`@/*` resolves to `src/*`, configured in **two places that must stay in sync**: `resolve.alias` in `vite.config.ts` (used at build time) and `paths` in `tsconfig.json` (used by `npm run typecheck`). Use `@/...` imports for anything outside a feature's own folder; use relative imports within a miniapp/page's own directory.

### Directory map

- `src/core/` — cross-app state (`store/`), roles (`role/`), hooks, utils, types. Shared infrastructure only.
- `src/pages/` — route-level screens (`login/`, `hub/`, `app/`, `profil/`, `reward/`, `setting/`, `shop/`, `admin/`), each with its own `components/` subfolder and a single hand-written `.css` file (no CSS modules/CSS-in-JS).
- `src/game/` — the 3D game hub behind `/hra`; `scene/` holds one builder per part of the city.
- `src/social/` — friends, chats and blocking behind `/social`; `api.ts` is the only Supabase caller.
- `src/buddy/` — the voice assistant launched from the Hub orb/mic; `api.ts` is the only caller of `api/buddy-chat.ts`.
- `src/miniapps/` — the individual study tools (see above).
- `src/features/miniapps/registry.ts` — the lazy-loading wiring between `pages/app` and `miniapps/`.
- `src/components/` — small app-wide shared components (`ErrorBoundary`, `NetworkStatusBanner`).
- `src/styles/global.css` — global styles, imported once from `main.tsx`.
- `api/` — server-side only, deployed by Vercel as serverless functions, never bundled by Vite. `buddy-chat.ts` (see **Buddy voice assistant**) and `admin-ban.ts` (see **Admin panel**); typechecked by `npm run typecheck` via `tsconfig.json`'s `include`, same as `src/`.
- `tsconfig.json` — typecheck-only config for `npm run typecheck`; Vite never reads it for the build.
- `vercel.json` — cache headers for the update pipeline plus the SPA fallback rewrite (Vercel checks the filesystem before rewrites, so real files still win; `/api/` is explicitly excluded from that rewrite, or it would swallow every call to `buddy-chat.ts` before the function ever ran).
