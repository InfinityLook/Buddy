# Seznam potřebných dokončení

Průběžný seznam konkrétních, ověřených nálezů z revize appky — na rozdíl
od `napady-a-plan.md` (budoucí nápady/rozhodnutí) jde tady vyloženě o
věci, co je potřeba **doopravit**. Každý bod je ověřený přímo v kódu
(soubory/řádky), ne jen domněnka. Nic z tohoto seznamu zatím nebylo
opraveno — čeká na odsouhlasení, než se na to sáhne.

---

## 1. Izolace dat mezi účty na jednom zařízení + race při přepnutí účtu

### Problém A — čtyři domény bez jakékoli ochrany podle účtu

Na rozdíl od gamifikace/profilu (`core/supabase/cloudSync.ts`) a
Finance/Writer's Room/Goal Tracker/školních appek
(`core/supabase/recordSync.ts`), které mají funkční `UCET_KLIC` reset
při zjištěné neshodě účtu, tyhle čtyři domény ho nemají vůbec:

- **Quick Notes** — `src/miniapps/quick-notes/useQuickNotes.ts`,
  pevné klíče `schoolbuddy-quick-notes-storage` a
  `buddy-quick-note-draft-v1`.
- **Document Editor** — `src/miniapps/document-editor/useDocumentStore.ts`,
  pevný klíč `schoolbuddy-document-editor-storage` (čte/píše přímo přes
  `secureStorage`, ne přes Zustand `persist` middleware).
- **File Manager** — blob store v IndexedDB,
  `src/core/utils/fileStorage.ts`.
- **Historie záloh v appce** — IndexedDB,
  `src/core/utils/backupHistory.ts`.

Na sdíleném zařízení (rodinný tablet, přihlášení druhého člověka na
stejném telefonu) se tahle data z předchozího účtu objeví i pod novým.

### Problém B — čtyři profilová pole mimo existující reset

`cloudSync.ts`'s `resetniPriNeshodeUctu()` při neshodě účtu chrání jen
`name / motto / bio / frameId / pinnedBadges`. V `ProfileData`
(`src/pages/profil/hooks/useProfileData.ts`) zůstanou při přepnutí účtu
beze změny:

- `avatar` (místní data URI)
- `email`
- `security` (`{biometrics, loginAlerts}`)
- `readNotifications`

### Problém C — race: sync doběhne až po přepnutí účtu

`cloudSync.ts`'s `syncNow()` (~řádek 278) a `recordSync.ts`'s
`syncNow()` (~řádek 207) obě mají dedup "pokud sync už běží, vrať
existující promise":

```ts
if (syncPromise) return syncPromise   // cloudSync.ts
if (inFlight) return                   // recordSync.ts
```

Pokud se účet přepne UPROSTŘED běžícího běhu, handler
`useAccount.subscribe(...)` zavolá `syncNow()` znovu — ale díky dedupu
se nezaloží nový běh pro nového uživatele, jen se vrátí (a rovnou
zahodí přes `void`) ten starý, který dobíhá se zmrazeným `userId`
předchozího účtu (modulová proměnná v `cloudSync.ts`, lokální `const`
zachycená na začátku `runSync` v `recordSync.ts`).

Důsledky, až starý běh doběhne (typicky po síťové odpovědi, tedy
reálně až po přepnutí):

1. Zapíše (`applyLocally()` / `cfg.setLocal(...)`) data **starého**
   účtu do právě aktivních místních storů **nového** účtu.
2. Protože se vrácený promise jen zahodil, nic automaticky nespustí
   korektní sync pro nového uživatele — stane se to až náhodou při
   jiném spouštěči (návrat do appky, obnovené připojení, `pagehide`).

### Co už je hotové (nepotřebuje opravu)

Gamifikace + profilová pole `name/motto/bio/frameId/pinnedBadges`
(`cloudSync.ts`) a Finance/Writer's Room/Goal Tracker/školní appky
(`recordSync.ts`) mají funkční `UCET_KLIC` reset při zjištěné neshodě
účtu — ten ale řeší jen Problém A/B pro tyhle konkrétní domény, ne
Problém C (race).

---

## 2. Biometrický zámek jde vypnout bez jakéhokoli ověření

### Problém

`src/components/BiometricLock.tsx`'s tlačítko "Nejde to? Vypnout
zámek" vede přes obecný `BuddyConfirm` dialog (jen
title/description/confirmLabel/action — `BuddyConfirm.tsx` nemá
žádné pole na heslo ani jiný druh ověření) přímo na `onVypnoutZamek`
v `src/App.tsx`:

```ts
onVypnoutZamek={() => {
  updateSecurity({ biometrics: false, biometricCredentialId: undefined })
  setOdemceno(true)
}}
```

Dvě ťuknutí (tlačítko → potvrdit v dialogu) = zámek trvale vypnutý
**a** appka odemčená. Žádná biometrie, žádné heslo, žádné ověření
proti serveru.

### Proč je to problém, i když je to zdokumentovaný návrh

Appka má to zdůvodněné tím, že kdo klikne na tlačítko, má stejně
přístup jako kdokoli přes devtools k `secureStorage` (XOR obfuskace
s natvrdo zapsaným klíčem v `src/core/utils/secureStorage.ts`, ne
šifrování). To odůvodnění míchá dvě různě schopné osoby — umět
rozlousknout XOR obfuskaci v devtools je jiná dovednost, než umět
ťuknout na viditelné tlačítko. Zámek má chránit přesně před tím
druhým člověkem (kdokoli, kdo zvedne zamčený telefon) — a ten ho
tímhle obejde bez jediné technické znalosti.

### Co se nemá dělat

Tlačítko úplně zrušit — existuje pro reálný případ (WebAuthn
credential vázaný na jiné zařízení po obnově zálohy z jiného
telefonu, kdy by `overBiometrii` navždy failovalo a appka by se jinak
zacyklila bez možnosti dovnitř).

### Co by oprava měla pravděpodobně udělat

Před samotným `onVypnoutZamek` vyžádat jediný skutečný faktor, co
appka má a co se ověřuje proti serveru — účtové heslo (Supabase),
ne WebAuthn (ten sám o sobě proti serveru vůbec nic neověřuje, viz
vlastní komentář v `biometrics.ts`). Teprve po úspěšném ověření hesla
zámek vypnout.

---

## 3. Záznamová synchronizace: žádné stránkování + pořadí podle hodin telefonu

Platí pro doménu po záznamu (`src/core/supabase/recordSync.ts` a jeho
čtyři konzumenty — `financeSync.ts`, `writerSync.ts`, `skolaSync.ts`,
`goalTrackerSync.ts`). Netýká se `cloudSync.ts`'s gamifikace (ta
srovnává čísla, ne časová razítka — viz níž).

### Problém A — žádné stránkování, ztráta je trvalá, ne jen odložená

Stahovací dotaz ve všech pěti souborech:

```ts
.select('*').eq('user_id', userId).gt('updated_at', naIso(kurzor))
```

Žádné `.range()`/`.limit()` nikde. Supabase/PostgREST má projektový
strop na počet řádků (typicky 1000) — nad ním `data` přijde tiše
kratší, appka to nijak nepozná, žádná chyba se nevyhodí.

Horší následek: `ulozKurzor(noveKurzor)` se zavolá bez ohledu na to,
jestli dotaz vrátil všechno. Záznamy nad stropem mají teď
`updated_at` menší než nový kurzor — příští `gt('updated_at', ...)`
dotaz je už nikdy nenajde. Nejde o zpoždění, jde o trvalou ztrátu.
Appka přesto nahlásí `status: 'synced'`.

### Problém B — pořadí podle hodin telefonu, ne podle serveru

Všechny `toRow()` funkce (`financeSync.ts` ×5 tabulek, `writerSync.ts`,
`skolaSync.ts`, `goalTrackerSync.ts`) posílají
`updated_at: naIso(item.updatedAt)` — čistě klientský `Date.now()`
z okamžiku úpravy. Žádný trigger na straně Supabase ho nepřepisuje.

Sloučení (`slouc()` v `recordSync.ts`) rozhoduje čistě podle těchhle
hodnot:

```ts
if (!existujici || item.updatedAt >= existujici.updatedAt) mapa.set(item.id, item)
```

Pokud se hodiny dvou zařízení liší, zařízení s "rychlejšími" hodinami
může svoji ve skutečnosti **starší** úpravu nechat vyhrát nad
**novější** úpravou z druhého zařízení — tiše, bez záznamu konfliktu,
poražená verze zmizí.

### Proč k tomu vůbec dochází — offline-first samo o sobě není chyba

Appka zapisuje lokálně okamžitě, nečeká na cloud — to je nutné pro
offline chování a nemá se měnit. Problém je, že appka pak při
pozdějším srovnání nemá žádnou autoritu, proti které by obě časová
razítka ověřila — jen srovná dvě nezávislá, nedůvěryhodná čísla
z různých zařízení.

### Co by oprava měla pravděpodobně udělat

- Stránkovat stahovací dotaz (`.range()`, cyklus dokud appka nedostane
  méně řádků, než je velikost stránky) a posouvat kurzor až po
  skutečném dokončení celého stahování, ne jen po jednom dotazu.
- Buď přidat server-side `updated_at` (trigger/`default now()`
  s `before update` přepisem, appka klientskou hodnotu posílá jen
  jako podnět, ne jako pravdu), nebo aspoň logický/monotónní čítač
  místo nástěnných hodin pro rozhodování o vítězi konfliktu.

---

## 4. RLS pravidla na `chats`/`chat_members` dovolí měnit víc, než mají

Ověřeno živě proti produkční databázi (`SChoolBuddy-System`,
`fsrjlxxaehijbflueuin`) — aktuální `pg_policies` a definice funkcí,
ne odhad z kódu. Žádný trigger na `chats` ani `chat_members` neexistuje
(`information_schema.triggers` prázdné pro obě tabulky) — nic jiného
tyhle sloupce nechrání.

### Problém A — `chat_members`'s "označit přečtení" povoluje změnit `chat_id`

```
cmd: UPDATE
qual:       (user_id = auth.uid())
with_check: (user_id = auth.uid())
```

Postgres RLS nerozlišuje sloupce v rámci jedné policy — tahle povolí
`UPDATE` celého řádku, dokud `user_id` zůstane volajícího. `chat_id`
nic nechrání.

`jsem_clenem()`:
```sql
select exists (select 1 from public.chat_members m
  where m.chat_id = chat and m.user_id = auth.uid());
```

`UPDATE chat_members SET chat_id = '<cizí chat>' WHERE user_id = auth.uid()`
tedy projde — a `jsem_clenem(cizí_chat)` je od tý chvíle pravda. SELECT
na `messages`/`chats` i přístup k přílohám v `chat-media` bucketu (RLS
tam taky visí na `jsem_clenem`) se otevře bez pozvání, kamarádství
nebo založení chatu.

### Problém B — `chats`'s přejmenování povoluje změnit `created_by`

```
cmd: UPDATE
qual:       (jsem_clenem(id) AND is_group)
with_check: jsem_clenem(id)
```

Stejná díra, jiný sloupec. `odebrat_ze_skupiny()` čte autoritu takhle:
```sql
select created_by, is_group into v_zakladatel, v_je_skupina
from public.chats where id = p_chat_id;
...
if auth.uid() is distinct from v_zakladatel then raise exception ...
```

Jakýkoli člen skupiny může `UPDATE chats SET created_by = auth.uid()
WHERE id = '<skupina>'` — projde to stejnou policy jako přejmenování.
Appka ho pak uzná jako zakladatele a dovolí mu přes
`odebrat_ze_skupiny()` vyhodit kohokoli ze skupiny, včetně skutečného
zakladatele.

### Co by oprava měla pravděpodobně udělat

Row-level RLS tady samo nestačí — potřeba omezit na úrovni sloupců,
to Postgres umí přes `GRANT`/`REVOKE UPDATE (sloupce)`, nezávisle na
RLS policy:

- `chat_members`: `REVOKE UPDATE ON chat_members FROM authenticated;`
  + `GRANT UPDATE (last_read_at, …) ON chat_members TO authenticated;`
  — `chat_id`/`user_id` mimo povolenou sadu.
- `chats`: `REVOKE UPDATE ON chats FROM authenticated;` +
  `GRANT UPDATE (name, icon) ON chats TO authenticated;` — `created_by`
  mimo povolenou sadu.

---

## 5. Soukromí a mazání médií neodpovídá tomu, co appka ukazuje

Ověřeno živě proti produkční databázi (`SChoolBuddy-System`,
`fsrjlxxaehijbflueuin`) — bucket flags, definice funkcí, RLS policy
na `messages`, ne odhad z kódu.

### Problém A — soukromý profil, veřejný odkaz na médium

```sql
select id, public from storage.buckets;
-- avatary: true, posts: true, chat-media: false, stories: false
```

`posts` i `avatary` buckety jsou **veřejné**. `nacti_prispevky()`
správně skryje řádek příspěvku cizímu člověku u soukromého účtu — to
ale řeší jen, kdo se **dozví cestu** k souboru, ne jestli je sám soubor
chráněný. Jakmile cestu někdo jednou má (sdílený odkaz, dřívější
veřejný účet, network tab, uhodnutá cesta), `getPublicUrl()` ji vrátí
bez jakéhokoli ověření navždy — appka to sama volá
(`social/api.ts:1298,2062,2067`). "Soukromý účet" chrání databázový
řádek, ne skutečný soubor.

### Problém B — smazání nemaže soubor

Žádné volání mazání (uživatelské i moderátorské) neodstraňuje objekt
ve Storage — ověřeno jak na klientovi (žádné `.remove()` v celém
`social/api.ts`), tak v databázových funkcích:

```sql
moderator_smaz_avatar   → update profiles set avatar_url = null   -- soubor zůstává
moderator_smaz_prispevek → delete from posts                       -- soubor zůstává
smazatPrispevek()        → .from('posts').delete()                 -- soubor zůstává
```

U privátních bucketů (`chat-media`, `stories`) appka tohle sama
označuje za přijatý náklad — soubor je prakticky nedosažitelný, pokud
vyžaduje podepsanou URL. U **veřejných** bucketů (`posts`, `avatary`)
to neplatí: "smazaná" nebo moderátorem odstraněná fotka zůstává
veřejně dostupná na původní adrese navždy.

### Problém C — moderátor dostane potvrzení bez změny v databázi

Jediná `UPDATE` policy na `messages`:
```sql
"upravit vlastní zprávu": qual = (auth.uid() = sender_id)
```

`SocialReportPanel.tsx` volá na smazání nahlášené zprávy stejnou
`smazatZpravu()`, co používá uživatel na vlastní zprávu:
```ts
const { error } = await supabase.from('messages').update({...}).eq('id', id)
return error ? chyba(error) : { ok: true }
```

Moderátor není `sender_id` — RLS `UPDATE` tiše vyfiltruje na nula
řádků, PostgREST to nevrací jako chybu (žádné `.select()`/kontrola
počtu), appka vrátí `{ ok: true }` a ukáže "Zpráva smazána." —
databáze beze změny, zpráva zůstává živá a viditelná oběma
účastníkům.

### Co by oprava měla pravděpodobně udělat

- A/B: přepnout `posts`/`avatary` buckety na privátní + podepsané URL
  (stejný tvar jako `chat-media`/`stories`), a v `moderator_smaz_*`/
  `smazatPrispevek()` doplnit skutečné `storage.remove()` na starý
  `media_path`/`avatar_url` před (nebo po) smazáním řádku.
- C: dát moderátorskému mazání zprávy vlastní `SECURITY DEFINER`
  funkci (stejný tvar jako `moderator_smaz_prispevek`/
  `moderator_smaz_avatar`), co uvnitř ověří `jsem_moderator()` a
  existenci hlášení — ne spoléhat na to, že plain `.update()` pod
  identitou moderátora vůbec něco změní.

---

## 6. Pomodoro server push — SSRF + mazání před odesláním + jednou denně

Ověřeno živě proti produkční databázi (`SChoolBuddy-System`,
`fsrjlxxaehijbflueuin`) a čtením `api/pomodoro-push.ts`/`core/utils/push.ts`.

### Problém A — SSRF přes neověřený `endpoint`

```sql
-- jediná omezení na push_prihlaseni:
UNIQUE (endpoint), PRIMARY KEY (id), FOREIGN KEY (user_id) → auth.users
-- žádný CHECK na endpoint

-- RLS:
"nahraj vlastni push prihlaseni": INSERT, with_check = (user_id = auth.uid())
"aktualizuj vlastni push prihlaseni": UPDATE, qual/with_check = (user_id = auth.uid())
```

Nic — databáze, RLS, ani klient (`push.ts` kontroluje jen
`!json.endpoint`, tedy prázdnou hodnotu, ne tvar/doménu) — nehlídá,
že `endpoint` musí být skutečná adresa push služby. Kdokoli s běžným,
zdarma založeným účtem může přes REST API (appku k tomu nepotřebuje)
vložit vlastní `endpoint` na libovolnou vnitřní adresu + vlastní
`pomodoro_casovace` řádek s `konci_v` v minulosti. Jednou denně to
appčin cron (`api/pomodoro-push.ts`, se service role klíčem) načte
a zavolá `webpush.sendNotification({endpoint: ..., keys: {...}}, ...)`
— knihovna provede HTTP POST na tu adresu bez ověření, že je to vůbec
push služba. Server tím na pokyn běžného uživatele odešle požadavek
na cíl, který si zvolil.

### Problém B — mazání před odesláním, žádné opakování

```ts
// api/pomodoro-push.ts, pořadí přesně takhle:
let claim = admin.from('pomodoro_casovace').delete().eq(...)
const { data: claimed } = await claim.select('user_id')   // řádek smazán TADY
if (claimError || !claimed?.length) continue
// ...až POTOM čte push_prihlaseni a volá sendNotification()
```

Řádek časovače appka smaže dřív, než se o odeslání vůbec pokusí.
Pokud `sendNotification()` spadne na čemkoli jiném než přesně
`404`/`410` (síťový výpadek, dočasná chyba push služby…), appka to
jen zaloguje do konzole a pokračuje dál — žádné opakování, žádné
znovu-vložení řádku. Notifikace je ztracená navždy, ne jen pozdě.

### Problém C — jednou denně (Vercel Hobby)

I v úspěšném případě appka kvůli Vercel Hobby cronu (`0 6 * * *`,
jednou denně) doručí notifikaci až při příštím běhu — klidně skoro
24 hodin pozdě pro pětadvacetiminutový blok. Appka tohle sama
dokumentuje jako vědomé omezení plánu zdarma, ne skrytou chybu.

### Shrnutí

"Pozdě" je nejlepší možný výsledek (až ~24 h kvůli C), "vůbec" je
reálný výsledek při jakékoli dočasné chybě odeslání (B). A/B/C jsou
otázka spolehlivosti — A je reálná bezpečnostní chyba dostupná
komukoli se zdarma založeným účtem, nezávisle na tom, jak appka
řeší B/C.

### Doporučení (zapsáno jako vyjádření ke zvážení, ne jako appčin plán)

Pro první vydání zůstat jen u lokálního upozornění (appčin modulový
časovač, co appka má dřív) a serverový push appka zapne až po opravě
aspoň problému A.

---

<!-- Další body se přidávají sem, jeden po druhém, podle toho, jak je
     uživatel posílá a jak se k nim appka/Claude vyjádří. -->
