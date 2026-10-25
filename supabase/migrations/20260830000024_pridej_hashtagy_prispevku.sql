create table public.post_hashtags (
  post_id uuid not null references public.posts(id) on delete cascade,
  hashtag text not null,
  primary key (post_id, hashtag)
);

create index post_hashtags_hashtag_idx on public.post_hashtags (hashtag);

alter table public.post_hashtags enable row level security;
-- Žádné politiky schválně — appka do téhle tabulky nikdy nesahá přímo,
-- jen přes SECURITY DEFINER funkce níž (trigger, co ji plní, a
-- hledej_podle_hashtagu, co ji čte), stejná "default deny, jen úzká
-- funkce" opatrnost jako u audit_log.

create or replace function public.extrahuj_hashtagy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text;
  pocet int := 0;
begin
  delete from public.post_hashtags where post_id = new.id;

  if new.caption is not null then
    for t in
      select lower(m[1]) from regexp_matches(new.caption, '#([[:alnum:]_]+)', 'g') as m
    loop
      insert into public.post_hashtags (post_id, hashtag) values (new.id, t)
      on conflict do nothing;
      pocet := pocet + 1;
      exit when pocet >= 30;
    end loop;
  end if;

  return new;
end;
$$;

revoke all on function public.extrahuj_hashtagy() from public, anon, authenticated;

create trigger extrahuj_hashtagy_trigger
after insert or update of caption on public.posts
for each row execute function public.extrahuj_hashtagy();

create or replace function public.hledej_podle_hashtagu(dotaz text, pocet int default 20)
returns table (
  id uuid,
  user_id uuid,
  media_path text,
  media_type text,
  caption text,
  created_at timestamptz,
  dalsi_media jsonb,
  edited_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object('media_path', pm.media_path, 'media_type', pm.media_type) order by pm.position)
       from public.post_media pm where pm.post_id = p.id),
      '[]'::jsonb
    ) as dalsi_media,
    p.edited_at
  from public.post_hashtags h
  join public.posts p on p.id = h.post_id
  where auth.uid() is not null
    and h.hashtag = lower(regexp_replace(trim(dotaz), '^#', ''))
    and public.smi_videt_prispevky_uzivatele(p.user_id)
  order by p.created_at desc
  limit least(coalesce(pocet, 20), 50);
$$;

revoke all on function public.hledej_podle_hashtagu(text, int) from public, anon;
grant execute on function public.hledej_podle_hashtagu(text, int) to authenticated;

-- Zpětné doplnění hashtagů z už existujících příspěvků — trigger platí
-- jen napříště, tohle jednorázově protáhne "UPDATE OF caption" i pro
-- řádky založené předtím, než hashtagy vůbec existovaly.
update public.posts set caption = caption where caption is not null;