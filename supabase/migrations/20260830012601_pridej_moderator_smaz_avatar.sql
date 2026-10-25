create or replace function public.moderator_smaz_avatar(cil uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.jsem_moderator() then
    raise exception 'Přístup jen pro moderátory.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = cil) then
    raise exception 'Účet neexistuje.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.reports where target_user_id = cil and reason = 'nevhodne_foto') then
    raise exception 'Účet nemá hlášení na nevhodnou fotku.' using errcode = '42501';
  end if;

  update public.profiles set avatar_url = null where id = cil;

  perform public.zapis_audit_log(auth.uid(), 'smazat_avatar', cil, '{}'::jsonb);
end;
$$;

revoke all on function public.moderator_smaz_avatar(uuid) from public, anon;
grant execute on function public.moderator_smaz_avatar(uuid) to authenticated;