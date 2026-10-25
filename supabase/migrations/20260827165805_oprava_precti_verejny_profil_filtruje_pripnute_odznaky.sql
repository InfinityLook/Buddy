-- precti_verejny_profil vracelo pinned_badges přímo ze sloupce, bez
-- ověření, že si je uživatel doopravdy odemkl — profiles.pinned_badges
-- si uživatel může nastavit sám (vlastní UPDATE politika na profiles),
-- takže by šlo předstírat odznak, který nikdy nezískal. Filtr proti
-- user_badges tomu zabrání, stejně jistě jako appka samotná dovolí
-- připnout jen odznaky, co má.
create or replace function public.precti_verejny_profil(cil uuid)
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
         p.frame_id,
         coalesce(
           array(
             select b from unnest(p.pinned_badges) as b
             where b in (select badge_id from public.user_badges where user_id = cil)
           ),
           '{}'
         ) as pinned_badges,
         p.xp, p.level, p.streak_days,
         coalesce(r.role, 'user') as role
  from public.profiles p
  left join public.user_roles r
    on r.user_id = p.id and (r.valid_until is null or r.valid_until > now())
  where p.id = cil
    and auth.uid() is not null
    and not public.je_blokovan_se_mnou(cil);
$$;
