
-- Lajk na komentář — stejný tvar jako post_likes, jen o úroveň níž.
-- Žádné post_id na téhle tabulce (na rozdíl od message_reactions, kde
-- se chat_id denormalizuje kvůli Realtime filtru) — komentáře appka
-- nesleduje přes Realtime, takže tenhle důvod tu neplatí, a viditelnost
-- jde ověřit jedním exists() na post_comments, jejíž vlastní RLS
-- (smim_videt_prispevek) se v poddotazu uplatní sama za sebe.
create table public.comment_likes (
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_likes enable row level security;

create policy "vidět lajky komentářů u příspěvků, které smím vidět" on public.comment_likes
  for select using (
    exists (select 1 from public.post_comments c where c.id = comment_likes.comment_id)
  );

-- exists() dělá dvojí práci: post_comments' vlastní RLS uvnitř poddotazu
-- už samo omezí na "vidím ten příspěvek", a stejná klauzule navíc
-- vyloučí lajk komentáře od člověka, co mě zablokoval nebo koho jsem
-- zablokoval já (stejný "not je_blokovan_se_mnou" požadavek jako
-- u message_reactions, jen tady bez druhého sloupce navíc).
create policy "lajkovat komentář smí jen skutečný účet" on public.comment_likes
  for insert with check (
    user_id = auth.uid()
    and je_skutecny_ucet()
    and not je_zabanovan_ze_social()
    and exists (
      select 1 from public.post_comments c
      where c.id = comment_likes.comment_id
        and not je_blokovan_se_mnou(c.user_id)
    )
  );

create policy "odebrat lajk komentáře smí jen sám za sebe" on public.comment_likes
  for delete using (user_id = auth.uid());

-- nacti_komentare_prispevku() se mění z DROP+CREATE, ne jen CREATE OR
-- REPLACE — Postgres neumí OR REPLACE, když se mění sada výstupních
-- sloupců.
drop function public.nacti_komentare_prispevku(uuid);

create function public.nacti_komentare_prispevku(p_post_id uuid)
returns table (
  id uuid,
  post_id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  text text,
  created_at timestamptz,
  reply_to_id uuid,
  pocet_lajku bigint,
  lajkuji_ja boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Přístup jen pro přihlášené.' using errcode = '42501';
  end if;
  if not public.smim_videt_prispevek(p_post_id) then
    raise exception 'K tomuhle příspěvku nemáš přístup.' using errcode = '42501';
  end if;

  return query
  select
    c.id, c.post_id, c.user_id, p.display_name, p.avatar_url, c.text, c.created_at, c.reply_to_id,
    coalesce(l.pocet, 0) as pocet_lajku,
    coalesce(l.lajkuji_ja, false) as lajkuji_ja
  from public.post_comments c
  join public.profiles p on p.id = c.user_id
  left join lateral (
    select count(*) as pocet, bool_or(cl.user_id = auth.uid()) as lajkuji_ja
    from public.comment_likes cl
    where cl.comment_id = c.id
  ) l on true
  where c.post_id = p_post_id
  order by c.created_at asc;
end;
$$;

revoke all on function public.nacti_komentare_prispevku(uuid) from public, anon;
grant execute on function public.nacti_komentare_prispevku(uuid) to authenticated;
