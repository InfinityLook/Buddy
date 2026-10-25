-- ==========================================
-- Social Fáze 2 (první krok): skutečná fotka profilu (Supabase Storage,
-- veřejný bucket) a bio (motto) na veřejném profilu. Appka motto
-- synchronizuje už od cloud sync — precti_verejny_profil ho jen dosud
-- nevracel, protože pro něj neměl smysl dřív, než existoval veřejný
-- profil vůbec k zobrazení.
-- ==========================================

-- Veřejný bucket — stejná úroveň citlivosti jako jméno+foto, co appka
-- už ukazuje přes hledání podle jména (hledej_podle_jmena). Kdokoli se
-- znalým odkazem foto načte, ale nahrát/přepsat/smazat smí jen vlastník
-- (politiky níž).
insert into storage.buckets (id, name, public)
values ('avatary', 'avatary', true)
on conflict (id) do nothing;

-- Cesta souboru je vždycky "<user_id>/avatar.jpg" — storage.foldername(name)
-- vrátí pole složek v cestě, [1] je ta první, tedy user_id.
create policy "nahrát vlastní avatar" on storage.objects
for insert with check (
  bucket_id = 'avatary' and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "přepsat vlastní avatar" on storage.objects
for update using (
  bucket_id = 'avatary' and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "smazat vlastní avatar" on storage.objects
for delete using (
  bucket_id = 'avatary' and (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT politika navíc ke skutečně veřejnému bucketu (ten sám o sobě
-- pustí čtení přes getPublicUrl bez ohledu na RLS) — kvůli konzistenci
-- a kvůli programovému .list()/.list() přes API, který RLS pořád dodržuje.
create policy "číst avatary" on storage.objects
for select using (bucket_id = 'avatary');

-- precti_verejny_profil mění vracené sloupce (přibývá motto) — Postgres
-- to u RETURNS TABLE nedovolí jen přes CREATE OR REPLACE, proto DROP.
drop function if exists public.precti_verejny_profil(uuid);

create function public.precti_verejny_profil(cil uuid)
returns table(display_name text, avatar_url text, motto text, xp integer, level integer, streak_days integer, role text)
language sql
stable security definer
set search_path to ''
as $$
  select p.display_name, p.avatar_url, p.motto, p.xp, p.level, p.streak_days,
         coalesce(r.role, 'user') as role
  from public.profiles p
  left join public.user_roles r
    on r.user_id = p.id and (r.valid_until is null or r.valid_until > now())
  where p.id = cil
    and auth.uid() is not null
    and not public.je_blokovan_se_mnou(cil);
$$;
