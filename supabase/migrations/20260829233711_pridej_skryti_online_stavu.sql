
-- Vypnutí "kdo tě vidí online" — appka dosud tep zapisovala vždycky
-- bez možnosti to vypnout. Plain sloupec na profiles, žádná nová RLS
-- politika potřeba (stejné právo jako u soukromy/jména/motta —
-- vlastník už svůj profil upravovat smí).
alter table public.profiles add column skryt_online boolean not null default false;

-- Vypnutí musí umět smazat i aktuální řádek přítomnosti hned (ne až
-- za JE_ONLINE_PRAH_MS, až tep sám zestárne) — presence dosud neměla
-- žádnou DELETE politiku vůbec. presence' vlastní SELECT politika
-- (user_id = auth.uid() OR …) už vlastníkovi jeho řádek "vidět" dovolí,
-- takže tahle DELETE politika nenarazí na stejnou past jako dřív
-- u posts (UPDATE bez vyhovující SELECT politiky).
create policy "vlastní přítomnost lze smazat" on public.presence
  for delete using (user_id = auth.uid());
