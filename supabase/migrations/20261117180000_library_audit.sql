-- ==========================================================================
-- Library — fáze 4: audit změn katalogu.
--
-- Díla v katalogu zatím spravuje jen správce přímými zápisy do library_works
-- (politika "díla spravuje správce"). Aby zůstala stopa, kdo co zveřejnil,
-- skryl, smazal nebo doporučil, zapisuje změny trigger do audit_log — stejný
-- vzor (b) jako u hlášení a oznámení: klient do auditu nepíše, trigger
-- spustí vždy, ať přišla změna odkudkoli.
--
-- Zapisuje se jen tehdy, když změnu dělá přihlášený správce/moderátor.
-- Mazání účtu autora (cascade bez auth.uid()) a serverové úklidy se nelogují.
-- cil_id nese id DÍLA (audit_log.cil_id nemá cizí klíč), titul je v detailu.
-- ==========================================================================

create or replace function public.library_works_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_akce text;
  v_dilo uuid;
  v_titul text;
begin
  if auth.uid() is null or not (public.jsem_admin() or public.jsem_moderator()) then
    return null;
  end if;

  if tg_op = 'INSERT' then
    v_akce := 'knihovna_pridat_dilo';
    v_dilo := new.id;
    v_titul := new.title;
  elsif tg_op = 'DELETE' then
    v_akce := 'knihovna_smazat_dilo';
    v_dilo := old.id;
    v_titul := old.title;
  else
    v_dilo := new.id;
    v_titul := new.title;
    if new.status is distinct from old.status then
      v_akce := 'knihovna_stav_' || new.status;
    elsif new.featured_at is distinct from old.featured_at then
      v_akce := case when new.featured_at is null
                     then 'knihovna_zrusit_doporuceni' else 'knihovna_doporucit' end;
    elsif new.published_version_id is distinct from old.published_version_id then
      v_akce := 'knihovna_nova_verze';
    else
      return null;
    end if;
  end if;

  perform public.zapis_audit_log(
    auth.uid(), v_akce, v_dilo, jsonb_build_object('text', v_titul)
  );
  return null;
end;
$$;

create trigger library_works_audit_trg
  after insert or update or delete on public.library_works
  for each row execute function public.library_works_audit();

-- Triggerová funkce není určená k volání přes /rest/v1/rpc.
revoke all on function public.library_works_audit() from public, anon, authenticated;
