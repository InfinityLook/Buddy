-- ==========================================
-- Admin panel — přehledový snapshot.
--
-- jsem_admin() je záměrně striktnější než jsem_moderator(): ten pouští
-- moderator i admin k hlášením, tohle pustí jen admina k agregátům přes
-- celou databázi (počty účtů, zpráv...). Kdyby to sdílelo jednu funkci,
-- moderátor by dostal přístup k číslům, která mu nepatří.
--
-- admin_prehled() vrací jeden řádek agregátů. Není to live graf zátěže
-- Vercelu/Supabase (to vyžaduje tajný token, který nesmí ležet
-- v klientském kódu — viz CLAUDE.md), jen to, co se dá bezpečně spočítat
-- z vlastní databáze přes RLS-obcházející, ale rolí hlídanou funkci.
-- ==========================================

create or replace function public.jsem_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid()
      and r.role = 'admin'
      and (r.valid_until is null or r.valid_until > now())
  );
$$;

revoke all on function public.jsem_admin() from public;
grant execute on function public.jsem_admin() to authenticated;

create or replace function public.admin_prehled()
returns table (
  pocet_uctu bigint,
  pocet_hlaseni_celkem bigint,
  pocet_nevyrizenych_hlaseni bigint,
  pocet_zprav_24h bigint,
  pocet_chatu bigint,
  pocet_pratelstvi bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.jsem_admin() then
    raise exception 'Přístup jen pro administrátory.' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.reports),
    (select count(*) from public.reports where resolved_at is null),
    (select count(*) from public.messages where created_at > now() - interval '24 hours'),
    (select count(*) from public.chats),
    (select count(*) from public.friendships where status = 'accepted');
end;
$$;

revoke all on function public.admin_prehled() from public;
grant execute on function public.admin_prehled() to authenticated;