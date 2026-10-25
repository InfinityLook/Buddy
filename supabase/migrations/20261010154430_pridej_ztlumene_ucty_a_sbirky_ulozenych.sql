-- Ztlumené účty ("Není to pro mě") — lehčí krok než odhlásit/zablokovat,
-- jen vyřadí dotyčného z vlastního feedu, nic jiného se nemění.
create table public.muted_accounts (
  user_id uuid not null references auth.users(id) on delete cascade,
  muted_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_id),
  check (muted_id <> user_id)
);

alter table public.muted_accounts enable row level security;

create policy "vidět vlastní ztlumené" on public.muted_accounts
  for select using (user_id = auth.uid());

create policy "ztlumit" on public.muted_accounts
  for insert with check (user_id = auth.uid());

create policy "zrušit ztlumení" on public.muted_accounts
  for delete using (user_id = auth.uid());

-- Obě feedové funkce teď navíc vylučují příspěvky od ztlumeného účtu —
-- jen přidaná podmínka, návratové sloupce beze změny, takže stačí
-- CREATE OR REPLACE (žádný nový DROP/grant).
create or replace function public.nacti_feed(kurzor timestamp with time zone default null, pocet integer default 10)
returns table(id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamp with time zone, dalsi_media jsonb, edited_at timestamp with time zone)
language sql stable security definer
set search_path to ''
as $function$
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object('media_path', pm.media_path, 'media_type', pm.media_type) order by pm.position)
       from public.post_media pm where pm.post_id = p.id),
      '[]'::jsonb
    ) as dalsi_media,
    p.edited_at
  from public.posts p
  where auth.uid() is not null
    and (
      p.user_id = auth.uid()
      or exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = p.user_id and f.stav = 'prijato'
      )
    )
    and public.smi_videt_prispevky_uzivatele(p.user_id)
    and not exists (
      select 1 from public.muted_accounts m
      where m.user_id = auth.uid() and m.muted_id = p.user_id
    )
    and (kurzor is null or p.created_at < kurzor)
  order by p.created_at desc
  limit least(coalesce(pocet, 10), 30);
$function$;

create or replace function public.nacti_doporuceny_feed(kurzor_skore double precision default null, kurzor_id uuid default null, pocet integer default 10)
returns table(id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamp with time zone, dalsi_media jsonb, edited_at timestamp with time zone, skore double precision)
language sql stable security definer
set search_path to ''
as $function$
  with kandidati as (
    select
      p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at, p.edited_at,
      (select count(*) from public.post_likes pl where pl.post_id = p.id) as pocet_lajku,
      (select count(*) from public.post_comments pc where pc.post_id = p.id) as pocet_komentaru,
      exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = p.user_id and f.stav = 'prijato'
      ) as sleduji
    from public.posts p
    where auth.uid() is not null
      and public.smi_videt_prispevky_uzivatele(p.user_id)
      and not exists (
        select 1 from public.muted_accounts m
        where m.user_id = auth.uid() and m.muted_id = p.user_id
      )
      and p.created_at > now() - interval '14 days'
  ),
  oskorovane as (
    select
      k.*,
      (
        (k.pocet_lajku * 1.0 + k.pocet_komentaru * 2.0)
          / power(extract(epoch from (now() - k.created_at)) / 3600.0 + 2, 1.5)
        + case when k.sleduji then 4.0 else 0.0 end
        + case when k.user_id = auth.uid() then 4.0 else 0.0 end
      ) as skore
    from kandidati k
  )
  select
    o.id, o.user_id, o.media_path, o.media_type, o.caption, o.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object('media_path', pm.media_path, 'media_type', pm.media_type) order by pm.position)
       from public.post_media pm where pm.post_id = o.id),
      '[]'::jsonb
    ) as dalsi_media,
    o.edited_at,
    o.skore
  from oskorovane o
  where kurzor_skore is null
    or o.skore < kurzor_skore
    or (o.skore = kurzor_skore and o.id < kurzor_id)
  order by o.skore desc, o.id desc
  limit least(coalesce(pocet, 10), 30);
$function$;

-- Sbírky uložených příspěvků (appčina obdoba Pinterest/IG "Collections")
create table public.saved_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nazev text not null check (length(trim(nazev)) > 0),
  created_at timestamptz not null default now()
);

alter table public.saved_collections enable row level security;

create policy "vidět vlastní sbírky" on public.saved_collections
  for select using (user_id = auth.uid());

create policy "založit vlastní sbírku" on public.saved_collections
  for insert with check (user_id = auth.uid());

create policy "přejmenovat vlastní sbírku" on public.saved_collections
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "smazat vlastní sbírku" on public.saved_collections
  for delete using (user_id = auth.uid());

-- Uložený příspěvek může (nemusí) patřit do jedné sbírky. Smazání sbírky
-- uložení samo nesmaže, jen ho vrátí do "Bez sbírky" (ON DELETE SET NULL,
-- stejný vzor jako messages.story_id).
alter table public.saved_posts add column collection_id uuid references public.saved_collections(id) on delete set null;

-- saved_posts dřív neměla žádnou UPDATE politiku (nic nepotřebovalo měnit
-- už uložený řádek) — appka ji přidává přesně pro přeřazení mezi sbírkami.
create policy "přeřadit vlastní uložené mezi sbírkami" on public.saved_posts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
