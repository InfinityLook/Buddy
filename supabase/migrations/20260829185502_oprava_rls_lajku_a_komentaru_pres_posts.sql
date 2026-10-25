
-- Oprava: RLS politiky na post_likes/post_comments odkazovaly přímo na
-- `posts` přes obyčejný `exists (select ... from posts ...)`. `posts`
-- ale nemá vůbec žádnou plain SELECT politiku (čtení jde jen přes
-- nacti_prispevky(), SECURITY DEFINER) — takže tenhle exists uvnitř
-- jiné politiky běžel s právy volajícího, ne funkce, a vždycky vrátil
-- prázdno i pro majitele vlastního příspěvku. Lajk/komentář tak šlo
-- přidat/smazat jen v teorii, ve skutečnosti to RLS zamítlo vždycky —
-- chyba chycená testem před nasazením, ne až v produkci.

create or replace function public.smim_videt_prispevek(prispevek_id uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.posts p
    where p.id = prispevek_id and public.smi_videt_prispevky_uzivatele(p.user_id)
  );
$$;

create or replace function public.autor_prispevku(prispevek_id uuid)
returns uuid
language sql
stable security definer
set search_path = ''
as $$
  select user_id from public.posts where id = prispevek_id;
$$;

revoke all on function public.smim_videt_prispevek(uuid) from public;
revoke all on function public.smim_videt_prispevek(uuid) from anon;
grant execute on function public.smim_videt_prispevek(uuid) to authenticated;

revoke all on function public.autor_prispevku(uuid) from public;
revoke all on function public.autor_prispevku(uuid) from anon;
grant execute on function public.autor_prispevku(uuid) to authenticated;

drop policy "vidět lajky u příspěvků, které smím vidět" on public.post_likes;
create policy "vidět lajky u příspěvků, které smím vidět" on public.post_likes
  for select
  using (public.smim_videt_prispevek(post_id));

drop policy "lajkovat smí jen skutečný účet" on public.post_likes;
create policy "lajkovat smí jen skutečný účet" on public.post_likes
  for insert
  with check (
    user_id = auth.uid()
    and public.je_skutecny_ucet()
    and not public.je_zabanovan_ze_social()
    and public.smim_videt_prispevek(post_id)
  );

drop policy "vidět komentáře u příspěvků, které smím vidět" on public.post_comments;
create policy "vidět komentáře u příspěvků, které smím vidět" on public.post_comments
  for select
  using (public.smim_videt_prispevek(post_id));

drop policy "komentovat smí jen skutečný účet" on public.post_comments;
create policy "komentovat smí jen skutečný účet" on public.post_comments
  for insert
  with check (
    user_id = auth.uid()
    and public.je_skutecny_ucet()
    and not public.je_zabanovan_ze_social()
    and public.smim_videt_prispevek(post_id)
  );

drop policy "smazat komentář smí autor nebo majitel příspěvku" on public.post_comments;
create policy "smazat komentář smí autor nebo majitel příspěvku" on public.post_comments
  for delete
  using (
    user_id = auth.uid()
    or public.autor_prispevku(post_id) = auth.uid()
  );
