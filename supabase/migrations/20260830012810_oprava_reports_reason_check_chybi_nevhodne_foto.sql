-- Skutečný, dřív nezachycený bug: DUVODY v types.ts nabízí uživateli
-- "nevhodne_foto" (Nevhodná profilová fotka) jako reason hlášení od
-- Fáze 2 (skutečná fotka profilu), ale CHECK constraint na
-- reports.reason ten enum nikdy nedostal — každé takové hlášení dosud
-- padalo na 23514 (check constraint violation), tiše appce shozené do
-- "Nepovedlo se to." Rozšíření constraintu je jediná oprava potřeba,
-- žádná migrace dat (žádný řádek s touhle hodnotou nemohl nikdy vzniknout).
alter table public.reports drop constraint reports_reason_check;
alter table public.reports add constraint reports_reason_check
  check (reason = any (array['spam', 'obtezovani', 'nevhodny_obsah', 'nevhodne_foto', 'jine']));