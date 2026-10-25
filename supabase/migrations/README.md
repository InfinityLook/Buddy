# Migrace databáze

Tento adresář obsahuje úplnou historii schématu Supabase projektu
"SChoolBuddy-System" (`fsrjlxxaehijbflueuin`), 88 migrací, exportovaných
z živého projektu dne 2026-10-25 jako oprava bodu #11 bezpečnostního
auditu ("Doplnit reprodukovatelné schéma databáze a migrace").

## Proč to dřív chybělo

Všechny migrace byly od začátku projektu aplikované přímo na živý
projekt přes `mcp__Supabase__apply_migration`, ale nikdy neukládané do
repozitáře — schéma databáze tedy nebylo nikde ve verzovaném kódu, jen
v `supabase_migrations.schema_migrations` tabulce na serveru. Bez téhle
historie šlo schéma zrekonstruovat jen ručním čtením stavu databáze,
ne znovu přehrát od nuly (třeba do nového/testovacího projektu).

## Jak byl export ověřen

Export je doslovná kopie: každý soubor `<verze>_<název>.sql` obsahuje
přesně to, co je uložené v `statements[1]` příslušného řádku
`supabase_migrations.schema_migrations` na živém projektu — žádná SQL
nebyla přeformátovaná, zkrácená ani "vyčištěná" při přepisu.

Ověření proběhlo porovnáním MD5 kontrolního součtu: pro každou migraci
byl na serveru spočítán `md5(statements[1])` a následně porovnán s MD5
souboru v tomhle adresáři. Všech 88/88 souhlasí. Žádná Supabase branch
(`create_branch`) se pro tohle ověření nevytvářela — šlo o explicitní
požadavek, aby se nepoužil nástroj s reálnými náklady.

**Co tohle ověření NEdokazuje**: že soubory jde skutečně přehrát přes
`supabase db push`/`migration up` do prázdné databáze a dojít ke
stejnému výsledku (síla cizích klíčů, pořadí `create or replace
function` oprav apod.) — to vyžaduje reálný replay (třeba do nové
branch nebo lokálního stacku), což tahle oprava záměrně nedělala.
Pokud bude tahle historie použitá ke skutečnému nastavení nového
prostředí, stojí za to replay nejdřív vyzkoušet na jedné zahozené
branch/instanci.

## Jak pokračovat dál

Od teď platí: každá nová změna schématu (nová tabulka, nová/upravená
RLS politika, nová funkce) by měla vzniknout jako nový `.sql` soubor
tady — `<YYYYMMDDHHMMSS>_<popisný_název>.sql`, stejná konvence jako
existující soubory — a až pak se aplikovat na živý projekt, ne naopak.
Timestamp lze získat třeba `date +%Y%m%d%H%M%S` (UTC).
