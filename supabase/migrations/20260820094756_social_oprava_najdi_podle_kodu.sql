-- Volala ještě starou dvouparametrovou verzi, která byla zrušena
-- v předchozí migraci.
create or replace function public.najdi_podle_kodu(kod text)
returns table (id uuid, display_name text, avatar_url text)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  where upper(replace(kod, '-', '')) = p.friend_code
    and p.id <> auth.uid()
    and not public.je_blokovan_se_mnou(p.id)
  limit 1;
$$;

revoke execute on function public.najdi_podle_kodu(text) from anon, public;
grant execute on function public.najdi_podle_kodu(text) to authenticated;