
-- Skutečná, jinak tvarovaná chyba, chycená testem, ne uhodnutá: Postgres
-- u UPDATE/DELETE navíc vyžaduje, aby cílový řádek prošel i nějakou
-- SELECT politikou tabulky, pokud tabulka nějakou SELECT politiku má
-- (interně se UPDATE přepíše tak, že si řádky nejdřív "vybere"). posts
-- dosud měla jen jednu, úzkou SELECT politiku (moderátor + nahlášený
-- příspěvek) — takže i majitelova vlastní úprava popisku selhala potichu
-- (0 změněných řádků), protože majitel bez nahlášení tuhle jedinou SELECT
-- politiku nesplní. Přidání "vidět vlastní příspěvek" SELECT politiky nic
-- nového neodhaluje (appka už dovoluje autorovi vlastní příspěvky číst
-- přes nacti_prispevky(vlastni_id) — tahle politika jen totéž dovolí i
-- přímému PostgREST dotazu), jen tím appka splní Postgresí požadavek na
-- UPDATE.
create policy "vidět vlastní příspěvek" on public.posts
  for select using (user_id = auth.uid());
