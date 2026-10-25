
-- Karusel příspěvku — víc fotek/videí v jednom příspěvku. posts.media_path/
-- media_type zůstává beze změny a nese vždycky první položku (žádná
-- migrace existujících řádků potřeba); post_media nese jen DALŠÍ položky
-- (position 1, 2, …). Stejný "beze změny stávajících konzumentů" princip
-- jako u messages.story_id/reply_to_id výš — appka, co karusel nezná,
-- pořád vidí přesně to, co viděla dřív.
create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  position int not null,
  created_at timestamptz not null default now()
);

create index post_media_post_id_idx on public.post_media (post_id, position);

alter table public.post_media enable row level security;

-- Čte se výhradně zevnitř SECURITY DEFINER funkcí (nacti_prispevky/
-- nacti_feed/nacti_ulozene_prispevky), stejně jako posts samotné nemá
-- plain SELECT politiku vůbec — žádná SELECT politika tu proto není.
create policy "přidat další médium smí jen vlastník příspěvku" on public.post_media
  for insert with check (
    exists (select 1 from public.posts p where p.id = post_media.post_id and p.user_id = auth.uid())
  );

-- Tři funkce, co čtou posts, teď navíc vrací dalsi_media (jsonb pole
-- {media_path, media_type}, seřazené podle position) — drop+create, ne
-- jen CREATE OR REPLACE, protože se mění sada výstupních sloupců.
drop function public.nacti_prispevky(uuid);

create function public.nacti_prispevky(cil uuid)
returns table (id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamptz, dalsi_media jsonb)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object('media_path', pm.media_path, 'media_type', pm.media_type) order by pm.position)
       from public.post_media pm where pm.post_id = p.id),
      '[]'::jsonb
    ) as dalsi_media
  from public.posts p
  where p.user_id = cil
    and public.smi_videt_prispevky_uzivatele(cil)
  order by p.created_at desc;
$$;

drop function public.nacti_feed(timestamptz, int);

create function public.nacti_feed(kurzor timestamptz default null, pocet int default 10)
returns table (id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamptz, dalsi_media jsonb)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object('media_path', pm.media_path, 'media_type', pm.media_type) order by pm.position)
       from public.post_media pm where pm.post_id = p.id),
      '[]'::jsonb
    ) as dalsi_media
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
    and (kurzor is null or p.created_at < kurzor)
  order by p.created_at desc
  limit least(coalesce(pocet, 10), 30);
$$;

drop function public.nacti_ulozene_prispevky();

create function public.nacti_ulozene_prispevky()
returns table (id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamptz, dalsi_media jsonb)
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Přístup jen pro přihlášené.' using errcode = '42501';
  end if;

  return query
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object('media_path', pm.media_path, 'media_type', pm.media_type) order by pm.position)
       from public.post_media pm where pm.post_id = p.id),
      '[]'::jsonb
    ) as dalsi_media
  from public.saved_posts s
  join public.posts p on p.id = s.post_id
  where s.user_id = auth.uid() and public.smim_videt_prispevek(p.id)
  order by s.created_at desc;
end;
$$;

revoke all on function public.nacti_prispevky(uuid) from public, anon;
grant execute on function public.nacti_prispevky(uuid) to authenticated, anon;
revoke all on function public.nacti_feed(timestamptz, int) from public, anon;
grant execute on function public.nacti_feed(timestamptz, int) to authenticated;
revoke all on function public.nacti_ulozene_prispevky() from public, anon;
grant execute on function public.nacti_ulozene_prispevky() to authenticated;
