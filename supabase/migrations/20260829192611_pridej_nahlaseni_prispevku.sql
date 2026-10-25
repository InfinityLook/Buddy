
-- ==========================================
-- Nahlásit příspěvek — report pipeline dřív pokrýval jen zprávy a
-- profilovou fotku (viz DuvodNahlaseni's nevhodne_foto), feed/mřížka
-- příspěvků neměly žádnou cestu k moderaci vůbec. Stejný stůl
-- (`reports`), jen druhý nepovinný cíl vedle message_id — reason/note
-- appka nechává beze změny (nevhodny_obsah/spam/jine se hodí i sem).
-- ==========================================

alter table public.reports add column post_id uuid references public.posts(id) on delete set null;

-- Moderátor smí vidět nahlášený příspěvek napřímo (ne přes
-- nacti_prispevky) — stejný vzor jako messages' "číst zprávy ze svých
-- chatů nebo nahlášené jako moderát": SELECT navíc, jen když k danému
-- příspěvku existuje hlášení.
create policy "vidět nahlášený příspěvek jako moderátor" on public.posts
  for select
  using (
    public.jsem_moderator()
    and exists (select 1 from public.reports r where r.post_id = posts.id)
  );

-- Smazání nahlášeného příspěvku moderátorem — posts.DELETE je jinak
-- jen pro vlastního autora, tohle je záměrně úzká výjimka (jen
-- příspěvek, co má aspoň jedno hlášení, ne "moderátor smaže cokoli"),
-- zalogovaná do audit_log stejně jako zabanuj_ze_social()/
-- admin_nastav_roli().
create or replace function public.moderator_smaz_prispevek(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_autor uuid;
begin
  if not public.jsem_moderator() then
    raise exception 'Přístup jen pro moderátory.' using errcode = '42501';
  end if;

  select user_id into v_autor from public.posts where id = p_post_id;
  if v_autor is null then
    raise exception 'Příspěvek neexistuje.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.reports where post_id = p_post_id) then
    raise exception 'Příspěvek nemá žádné hlášení.' using errcode = '42501';
  end if;

  delete from public.posts where id = p_post_id;

  perform public.zapis_audit_log(auth.uid(), 'smazat_prispevek', v_autor, jsonb_build_object('post_id', p_post_id));
end;
$$;

revoke all on function public.moderator_smaz_prispevek(uuid) from public;
revoke all on function public.moderator_smaz_prispevek(uuid) from anon;
grant execute on function public.moderator_smaz_prispevek(uuid) to authenticated;
