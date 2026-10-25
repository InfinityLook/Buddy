
-- Vlastní seznam sledujících/sledovaných (ne cizí — appka deliberately
-- nikdy neukazuje cizí follow-seznam, viz komentář u pocet_spolecnych_pratel/
-- navrhy_pratel: jen počty jsou veřejné, seznam nikdy). Plain SELECT na
-- `follows` by appce vlastní řádky ukázal (RLS: follower_id = auth.uid()
-- or following_id = auth.uid()), ale profiles.display_name/avatar_url
-- pro jednostranného (ne vzájemného, ne čekajícího) sledujícího/sledovaného
-- plain profiles RLS neukáže — SECURITY DEFINER funkce, stejný důvod jako
-- nacti_aktivitu_prispevku výš.
create or replace function public.moji_sledujici()
returns table (id uuid, display_name text, avatar_url text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Přístup jen pro přihlášené.' using errcode = '42501';
  end if;

  return query
  select p.id, p.display_name, p.avatar_url
  from public.follows f
  join public.profiles p on p.id = f.follower_id
  where f.following_id = auth.uid() and f.stav = 'prijato'
  order by f.created_at desc;
end;
$$;

create or replace function public.moje_sledovani()
returns table (id uuid, display_name text, avatar_url text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Přístup jen pro přihlášené.' using errcode = '42501';
  end if;

  return query
  select p.id, p.display_name, p.avatar_url
  from public.follows f
  join public.profiles p on p.id = f.following_id
  where f.follower_id = auth.uid() and f.stav = 'prijato'
  order by f.created_at desc;
end;
$$;

revoke all on function public.moji_sledujici() from public, anon;
revoke all on function public.moje_sledovani() from public, anon;
grant execute on function public.moji_sledujici() to authenticated;
grant execute on function public.moje_sledovani() to authenticated;
