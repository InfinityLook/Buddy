
-- ==========================================
-- Feed na Domů — příspěvky vlastní a od všech, koho appka sleduje
-- (follows, stav='prijato'), ne jen vzájemných přátel. Stejná
-- viditelnost jako u nacti_prispevky/smi_videt_prispevky_uzivatele:
-- sledovat soukromý účet a mít žádost schválenou ještě neznamená
-- vidět jeho příspěvky, dokud sledování není i vzájemné — feed na tom
-- nic neobchází, jen agreguje to, co už je jinak vidět po jednom.
-- ==========================================

create or replace function public.nacti_feed(kurzor timestamptz default null, pocet integer default 10)
returns table(id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamptz)
language sql
stable security definer
set search_path = ''
as $$
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at
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

revoke all on function public.nacti_feed(timestamptz, integer) from public;
revoke all on function public.nacti_feed(timestamptz, integer) from anon;
grant execute on function public.nacti_feed(timestamptz, integer) to authenticated;
