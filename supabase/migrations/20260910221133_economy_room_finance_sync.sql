-- Economy Room (Finance) cloudová synchronizace — offline-first: appka
-- píše okamžitě do IndexedDB, tahle sada tabulek je jen zrcadlo pro
-- přenos mezi zařízeními. id je stejný text řetězec, jaký appka už
-- generuje lokálně (Date.now()-random), ne server-generated uuid — díky
-- tomu je upsert podle id idempotentní bez remapování mezi zařízeními.
-- Mazání je měkké (deleted_at), stejný důvod jako messages.deleted_at:
-- tvrdé DELETE by se na jiném zařízení, co si smazání ještě nestáhlo,
-- nikdy neprojevilo — s tombstone řádkem ho pull krok pozná a smaže
-- i lokálně.

create table public.finance_transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('prijem', 'vydaj')),
  amount integer not null check (amount >= 0),
  category text not null,
  note text not null default '',
  date text not null,
  wallet_id text,
  receipt_id text,
  receipt_mime text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.finance_wallets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.finance_budgets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  limit_kc integer not null check (limit_kc >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.finance_recurring (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('prijem', 'vydaj')),
  amount integer not null check (amount >= 0),
  category text not null,
  note text not null default '',
  day_of_month integer not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  last_added_month text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.finance_goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount integer not null check (target_amount >= 0),
  deadline text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.finance_transactions enable row level security;
alter table public.finance_wallets enable row level security;
alter table public.finance_budgets enable row level security;
alter table public.finance_recurring enable row level security;
alter table public.finance_goals enable row level security;

-- Čistě vlastní data, nikdo jiný je nikdy nesmí vidět ani měnit — jedna
-- FOR ALL politika na tabulku, stejná jednoduchost jako presence/
-- push_prihlaseni/login_devices, žádná SECURITY DEFINER funkce
-- (nic tu nikdy nepotřebuje číst cizí řádek).
create policy "vlastni transakce" on public.finance_transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "vlastni penezenky" on public.finance_wallets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "vlastni rozpocty" on public.finance_budgets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "vlastni opakujici se transakce" on public.finance_recurring
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "vlastni financni cile" on public.finance_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Indexy pro pull krok (updated_at > kurzor, jen vlastní řádky).
create index finance_transactions_user_updated_idx on public.finance_transactions (user_id, updated_at);
create index finance_wallets_user_updated_idx on public.finance_wallets (user_id, updated_at);
create index finance_budgets_user_updated_idx on public.finance_budgets (user_id, updated_at);
create index finance_recurring_user_updated_idx on public.finance_recurring (user_id, updated_at);
create index finance_goals_user_updated_idx on public.finance_goals (user_id, updated_at);
