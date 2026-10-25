-- Detailní analytika pro Přehled admin panelu: růstový graf (nové
-- účty a zprávy po dnech) a rozpad aktivity podle druhu činnosti.
-- Všechno admin-gated stejně jako admin_prehled() — jsem_admin()
-- kontrola uvnitř, ne jen na klientu.

create or replace function public.admin_rustovy_graf(dny int default 14)
returns table(den date, novych_uctu bigint, novych_zprav bigint)
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
  select
    d::date,
    (select count(*) from auth.users u
       where u.is_anonymous = false and u.created_at::date = d::date),
    (select count(*) from public.messages m
       where m.created_at::date = d::date)
  from generate_series(
    current_date - (least(greatest(dny, 1), 90) - 1),
    current_date,
    interval '1 day'
  ) as d
  order by d;
end;
$function$;

create or replace function public.admin_aktivita_podle_druhu()
returns table(kind text, celkem bigint)
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
  select c.kind, sum(c.count)::bigint as celkem
  from public.activity_counters c
  group by c.kind
  order by celkem desc;
end;
$function$;

create or replace function public.admin_top_odznaky(pocet int default 5)
returns table(badge_id text, celkem bigint)
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
  select b.badge_id, count(*)::bigint as celkem
  from public.user_badges b
  group by b.badge_id
  order by celkem desc
  limit least(greatest(pocet, 1), 30);
end;
$function$;
