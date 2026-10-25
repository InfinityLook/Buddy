-- ==========================================
-- social_bans nemá žádnou SELECT politiku (viz komentář u tabulky) —
-- admin panel ale potřebuje vědět, kdo je zabanovaný, aby u hlášení
-- ukázal správné tlačítko (Zabanovat / Odbanovat), ne aby si to musel
-- pamatovat sám. Stejný vzor jako admin_prehled(): SECURITY DEFINER
-- funkce gated přes jsem_admin(), ne rozšíření RLS.
-- ==========================================

create or replace function public.nacti_social_bany()
returns table (user_id uuid, banned_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.jsem_admin() then
    raise exception 'Přístup jen pro administrátory.' using errcode = '42501';
  end if;

  return query select sb.user_id, sb.banned_at from public.social_bans sb;
end;
$$;

revoke all on function public.nacti_social_bany() from public;
grant execute on function public.nacti_social_bany() to authenticated;