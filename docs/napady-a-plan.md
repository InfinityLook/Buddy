# Nápady a plán do budoucna

Tenhle soubor je záměrně jiný než CLAUDE.md — CLAUDE.md dokumentuje jen to,
co je **hotové a ověřené**. Tohle je naopak seznam nápadů, rozhodnutí
a otevřených otázek k budoucí práci, ať se nemusí znovu vymýšlet totéž.
Až se něco odsud doopravdy postaví a ověří, přesune se popis do CLAUDE.md
a odsud může (ale nemusí) zmizet.

Datum poslední aktualizace: 2026-08-30.

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
`has_function_privilege`), ne jen teoreticky:

### PWA hlavičky — dnes v `vercel.json` úplně chybí, zdarma na doplnění
- **CSP (Content-Security-Policy)** — appka nenačítá žádné externí CDN
  (self-hosted mediapipe), takže by šla postavit poměrně přísně.
- **Permissions-Policy** — appka žádá kameru/mikrofon (Form Check, QR
  sken, hlasovky), stálo by za to explicitně omezit na appku samotnou.
- **X-Frame-Options / frame-ancestors** — appka má biometrický zámek
  a citlivý sociální obsah, neměla by jít vložit do cizího iframe.
- **Strict-Transport-Security, X-Content-Type-Options: nosniff**
- **Referrer-Policy** — konkrétní důvod: appka má `/social?kod=...`
  deep-link s přátelským kódem v URL, bez týhle hlavičky může kód
  uniknout v Refereru.

### Dependency security — CI dnes nic neskenuje
- `npm audit` právě teď (30. 8. 2026) hlásí **2 moderate zranitelnosti**:
  react-router (open redirect + arbitrary constructor injection) a
  valibot. Oprava react-routeru je `npm audit fix` bez breaking change,
  valibot potřebuje `--force` (breaking).
- **Dependabot** je na GitHubu zdarma i pro soukromé repo —
  `.github/dependabot.yml`, žádná cena.
- `npm audit --omit=dev` jako krok v CI, taky zdarma.

### Supabase Auth — dva reálné přepínače, zdarma
- **"Leaked password protection" je dnes VYPNUTÁ** — Supabase to má
  zdarma (kontrola proti HaveIBeenPwned), jeden přepínač v dashboardu.
- **"Allow anonymous sign-ins" je pořád ZAPNUTÉ** na úrovni projektu,
  i když appka (od zavedení povinného přihlášení) už nikdy nevolá
  `signInAnonymously()`. Nechat to zapnuté zbytečně rozšiřuje plochu,
  co může kdokoli s veřejným anon klíčem zkusit. Vypnutí je zdarma
  a sedí přesně na to, jak appka doopravdy funguje.
- **MFA (TOTP)** appka nikde nenabízí, 0 zaregistrovaných faktorů
  v produkci. Zdarma u Supabase. Dávalo by smysl aspoň jako volitelná
  věc pro admin/moderátorské účty (mají v appce reálnou moc).

### Supabase RLS — reálný nález, ale ověřeno že dnes není zneužitelný
Advisor našel **28 funkcí** s `EXECUTE` grantem pro `anon`, co by ho
neměly mít (`admin_nastav_roli`, `zabanuj_ze_social`, `nacti_audit_log`,
`vyridit_tiket` a další) — stejná třída chyby, jakou CLAUDE.md
dokumentuje jako opakovaně chycenou u novějších funkcí, jen u těchhle
starších se `revoke ... from anon` nikdy neudělal. **Otestováno přímo
jako `anon` proti produkci** — `admin_nastav_roli`/`zabanuj_ze_social`/
`nacti_audit_log` správně odmítly ("Přístup jen pro administrátory."),
protože `jsem_admin()` bezpečně vyhodnotí `auth.uid() is null` jako
false. Takže dnes to není díra, jen chybějící druhá vrstva obrany —
levné dodělat (jen SQL revoke příkazy), nulové riziko rozbití.

### Zálohy — riziko do budoucna, ne akutní dnes
Appčina sociální data (chaty, přátelství, příspěvky) žijí **jen
v Supabase**, appka je nikde lokálně nezálohuje (na rozdíl od zbytku
appky s vlastním exportem zálohy). Free tier Supabase nemá plnohodnotné
průběžné zálohování (PITR je placená věc). Zdarma řešení existuje
(pravidelný `pg_dump` přes GitHub Action), ale je to práce navíc, ne
přepínač. Bude to bolet víc, čím víc appka poroste — sledovat.

**Co bych udělal jako první, protože je to zdarma a bez rizika:**
hlavičky ve `vercel.json`, Dependabot, vypnutí anonymních přihlášení,
zapnutí leaked-password ochrany, revoke anon grantů u těch 28 funkcí.

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
