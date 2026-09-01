# Nápady a plán do budoucna

Tenhle soubor je záměrně jiný než CLAUDE.md — CLAUDE.md dokumentuje jen to,
co je **hotové a ověřené**. Tohle je naopak seznam nápadů, rozhodnutí
a otevřených otázek k budoucí práci, ať se nemusí znovu vymýšlet totéž.
Až se něco odsud doopravdy postaví a ověří, přesune se popis do CLAUDE.md
a odsud může (ale nemusí) zmizet.

Datum poslední aktualizace: 2026-09-01.

## Cíl appky

- Zůstat **zdarma** na provoz (žádná placená infrastruktura) minimálně
  do cca **1000 aktivních uživatelů**.
- V budoucnu appku nasadit na **Google Play** jako TWA (Trusted Web
  Activity) — appka zůstává webová appka, jen se zabalí do tenkého
  Android shellu.

---

## 1. Container Queries

Odsouhlaseno k zařazení. CSS `@container` — appka se dnes přizpůsobuje
podle viewportu (flex/grid + `min-width: 0` triky), container queries
umožní komponentě reagovat na šířku *vlastního rodiče*, ne stránky.
Zdarma, žádný polyfill potřeba (Chrome/Edge/Safari/Firefox mají podporu),
čistě aditivní CSS. Kandidáti: `PostavaKarta` (karusel vs. jinde),
`.social-dialog`, mřížka příspěvků.

## 2. Systémová/bezpečnostní vylepšení — zjištěno živě z produkce

Ověřeno přímo v appce a v Supabase (`get_advisors`, `npm audit`,
`has_function_privilege`), ne jen teoreticky.

**Aktualizace 1. 9. 2026 — pět položek z "co bych udělal jako první" byly
skutečně provedeny, tři hotové doopravdy, dva potřebují ruční krok
v Supabase dashboardu (žádný dostupný nástroj v týhle session na ně
nesahá — nejde o Postgres SQL, ale o projektová Auth nastavení).**

### ✅ HOTOVO — PWA hlavičky v `vercel.json`
CSP, Permissions-Policy (`camera=(self), microphone=(self)`, zbytek
zamčený), X-Frame-Options: DENY + `frame-ancestors 'none'`, HSTS,
X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin.
Ověřeno, že appka nenačítá žádný externí CDN/font (grep přes `src/` —
jen self-hosted mediapipe, žádné externí `<script>`/`@font-face`), takže
CSP mohla jít na `default-src 'self'` + explicitní `https://*.supabase.co`
pro `connect-src`/`img-src`/`media-src` (Storage, Realtime `wss://`) a
`'wasm-unsafe-eval'` v `script-src` kvůli Form Check's WASM. `style-src`
má `'unsafe-inline'` — appka používá inline `style={{...}}` napříč (barvy
avatarů, conic-gradienty), refaktor na nonce/hash by byl samostatná práce.

### ✅ HOTOVO — Dependabot
`.github/dependabot.yml` — npm (týdně, seskupené minor/patch aktualizace,
limit 5 otevřených PR) + github-actions (týdně). Bezpečnostní záplaty
(i major) Dependabot otevírá vždycky, mimo `open-pull-requests-limit`.

### ⚠️ Korekce — dependency security, `npm audit`
Původní odhad "oprava react-routeru je `npm audit fix` bez breaking
change" se **ukázal jako mylný, ověřeno skutečným spuštěním**:
`npm audit fix` bez `--force` opravdu udělal neškodný patch bump
(react-router-dom 6.30.4 → 6.30.6, pořád v rámci `^6.26.2` z
`package.json`), ale `npm audit --omit=dev` i po něm pořád hlásí react-router
i valibot jako zranitelné — CVE u react-routeru je opravené až v **7.18.3**,
což je major skok (6→7), ne patch. Skutečná oprava obou (react-router i
valibot) vyžaduje `--force` a je to reálná breaking-change práce
(retest routingu/`dovnitr` gate, `tests/e2e/auth.spec.ts`, celý build) —
ne "zdarma a bez rizika", takže to tahle session záměrně NEudělala a
nechává jako vlastní budoucí položku s vlastním testovacím průchodem.
Krok `npm audit --omit=dev` v CI záměrně taky (zatím) nepřidán — hned
by appce zbarvil CI do červena kvůli těmhle dvěma už známým, odloženým
nálezům; přidat ho má smysl až spolu s jejich opravou, ne dřív.

### ✅ HOTOVO — revoke `EXECUTE` pro `anon` u starších funkcí
Skutečný živý dotaz (`has_function_privilege`), ne odhad z paměti —
napočítal **29** `SECURITY DEFINER`/triggerových funkcí v `public`
schématu, ke kterým měl `anon` přístup (`admin_nastav_roli`,
`zabanuj_ze_social`, `nacti_audit_log`, `vyridit_tiket`, `zaloz_chat`
a další — stejná třída chyby, jakou CLAUDE.md dokumentuje jako
opakovaně chycenou u novějších funkcí, jen u těchhle starších se
`revoke` nikdy neudělal).

**Druhá vrstva korekce našla i skutečnou mezeru v prvním pokusu**: prostý
`revoke execute ... from anon` zavřel jen **7 z 29** — zbylých 22 mělo
`EXECUTE` grantnutý implicitně přes `PUBLIC` (Postgresův výchozí grant
při `CREATE FUNCTION`), který `anon` jako každá role dědí bez ohledu na
to, jestli má svůj vlastní `anon`-specifický revoke. Až druhá migrace
(`revoke ... from public`) zavřela zbytek — ověřeno `proacl` u pár funkcí
napřed, aby revoke z `PUBLIC` nesundal i `authenticated` (má vlastní,
samostatný grant, takže ne). **Ověřeno přímo jako živý `anon`/`authenticated`
role** (`set local role ...`), ne jen počtem: `jsem_admin()` i
`hledej_podle_jmena()` teď jako `anon` spadnou na `42501 permission
denied for function ...`, zatímco jako `authenticated` proběhnou beze
změny. Výsledek: `select count(*) ... has_function_privilege('anon', ...)`
přes celé `public` schéma je teď **0**.

### 🔲 ZBÝVÁ — dva ruční přepínače v Supabase dashboardu
Žádný nástroj dostupný v týhle session (`mcp__Supabase__*`) nesahá na
projektová Auth nastavení (jen na Postgres SQL/migrace/edge functions/
branch) — tohle jde jen přes Supabase dashboard, ne odsud:
- **Authentication → Sign In / Providers → "Allow anonymous sign-ins"** —
  vypnout. Appka (od zavedení povinného přihlášení) už nikdy nevolá
  `signInAnonymously()`, takže zapnuté zbytečně rozšiřuje plochu, co
  může kdokoli s veřejným anon klíčem zkusit.
- **Authentication → Policies → Password Security → "Leaked password
  protection"** — zapnout. `get_advisors` (security) tohle právě teď
  živě hlásí jako `WARN` (`auth_leaked_password_protection`).
- **MFA (TOTP)** appka nikde nenabízí, 0 zaregistrovaných faktorů
  v produkci — pořád nezačaté, dávalo by smysl aspoň jako volitelná
  věc pro admin/moderátorské účty.

### 🆕 Nový nález (dosud neřešeno) — "Anonymous Access Policies", 35×
`get_advisors` (security) hlásí **35** `WARN` nálezů tohohle typu napříč
tabulkami (`activity_counters`, `chats`, `blocks`, `audit_log` a další) —
RLS politiky, co nemají výslovné `TO authenticated`, takže se textově
vztahují i na `anon` (i když jejich `USING`/`WITH CHECK` s `auth.uid()`
u anonymního volajícího stejně vždycky vyhodnotí jako nesplněné — funkčně
to dnes není díra, stejná "chybí druhá vrstva obrany" logika jako
u funkcí výš). Přidat `TO authenticated` ke třem desítkám existujících
politik je ale skutečná, plošná práce napříč celým schématem — nespadá
do "zdarma a bez rizika, udělej hned" kategorie, na rozdíl od jednoho
`revoke` na 29 funkcí. Vlastní budoucí položka s vlastním ověřením
(politika po politice, ne hromadně naslepo).

### Zálohy — riziko do budoucna, ne akutní dnes
Appčina sociální data (chaty, přátelství, příspěvky) žijí **jen
v Supabase**, appka je nikde lokálně nezálohuje (na rozdíl od zbytku
appky s vlastním exportem zálohy). Free tier Supabase nemá plnohodnotné
průběžné zálohování (PITR je placená věc). Zdarma řešení existuje
(pravidelný `pg_dump` přes GitHub Action), ale je to práce navíc, ne
přepínač. Bude to bolet víc, čím víc appka poroste — sledovat.

## 3. Volná webová API — projitá s verdiktem

### Opravdu zdarma a dobrý fit
- **`navigator.storage.persist()`** — appka stojí na tom, že prohlížeč
  je jediný zdroj pravdy (Finance, Poznámky, File Manager). Bez
  vyžádání trvalého úložiště může prohlížeč appčina data potichu smazat
  při nedostatku místa. Nejsilnější doporučení z celého seznamu.
- **Badging API** (`setAppBadge`) — appka už počítá nepřečtené
  zprávy/notifikace, jen to nikdy neukázala na ikoně appky. Slabá
  podpora na iOS.
- **Wake Lock API** — Pomodoro (běžící časovač) a Form Check (cvičení
  s opřeným telefonem).
- **Vibration API** — pár dobře vybraných momentů (level up, odemčený
  odznak), ne na každý klik. iOS Safari nikdy nepodporoval, trvalé
  omezení platformy.
- **Web Share Target API** — appka už umí sdílet fotky/video *dovnitř*
  (posty, story, chat), tohle je opačný směr — appka v systémovém
  "Sdílet do…" menu. Jen Android.
- **`navigator.share()`** (opačný směr než Target) — appka má "Kopírovat
  odkaz" na profil, `navigator.share()` by otevřel systémové sdílení
  vedle toho jako přirozený doplněk.
- **Notification actions** — appka už má push infrastrukturu
  (`push-sw.js`, Pomodoro cron), tlačítka přímo na notifikaci
  ("Odložit o 5 min"/"Hotovo") jsou jen rozšíření existujícího.
- **Background Sync API** (jednorázový, ne periodický) — reálná mezera:
  zpráva poslaná v Socialu bez signálu dnes nejspíš prostě selže.
- **Web Workers & OffscreenCanvas** — Form Check's pose-detection
  smyčka a 3D exploration v herním hubu běží na hlavním vlákně, šlo by
  je přesunout. Reálná práce, ne rychlá úprava (MediaPipe má historicky
  potíže běžet čistě ve Workeru).
- **Compression Streams API** — ne náhrada JSZipu (ten dělá kontejner,
  ne jen kompresi), ale šlo by tím nahradit JSZip's vnitřní kompresní
  kód a ušetřit kus balíčku — potřebuje ještě malý zip-writer navíc.
- **OPFS** (ne zastaralé "Storage Foundation API") — až bude bolet
  IndexedDB u fakt velkých souborů, nebo při případném SQLite-WASM.
- **`BroadcastChannel` API** — synchronizace mezi otevřenými taby stejné
  appky na stejném zařízení (např. sladit motiv appky nebo zabránit
  duplicitním "jsem tu" tepům, když má appku otevřenou ve dvou tabech).
- **View Transitions API** — appka je vidět, že dbá na plynulé animace
  (dýchající orb, prstenec avataru), tohle by dalo plynulé přechody mezi
  routami/DOM změnami bez těžké knihovny. Podpora zatím jen Chrome-first,
  bral bych to jako postupné vylepšení, ne základ funkčnosti.

### Zajímavé, ale skutečná práce navíc
- **`Screen Orientation.lock()`** — Form Check/herní hub, jen Android
  nainstalovaná PWA.
- **Contact Picker API** — appka má dlouhodobě opatrný přístup
  k objevování lidí (žádný otevřený adresář); najít přátele podle
  kontaktů by šlo postavit stejně disciplinovaně (hashovat čísla
  klientsky, nikdy neposílat syrové kontakty), ale je to návrh práce
  navíc, ne přepínač. Jen Chrome Android.
- **Skutečné WebAuthn přihlášení (passkeys) místo hesla** — appka dnes
  má WebAuthn jen jako *lokální zámek appky* nad už přihlášenou
  Supabase relací (`core/utils/biometrics.ts`). Skutečné passwordless
  přihlášení k účtu je jiná, větší věc — Supabase Auth nemá WebAuthn
  jako prvotřídní přihlašovací metodu bez vlastního mostu. Zdarma, ale
  reálné inženýrství, ne rozšíření toho, co appka má.

### Bych nedělal / nesedí
Multi-Screen Window Placement, Presentation API/Remote Playback,
WebHID, WebGPU (herní hub je schválně nízkopolygonový, není GPU-bound),
plné SQLite-WASM bez konkrétní bolesti.

### Faktické opravy chybných premis
- **"NPU API"** neexistuje jako reálné, produkčně použitelné API
  (WebNN je raný draft za flagem). Appka už dělá to, co se tím myslí —
  lokální AI bez serveru — přes Form Check's MediaPipe/WASM.
- **SSE & WebSockets appka už má**, jen přes Supabase Realtime
  (postgres_changes/presence/broadcast), ne ruční `WebSocket()`.
- **WebRTC není "úplně zdarma"** v praxi — P2P média zdarma, ale
  spolehlivé spojení přes reálné sítě potřebuje TURN relay server,
  a ten buď stojí peníze, nebo ho musíš sám hostit. Signalizace by šla
  přes Supabase Realtime zdarma, ale appka nemá dnes žádnou funkci
  volání/videohovorů, jen předem nahrané hlasovky.

## 4. Nasazení na Google Play (TWA)

**TWA (Trusted Web Activity)** = appka zůstává tatáž webová appka
(stejný manifest, stejný service worker), jen se zabalí do tenkého
Android shellu, co spustí appku v Chrome Custom Tabs bez viditelné
adresní řádky — vypadá jako nativní appka.

Nástroje (oba zdarma, open-source):
- **Bubblewrap** (Google, CLI)
- **PWABuilder** (Microsoft, vygeneruje Android projekt/APK/AAB přímo
  z URL appky a manifestu)

Co appka potřebuje:
- Platný `manifest.webmanifest` — appka ho už má (vite-plugin-pwa).
- HTTPS — appka ho už má (Vercel).
- `/.well-known/assetlinks.json` — statický JSON soubor, co dokáže
  vlastnictví domény vůči Android balíčku (generuje se jednou z otisku
  podpisového klíče appky). Zdarma na hostování.
- **Stabilní doménu** — jakmile je appka jednou nasazená s konkrétní
  doménou přes TWA, změna domény pak znamená znovu-ověření a rozbije
  ověření podpisu, dokud se neopraví. Stojí za to doménu ustálit dřív,
  než se appka pošle do Play.

Reálné náklady:
- **Jednorázový poplatek $25** za Google Play Developer účet — jediná
  skutečná, nevyhnutelná platba v celém tomhle plánu.
- Google Play App Signing (appka nechá Google spravovat podpisový
  klíč) je zdarma a doporučené.

Co appka musí splňovat, aby TWA vypadalo nativně (ne jako prohlížeč
s viditelnou adresní řádkou): Digital Asset Links musí sedět přesně,
appka musí mít solidní offline chování a slušné Lighthouse PWA skóre —
stálo by za to spustit Lighthouse audit před pokusem o odeslání.

## 5. Škálování zdarma do ~1000 uživatelů — co se pravděpodobně rozbije jako první

Nejde jen o to, kolik appka "unese", ale co narazí na strop *první*:

1. **OpenRouter free-tier model pro Buddy AI hlasového asistenta** —
   appka už dnes vyžaduje přihlášení kvůli sdílené kvótě zdarma
   (`api/buddy-chat.ts`), přesně kvůli tomuhle riziku. Free modely mají
   typicky nízké sdílené rate limity (pár požadavků za minutu na *celou*
   appku, ne na uživatele) — tohle je nejpravděpodobnější první stěna,
   dřív než cokoli jiné, ještě dost před 1000 uživateli, pokud appka
   nezavede vlastní per-uživatelský limit (appka to zatím vědomě
   nemá — viz CLAUDE.md's "explicitně nechtěné pro v1").
2. **Supabase Storage** — Social má avatary, bannery, posty (veřejný
   bucket), chat-media/story (privátní), hlasovky. Při 1000 aktivních
   uživatelích, co pravidelně sdílí fotky/videa, je tohle
   pravděpodobně první místo, kde appka narazí na limit zdarma tieru
   dřív, než na výpočetní výkon.
3. **Vercel Hobby plán** — appka na něm dnes běží, ale Hobby je podle
   vlastních podmínek Vercelu myšlený pro osobní/nekomerční projekty.
   Jakmile appka bude mít reálné (byť neplatící) uživatele v netriviálním
   počtu, stojí za to ověřit aktuální podmínky Vercelu, ne to nechat
   bez kontroly — nejde jen o technický strop, ale o smluvní podmínky.
4. **Supabase databáze/bandwidth** — při 1000 uživatelích (chaty,
   příspěvky, reakce) reálně nepředpokládám brzký tvrdý strop, ale
   stojí za to to sledovat průběžně (appčin vlastní admin panel na to
   dokonce má "Přehled" s grafy).
5. **Vercel Cron / web-push** — nemění se s počtem uživatelů (dávková
   úloha jednou denně, push notifikace jsou zdarma bez ohledu na objem
   u prohlížečových push služeb) — tohle nehrozí.

**Shrnutí:** appka AI hlasový asistent pravděpodobně narazí na strop
zdarma tieru jako první, dřív, než cokoli jiné — stálo by za to na tohle
myslet zvlášť (per-uživatelský denní limit, nebo přesun na jiný free
model s vyšším limitem), ne až to fakticky přestane fungovat.
