-- Cloudová synchronizace Growth Roomu (Goal Tracker) — na rozdíl od
-- Writer's Roomu appka tady posílá cíl rozložený na sloupce (stejná
-- "záznam po záznamu, plochá data" konvence jako u Financí), ne jeden
-- JSONB blob — Goal je jeden plochý objekt s pár vnořenými poli
-- (milníky, dny odškrtnutí návyku), ne hluboký strom jako kniha/scénář/
-- komiks.

create table public.goal_tracker_goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  current_value integer not null default 0,
  target_value integer not null,
  unit text not null default '',
  category text not null,
  completed_at timestamptz null,
  -- Zone-less 'YYYY-MM-DD' řetězec, ne skutečné date — appka termín
  -- nikdy neparsuje jako Date/timestamp, stejná opatrnost jako u
  -- finance_goals.deadline vedle.
  deadline text null,
  priority text not null default 'stredni',
  poznamka text not null default '',
  milniky jsonb not null default '[]'::jsonb,
  typ text not null default 'cil',
  navyk_dny jsonb not null default '[]'::jsonb,
  navyk_xp_dny jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

alter table public.goal_tracker_goals enable row level security;

-- Stejná jednoduchá "vlastní řádek" politika jako u finance_wallets —
-- osobní data bez sociálního/moderátorského přesahu.
create policy "vlastni cile" on public.goal_tracker_goals
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index goal_tracker_goals_user_updated_idx on public.goal_tracker_goals (user_id, updated_at);
