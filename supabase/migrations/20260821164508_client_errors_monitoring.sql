-- System monitoring: chyby zachycené přímo v prohlížeči (window.onerror,
-- unhandledrejection), ne zátěž Supabase/Vercelu — ta zůstává odložená,
-- protože vyžaduje tajný token (viz CLAUDE.md). Tohle nic tajného
-- nepotřebuje, jen normální přihlášenou relaci.

create table public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  message text not null check (char_length(message) <= 500),
  stack text check (stack is null or char_length(stack) <= 2000),
  url text check (url is null or char_length(url) <= 300),
  build_id text,
  created_at timestamptz not null default now()
);

alter table public.client_errors enable row level security;

-- Kdokoli přihlášený smí nahlásit chybu, ale jen za sebe — user_id se
-- bere z auth.uid() na serveru (default výš), ne z toho, co pošle
-- klient, stejná ochrana jako created_by u oznameni.
create policy "prihlaseny nahlasi chybu za sebe" on public.client_errors
  for insert
  with check (auth.uid() is not null and user_id = auth.uid());

-- Číst smí jen admin, stejně jako audit_log — nikdo jiný nemá potřebu
-- vidět, komu appka kolikrát spadla.
create policy "admin cte chyby aplikace" on public.client_errors
  for select
  using (public.jsem_admin());

create index client_errors_created_at_idx on public.client_errors (created_at desc);

create or replace function public.nacti_client_errors(pocet int default 50, posun int default 0)
returns table(id uuid, user_id uuid, uzivatel_jmeno text, message text, stack text, url text, build_id text, created_at timestamptz)
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
  select e.id, e.user_id, p.display_name, e.message, e.stack, e.url, e.build_id, e.created_at
  from public.client_errors e
  left join public.profiles p on p.id = e.user_id
  order by e.created_at desc
  limit least(pocet, 200) offset greatest(posun, 0);
end;
$function$;
