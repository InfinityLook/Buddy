-- User management pro admin panel: procházení/hledání účtů a změna
-- role. Bany (Social i celá appka) už existují z dřívějška
-- (zabanuj_ze_social, api/admin-ban.ts) a tenhle panel je jen
-- znovu použije pro účty mimo kontext konkrétního hlášení.

create or replace function public.admin_seznam_uctu(hledat text default null, pocet int default 50, posun int default 0)
returns table(id uuid, display_name text, friend_code text, xp int, level int, streak_days int, role text, valid_until timestamptz)
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
  select p.id, p.display_name, p.friend_code, p.xp, p.level, p.streak_days,
         coalesce(r.role, 'user'), r.valid_until
  from public.profiles p
  left join public.user_roles r on r.user_id = p.id
  where hledat is null or btrim(hledat) = ''
     or p.display_name ilike '%' || hledat || '%'
     or p.friend_code ilike hledat
     or p.id::text = hledat
  order by p.updated_at desc
  limit least(greatest(pocet, 1), 100)
  offset greatest(posun, 0);
end;
$function$;

create or replace function public.admin_nastav_roli(cil uuid, nova_role text, plati_do timestamptz default null)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.jsem_admin() then
    raise exception 'Přístup jen pro administrátory.' using errcode = '42501';
  end if;

  if cil = auth.uid() then
    raise exception 'Nejde měnit vlastní roli — riziko, že si admin sám sobě omylem sebere přístup.' using errcode = '42501';
  end if;

  if nova_role not in ('user', 'vip', 'moderator', 'admin') then
    raise exception 'Neplatná role.' using errcode = '22023';
  end if;

  insert into public.user_roles (user_id, role, valid_until, granted_at)
  values (cil, nova_role, plati_do, now())
  on conflict (user_id) do update
    set role = excluded.role, valid_until = excluded.valid_until, granted_at = now();

  perform public.zapis_audit_log(auth.uid(), 'nastavit_roli', cil, jsonb_build_object('role', nova_role));
end;
$function$;
