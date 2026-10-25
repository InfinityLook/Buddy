
-- Všechny čtyři funkce, co čtou posts, teď navíc vrací edited_at, ať
-- appka umí u upraveného příspěvku ukázat "(upraveno)" — drop+create,
-- ne CREATE OR REPLACE, mění se výstupní sloupce.
drop function public.nacti_prispevky(uuid);

create function public.nacti_prispevky(cil uuid)
returns table (id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamptz, dalsi_media jsonb, edited_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object('media_path', pm.media_path, 'media_type', pm.media_type) order by pm.position)
       from public.post_media pm where pm.post_id = p.id),
      '[]'::jsonb
    ) as dalsi_media,
    p.edited_at
  from public.posts p
  where p.user_id = cil
    and public.smi_videt_prispevky_uzivatele(cil)
  order by p.created_at desc;
$$;

drop function public.nacti_feed(timestamptz, int);

create function public.nacti_feed(kurzor timestamptz default null, pocet int default 10)
returns table (id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamptz, dalsi_media jsonb, edited_at timestamptz)
language sql stable security definer set search_path = ''
as $$
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
    and (kurzor is null or p.created_at < kurzor)
  order by p.created_at desc
  limit least(coalesce(pocet, 10), 30);
$$;

drop function public.nacti_ulozene_prispevky();

create function public.nacti_ulozene_prispevky()
returns table (id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamptz, dalsi_media jsonb, edited_at timestamptz)
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
    ) as dalsi_media,
    p.edited_at
  from public.saved_posts s
  join public.posts p on p.id = s.post_id
  where s.user_id = auth.uid() and public.smim_videt_prispevek(p.id)
  order by s.created_at desc;
end;
$$;

drop function public.nacti_jeden_prispevek(uuid);

create function public.nacti_jeden_prispevek(p_post_id uuid)
returns table (id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamptz, dalsi_media jsonb, edited_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object('media_path', pm.media_path, 'media_type', pm.media_type) order by pm.position)
       from public.post_media pm where pm.post_id = p.id),
      '[]'::jsonb
    ) as dalsi_media,
    p.edited_at
  from public.posts p
  where p.id = p_post_id and public.smim_videt_prispevek(p.id);
$$;

revoke all on function public.nacti_prispevky(uuid) from public, anon;
grant execute on function public.nacti_prispevky(uuid) to authenticated, anon;
revoke all on function public.nacti_feed(timestamptz, int) from public, anon;
grant execute on function public.nacti_feed(timestamptz, int) to authenticated;
revoke all on function public.nacti_ulozene_prispevky() from public, anon;
grant execute on function public.nacti_ulozene_prispevky() to authenticated;
revoke all on function public.nacti_jeden_prispevek(uuid) from public, anon;
grant execute on function public.nacti_jeden_prispevek(uuid) to authenticated;
