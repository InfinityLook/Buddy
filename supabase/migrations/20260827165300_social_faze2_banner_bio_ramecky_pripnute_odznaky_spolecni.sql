-- ==========================================
-- Social Fáze 2 pokračování: banner, delší bio, rámečky avataru,
-- připnuté odznaky, společní přátelé a návrhy.
-- ==========================================

-- Banner sdílí bucket "avatary" (cesta "<user_id>/banner.jpg") — stejné
-- own-folder RLS politiky z předchozí migrace už tenhle soubor pokrývají,
-- žádná nová storage politika není potřeba.
alter table public.profiles
  add column if not exists banner_url text,
  add column if not exists bio text,
  add column if not exists frame_id text,
  add column if not exists pinned_badges text[] not null default '{}';

-- Nejvýš 3 připnuté odznaky — appka to hlídá i sama (profileValidation
-- styl), ale sloupec to má vynucené i na databázi, ať se stejná mez
-- nemůže rozejít se dvěma různými cestami zápisu.
alter table public.profiles
  add constraint pripnute_odznaky_max_3
  check (pinned_badges is null or cardinality(pinned_badges) <= 3);

-- precti_verejny_profil mění vracené sloupce znovu — DROP kvůli
-- RETURNS TABLE, stejně jako v předchozí migraci.
drop function if exists public.precti_verejny_profil(uuid);

create function public.precti_verejny_profil(cil uuid)
returns table(
  display_name text, avatar_url text, banner_url text, motto text, bio text,
  frame_id text, pinned_badges text[], xp integer, level integer,
  streak_days integer, role text
)
language sql
stable security definer
set search_path to ''
as $$
  select p.display_name, p.avatar_url, p.banner_url, p.motto, p.bio,
         p.frame_id, p.pinned_badges, p.xp, p.level, p.streak_days,
         coalesce(r.role, 'user') as role
  from public.profiles p
  left join public.user_roles r
    on r.user_id = p.id and (r.valid_until is null or r.valid_until > now())
  where p.id = cil
    and auth.uid() is not null
    and not public.je_blokovan_se_mnou(cil);
$$;

-- Počet společných přátel — jen číslo, ne seznam identit: appka se
-- odjakživa vyhýbá vystavování cizího přátelského grafu (viz
-- je_muj_pritel/je_blokovan_se_mnou, jednoargumentové schválně), a
-- vracet seznam by ho odhalilo stejně jistě jako dvouargumentová
-- verze pomocné funkce kdysi.
create function public.pocet_spolecnych_pratel(cil uuid)
returns integer
language sql
stable security definer
set search_path = ''
as $$
  with moji as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as id
    from public.friendships
    where status = 'accepted' and (requester_id = auth.uid() or addressee_id = auth.uid())
  ),
  jeho as (
    select case when requester_id = cil then addressee_id else requester_id end as id
    from public.friendships
    where status = 'accepted' and (requester_id = cil or addressee_id = cil)
  )
  select count(*)::int from moji join jeho using (id)
  where auth.uid() is not null and auth.uid() <> cil;
$$;

revoke execute on function public.pocet_spolecnych_pratel(uuid) from public, anon;
grant execute on function public.pocet_spolecnych_pratel(uuid) to authenticated;

-- Návrhy přátel — kandidáti seřazení podle počtu společných přátel,
-- capped na 8 (stejná zdrženlivost jako hledej_podle_jmena's limit 20 —
-- neomezený seznam by z appky udělal nástroj na mapování sociálního
-- grafu). Vyloučeni: já sám, už moji přátelé, čekající žádost oběma
-- směry, a kdokoli, kdo mě zablokoval nebo koho jsem zablokoval já.
create function public.navrhy_pratel()
returns table(id uuid, display_name text, avatar_url text, spolecni integer)
language sql
stable security definer
set search_path = ''
as $$
  with moji as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as id
    from public.friendships
    where status = 'accepted' and (requester_id = auth.uid() or addressee_id = auth.uid())
  ),
  kandidati as (
    select
      case when f.requester_id = m.id then f.addressee_id else f.requester_id end as kandidat_id,
      count(*) as spolecni
    from public.friendships f
    join moji m on f.requester_id = m.id or f.addressee_id = m.id
    where f.status = 'accepted'
    group by kandidat_id
  )
  select p.id, p.display_name, p.avatar_url, k.spolecni::int
  from kandidati k
  join public.profiles p on p.id = k.kandidat_id
  where auth.uid() is not null
    and k.kandidat_id <> auth.uid()
    and k.kandidat_id not in (select id from moji)
    and not exists (
      select 1 from public.friendships f2
      where f2.status = 'pending'
        and ((f2.requester_id = auth.uid() and f2.addressee_id = k.kandidat_id)
          or (f2.addressee_id = auth.uid() and f2.requester_id = k.kandidat_id))
    )
    and not public.je_blokovan_se_mnou(k.kandidat_id)
  order by k.spolecni desc
  limit 8;
$$;

revoke execute on function public.navrhy_pratel() from public, anon;
grant execute on function public.navrhy_pratel() to authenticated;
