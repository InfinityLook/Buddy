
-- ==========================================
-- Cloudová synchronizace školní skupiny (Rozvrh/Docházka/Známky/Planer/
-- Kalendář/Barvy dne) — stejná "id text primary key, user_id, created_at/
-- updated_at/deleted_at, jedna RLS policy" konvence jako writer_knihy/
-- goal_tracker_goals, sdílejí ale JEDEN kurzor v skolaSync.ts (stejně
-- jako Finance sdílí jeden kurzor napříč pěti tabulkami).
-- ==========================================

create table public.rozvrh_hodiny (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  den integer not null,
  cas_od text not null,
  cas_do text not null,
  predmet text not null,
  mistnost text not null default '',
  vyucujici text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);
alter table public.rozvrh_hodiny enable row level security;
create policy "vlastni hodiny rozvrhu" on public.rozvrh_hodiny
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index rozvrh_hodiny_user_updated_idx on public.rozvrh_hodiny (user_id, updated_at);

create table public.rozvrh_dochazka (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  hodina_id text not null,
  datum text not null,
  byl boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);
alter table public.rozvrh_dochazka enable row level security;
create policy "vlastni dochazka rozvrhu" on public.rozvrh_dochazka
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index rozvrh_dochazka_user_updated_idx on public.rozvrh_dochazka (user_id, updated_at);

create table public.znamky_predmety (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nazev text not null,
  kredity integer not null default 0,
  znamky jsonb not null default '[]'::jsonb,
  cil numeric null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);
alter table public.znamky_predmety enable row level security;
create policy "vlastni predmety znamek" on public.znamky_predmety
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index znamky_predmety_user_updated_idx on public.znamky_predmety (user_id, updated_at);

create table public.planer_ukoly (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  due_date text not null,
  priority text not null default 'Střední',
  completed boolean not null default false,
  podukoly jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);
alter table public.planer_ukoly enable row level security;
create policy "vlastni ukoly planeru" on public.planer_ukoly
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index planer_ukoly_user_updated_idx on public.planer_ukoly (user_id, updated_at);

create table public.kalendar_udalosti (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  datum text not null,
  nazev text not null,
  popis text not null default '',
  opakovani text not null default 'zadne',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);
alter table public.kalendar_udalosti enable row level security;
create policy "vlastni udalosti kalendare" on public.kalendar_udalosti
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index kalendar_udalosti_user_updated_idx on public.kalendar_udalosti (user_id, updated_at);

create table public.kalendar_barvy_dne (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  datum text not null,
  barva text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);
alter table public.kalendar_barvy_dne enable row level security;
create policy "vlastni barvy dne kalendare" on public.kalendar_barvy_dne
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index kalendar_barvy_dne_user_updated_idx on public.kalendar_barvy_dne (user_id, updated_at);
