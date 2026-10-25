
-- Fáze 3c (Social nav rework) — "Pro tebe": algoritmicky řazený feed,
-- na rozdíl od nacti_feed() (jen sledovaní, chronologicky) tenhle
-- zahrnuje i veřejné příspěvky od nesledovaných účtů (objevování).
-- Viditelnost kopíruje smi_videt_prispevky_uzivatele beze změny — ta
-- už sama vylučuje blokované a soukromé účty bez vzájemného přátelství,
-- takže "objevování" nikdy neukáže nic, co příjemce stejně nesmí vidět.
--
-- Kandidátní okno je omezené na posledních 14 dní — bez toho by
-- skórování muselo projít celou tabulku posts při každé stránce, a
-- doporučení starší dva týdny nejsou pro "co je teď zajímavé" úplně
-- k ničemu.
--
-- Skóre: (lajky + 2× komentáře) / (stáří v hodinách + 2)^1.5, plus
-- pevný bonus za sledovaný účet a za vlastní příspěvek — sledovaní
-- pořád mají navrch, objevování jen doplňuje, nepřebíjí.
--
-- Stránkování je keyset (skore, id) sestupně, ne kurzor na created_at
-- jako u nacti_feed — skóre není monotónní s časem, takže appka musí
-- posouvat podle dvojice (poslední skóre, poslední id), ne podle
-- jednoho pole.
create or replace function public.nacti_doporuceny_feed(
  kurzor_skore double precision default null,
  kurzor_id uuid default null,
  pocet integer default 10
)
returns table(
  id uuid,
  user_id uuid,
  media_path text,
  media_type text,
  caption text,
  created_at timestamptz,
  dalsi_media jsonb,
  edited_at timestamptz,
  skore double precision
)
language sql
stable
security definer
set search_path to ''
as $$
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
$$;

revoke all on function public.nacti_doporuceny_feed(double precision, uuid, integer) from public;
revoke all on function public.nacti_doporuceny_feed(double precision, uuid, integer) from anon;
grant execute on function public.nacti_doporuceny_feed(double precision, uuid, integer) to authenticated;
