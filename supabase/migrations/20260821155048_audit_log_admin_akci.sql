-- ==========================================
-- Audit log administrátorských akcí. Žádná INSERT/UPDATE/DELETE
-- politika pro nikoho -- zápis jde výhradně přes SECURITY DEFINER
-- funkce a triggery níže, stejný vzor jako social_bans a user_roles.
-- ==========================================

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id),
  akce text not null,
  cil_id uuid,
  detail jsonb,
  vytvoreno_v timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "admin cte audit log"
  on public.audit_log
  for select
  using (public.jsem_admin());

create index audit_log_vytvoreno_v_idx on public.audit_log (vytvoreno_v desc);

-- Tenčká pomocná funkce pro zápis -- SECURITY DEFINER, obéd strany
-- (SECURITY DEFINER funkce i triggery niže) ji volá misto opakování
-- stejného insertu na pět místech.
create or replace function public.zapis_audit_log(p_admin_id uuid, p_akce text, p_cil_id uuid, p_detail jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  insert into public.audit_log (admin_id, akce, cil_id, detail)
  values (p_admin_id, p_akce, p_cil_id, p_detail);
end;
$function$;

-- ---------- zabanuj_ze_social: přidán zápis do logu ----------

create or replace function public.zabanuj_ze_social(cil uuid, zabanovat boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.jsem_admin() then
    raise exception 'Přístup jen pro administrátory.' using errcode = '42501';
  end if;

  if zabanovat then
    insert into public.social_bans (user_id, banned_by)
    values (cil, auth.uid())
    on conflict (user_id) do nothing;
  else
    delete from public.social_bans where user_id = cil;
  end if;

  perform public.zapis_audit_log(auth.uid(), case when zabanovat then 'ban_social' else 'unban_social' end, cil, null);
end;
$function$;

-- ---------- trigger: vyřízení hlášení (reports.resolved_at null -> not null) ----------

create or replace function public.zaznamenej_vyrizeni_hlaseni()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.resolved_at is not null and old.resolved_at is null then
    perform public.zapis_audit_log(
      new.resolved_by,
      'vyridit_hlaseni',
      new.target_user_id,
      jsonb_build_object('hlaseni_id', new.id, 'vysledek', new.resolution)
    );
  end if;
  return new;
end;
$function$;

create trigger po_vyrizeni_hlaseni
  after update on public.reports
  for each row execute function public.zaznamenej_vyrizeni_hlaseni();

-- ---------- trigger: odeslání/smazání oznamování ----------

create or replace function public.zaznamenej_oznameni()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if tg_op = 'INSERT' then
    perform public.zapis_audit_log(
      new.created_by,
      'poslat_oznameni',
      null,
      jsonb_build_object('oznameni_id', new.id, 'text', left(new.text, 200))
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform public.zapis_audit_log(
      auth.uid(),
      'smazat_oznameni',
      null,
      jsonb_build_object('oznameni_id', old.id, 'text', left(old.text, 200))
    );
    return old;
  end if;
  return null;
end;
$function$;

create trigger po_zmene_oznameni
  after insert or delete on public.oznameni
  for each row execute function public.zaznamenej_oznameni();

-- ---------- čtení logu, admin-gated, se čitelnými jmény ----------

create or replace function public.nacti_audit_log(pocet int default 50, posun int default 0)
returns table(
  id uuid,
  admin_id uuid,
  admin_jmeno text,
  akce text,
  cil_id uuid,
  cil_jmeno text,
  detail jsonb,
  vytvoreno_v timestamptz
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not public.jsem_admin() then
    raise exception 'Přístup jen pro administrátory.' using errcode = '42501';
  end if;

  return query
    select l.id, l.admin_id, pa.display_name, l.akce, l.cil_id, pc.display_name, l.detail, l.vytvoreno_v
    from public.audit_log l
    left join public.profiles pa on pa.id = l.admin_id
    left join public.profiles pc on pc.id = l.cil_id
    order by l.vytvoreno_v desc
    limit least(pocet, 200) offset greatest(posun, 0);
end;
$function$;
