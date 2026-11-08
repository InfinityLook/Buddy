-- Additive migration: run after existing migrations, before deploying this client.
-- Planner-specific extension, retaining the existing owner RLS policy.
alter table public.planer_ukoly add column if not exists planner_data jsonb not null default '{}'::jsonb;

-- The shared school sync already sends these fields/tables. Older repositories
-- lack their migrations; without them the shared sync aborts before Planner.
alter table public.rozvrh_hodiny add column if not exists tyden text not null default 'kazdy';
alter table public.kalendar_udalosti
  add column if not exists cas_od text,
  add column if not exists cas_do text,
  add column if not exists celodenni boolean not null default true,
  add column if not exists datum_do text,
  add column if not exists vyjimky jsonb not null default '[]'::jsonb,
  add column if not exists pripominka_minut integer;

create table if not exists public.rozvrh_prazdniny (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  nazev text not null, datum_od text not null, datum_do text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.rozvrh_zrusene_hodiny (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  hodina_id text not null, datum text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.rozvrh_presuny (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  hodina_id text not null, puvodni_datum text not null, novy_datum text not null,
  novy_cas_od text not null, novy_cas_do text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.rozvrh_semestry (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(), deleted_at timestamptz
);

do $migration$
declare table_name text;
begin
  foreach table_name in array array['rozvrh_prazdniny','rozvrh_zrusene_hodiny','rozvrh_presuny','rozvrh_semestry'] loop
    execute format('alter table public.%I enable row level security', table_name);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = table_name and policyname = 'school_owner_access') then
      execute format('create policy school_owner_access on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', table_name);
    end if;
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('create index if not exists %I on public.%I (user_id, updated_at)', table_name || '_user_updated_idx', table_name);
  end loop;
end
$migration$;
