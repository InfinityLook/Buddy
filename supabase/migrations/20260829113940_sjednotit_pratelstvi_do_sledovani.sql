
-- ==========================================
-- Sjednocení "přátel" (friendships) a "sledování" (follows) do jednoho
-- vztahového modelu, jako na Instagramu: sledování je základní vztah,
-- žádost o schválení se objeví jen u soukromého účtu. Vzájemné (oboustranné)
-- sledování nahrazuje starý pojem "přítel" všude v appce (chat, tajný
-- chat, presence, počet společných přátel) — je_muj_pritel() níž zůstává
-- stejné jméno/podpis, jen jinak počítané, takže RLS na chats/messages/
-- presence/stories se vůbec nemusí měnit.
-- ==========================================

-- 1) Soukromý/veřejný profil
alter table public.profiles add column soukromy boolean not null default false;

-- 2) Stav sledování — 'prijato' u veřejného cíle hned, 'cekajici' u
--    soukromého, dokud ho cíl neschválí. Vždycky nastavuje server
--    (trigger níž), klient stav sám poslat nemůže.
alter table public.follows add column stav text not null default 'prijato'
  check (stav in ('cekajici', 'prijato'));

create or replace function public.nastav_stav_sledovani()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cilovy_soukromy boolean;
begin
  select soukromy into cilovy_soukromy from public.profiles where id = new.following_id;
  new.stav := case when coalesce(cilovy_soukromy, false) then 'cekajici' else 'prijato' end;
  return new;
end;
$$;

create trigger before_insert_follows_stav
  before insert on public.follows
  for each row execute function public.nastav_stav_sledovani();

-- 3) Odebrat sledujícího (nebo odmítnout jeho čekající žádost) smí jen
--    cíl vztahu — vedle existující "přestat sledovat smí jen sám za sebe"
--    (follower_id = auth.uid()). Bez podmínky na stav: umožňuje i
--    odebrání už schváleného sledujícího, ne jen odmítnutí žádosti,
--    a je to i to, co potřebuje zablokovat/-at (viz api.ts's zablokovat).
create policy "odebrat sledujícího nebo odmítnout žádost smí jen cíl" on public.follows
  for delete
  using (following_id = auth.uid());

-- 4) Schválení čekající žádosti — přes funkci, ne přes RLS UPDATE
--    politiku (ta by musela hlídat, že se nemění follower_id/following_id,
--    a tenhle projekt už na podobnou mezeru dřív narazil jinde). Stejný
--    vzor jako potvrd_tajny_chat/vyridit_tiket.
create or replace function public.schvalit_sledovani(sledujici uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.follows
  set stav = 'prijato'
  where follower_id = sledujici and following_id = auth.uid() and stav = 'cekajici';
end;
$$;

revoke all on function public.schvalit_sledovani(uuid) from public;
revoke all on function public.schvalit_sledovani(uuid) from anon;
grant execute on function public.schvalit_sledovani(uuid) to authenticated;

-- 5) je_muj_pritel = vzájemné, oboje 'prijato' sledování. Stejný název/
--    podpis jako dřív — všechno, co ho volá (zaloz_chat, RLS na stories/
--    chat_members/presence/tajne_chaty), se nemusí ani dotknout.
create or replace function public.je_muj_pritel(druhy uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.follows a
      where a.follower_id = auth.uid() and a.following_id = druhy and a.stav = 'prijato'
    )
    and exists (
      select 1 from public.follows b
      where b.follower_id = druhy and b.following_id = auth.uid() and b.stav = 'prijato'
    );
$$;

-- 6) Společní přátelé / návrhy — dřív nad friendships, teď nad
--    vzájemným (oboustranně 'prijato') sledováním.
create or replace function public.pocet_spolecnych_pratel(cil uuid)
returns integer
language sql
stable security definer
set search_path = ''
as $$
  with moji as (
    select a.following_id as id
    from public.follows a
    join public.follows b on b.follower_id = a.following_id and b.following_id = a.follower_id and b.stav = 'prijato'
    where a.follower_id = auth.uid() and a.stav = 'prijato'
  ),
  jeho as (
    select a.following_id as id
    from public.follows a
    join public.follows b on b.follower_id = a.following_id and b.following_id = a.follower_id and b.stav = 'prijato'
    where a.follower_id = cil and a.stav = 'prijato'
  )
  select count(*)::int from moji join jeho using (id)
  where auth.uid() is not null and auth.uid() <> cil;
$$;

create or replace function public.navrhy_pratel()
returns table(id uuid, display_name text, avatar_url text, spolecni integer)
language sql
stable security definer
set search_path = ''
as $$
  with moji as (
    select a.following_id as id
    from public.follows a
    join public.follows b on b.follower_id = a.following_id and b.following_id = a.follower_id and b.stav = 'prijato'
    where a.follower_id = auth.uid() and a.stav = 'prijato'
  ),
  kandidati as (
    select
      case when f.follower_id = m.id then f.following_id else f.follower_id end as kandidat_id,
      count(*) as spolecni
    from public.follows f
    join moji m on f.follower_id = m.id or f.following_id = m.id
    where f.stav = 'prijato'
    group by kandidat_id
  )
  select p.id, p.display_name, p.avatar_url, k.spolecni::int
  from kandidati k
  join public.profiles p on p.id = k.kandidat_id
  where auth.uid() is not null
    and k.kandidat_id <> auth.uid()
    and k.kandidat_id not in (select id from moji)
    and not exists (
      select 1 from public.follows f2
      where f2.follower_id = auth.uid() and f2.following_id = k.kandidat_id
    )
    and not public.je_blokovan_se_mnou(k.kandidat_id)
  order by k.spolecni desc
  limit 8;
$$;

-- 7) Seznam vlastních přátel (vzájemné sledování) — nahrazuje dřívější
--    přímé čtení tabulky friendships v api.ts's nactiPratele().
create or replace function public.moji_pratele()
returns table(id uuid, display_name text, avatar_url text)
language sql
stable security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.avatar_url
  from public.follows a
  join public.follows b on b.follower_id = a.following_id and b.following_id = a.follower_id and b.stav = 'prijato'
  join public.profiles p on p.id = a.following_id
  where a.follower_id = auth.uid() and a.stav = 'prijato';
$$;

revoke all on function public.moji_pratele() from public;
revoke all on function public.moji_pratele() from anon;
grant execute on function public.moji_pratele() to authenticated;

-- 8) Admin přehled počítal "pratelstvi" jako accepted friendships —
--    teď jako počet vzájemně schválených dvojic (ne řádků, ty jsou dva
--    na dvojici).
create or replace function public.admin_prehled()
returns table(
  pocet_uctu bigint,
  pocet_hlaseni_celkem bigint,
  pocet_nevyrizenych_hlaseni bigint,
  pocet_zprav_24h bigint,
  pocet_chatu bigint,
  pocet_pratelstvi bigint
)
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  if not public.jsem_admin() then
    raise exception 'Přístup jen pro administrátory.' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.reports),
    (select count(*) from public.reports where resolved_at is null),
    (select count(*) from public.messages where created_at > now() - interval '24 hours'),
    (select count(*) from public.chats),
    (select count(*) / 2 from public.follows a
       join public.follows b on b.follower_id = a.following_id and b.following_id = a.follower_id and b.stav = 'prijato'
       where a.stav = 'prijato');
end;
$$;

-- 9) precti_verejny_profil teď vrací i soukromy, ať appka ví, jestli
--    má ukázat "Sledovat" nebo "Požádat o sledování" a jestli mřížku
--    příspěvků skrýt, dokud sledování neschválí. Návratový typ se mění
--    (nový sloupec), proto DROP + CREATE, ne jen OR REPLACE.
drop function public.precti_verejny_profil(uuid);
create function public.precti_verejny_profil(cil uuid)
returns table(
  display_name text, avatar_url text, banner_url text, motto text, bio text,
  frame_id text, pinned_badges text[], xp integer, level integer, streak_days integer,
  role text, soukromy boolean
)
language sql
stable security definer
set search_path = ''
as $$
  select p.display_name, p.avatar_url, p.banner_url, p.motto, p.bio,
         p.frame_id,
         coalesce(
           array(
             select b from unnest(p.pinned_badges) as b
             where b in (select badge_id from public.user_badges where user_id = cil)
           ),
           '{}'
         ) as pinned_badges,
         p.xp, p.level, p.streak_days,
         coalesce(r.role, 'user') as role,
         p.soukromy
  from public.profiles p
  left join public.user_roles r
    on r.user_id = p.id and (r.valid_until is null or r.valid_until > now())
  where p.id = cil
    and auth.uid() is not null
    and not public.je_blokovan_se_mnou(cil);
$$;

revoke all on function public.precti_verejny_profil(uuid) from public;
revoke all on function public.precti_verejny_profil(uuid) from anon;
grant execute on function public.precti_verejny_profil(uuid) to authenticated;

-- 10) Příspěvky soukromého účtu vidí jen jeho autor a jeho (vzájemní)
--     přátelé — jinak zůstává veřejné jako dřív. Bez tohohle by
--     "soukromý účet" chránil jen sledování, ne obsah, který je stejně
--     vidět každému.
create or replace function public.nacti_prispevky(cil uuid)
returns table(id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamptz)
language sql
stable security definer
set search_path = 'public'
as $$
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  where p.user_id = cil
    and auth.uid() is not null
    and not public.je_blokovan_se_mnou(cil)
    and (not pr.soukromy or cil = auth.uid() or public.je_muj_pritel(cil))
  order by p.created_at desc;
$$;

-- 11) Profil je čitelný i mezi stranami čekající žádosti o sledování
--     (dřív friendships.status='pending'), ať se v seznamu žádostí
--     zobrazí jméno/avatar protistrany.
drop policy "číst svůj profil, profily přátel a spoluúčastníků chat" on public.profiles;
create policy "číst svůj profil, profily přátel a spoluúčastníků chat" on public.profiles
  for select
  using (
    (auth.uid() = id)
    or je_muj_pritel(id)
    or (exists (
      select 1 from chat_members m1
      join chat_members m2 on m1.chat_id = m2.chat_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    ))
    or (exists (
      select 1 from public.follows f
      where f.stav = 'cekajici'
        and ((f.follower_id = auth.uid() and f.following_id = profiles.id)
          or (f.following_id = auth.uid() and f.follower_id = profiles.id))
    ))
    or (jsem_moderator() and exists (
      select 1 from reports r
      where r.target_user_id = profiles.id or r.reporter_id = profiles.id
    ))
  );

-- 12) Data: schválená přátelství se stávají vzájemným (oboustranným)
--     schváleným sledováním. Čekající žádosti o přátelství se ruší
--     (podle rozhodnutí, ne migrují) — prostě se nepřenášejí.
insert into public.follows (follower_id, following_id, stav)
select requester_id, addressee_id, 'prijato' from public.friendships where status = 'accepted'
union
select addressee_id, requester_id, 'prijato' from public.friendships where status = 'accepted'
on conflict (follower_id, following_id) do update set stav = 'prijato';

-- 13) follows do realtime publikace (žádosti se musí objevit samy,
--     stejně jako dřív friendships).
alter publication supabase_realtime add table public.follows;

-- 14) friendships je nahrazené — nic v appce ho po týhle migraci
--     (a odpovídající úpravě klienta) už nečte ani nezapisuje.
drop table public.friendships;
