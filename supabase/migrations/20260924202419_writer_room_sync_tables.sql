-- Cloudová synchronizace Writer's Roomu — na rozdíl od Financí appka
-- tady nerozkládá dokument na sloupce (kapitoly/sceny/strany jsou
-- hluboko vnořené stromy, ne plochý seznam polí), ale posílá celou
-- knihu/scénář/komiks jako jeden JSONB blob ve sloupci `data`. Tři
-- oddělené tabulky, ne jedna sdílená s "druh" sloupcem — stejná
-- konvence jako u Financí (finance_transactions/wallets/budgets/...),
-- ať se sync nemusí učit filtrovat víc konfigurací nad jednou tabulkou.

create table public.writer_knihy (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.writer_scenare (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.writer_komiksy (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

alter table public.writer_knihy enable row level security;
alter table public.writer_scenare enable row level security;
alter table public.writer_komiksy enable row level security;

-- Stejná jednoduchá "vlastní řádek" politika jako u finance_wallets —
-- osobní data bez sociálního/moderátorského přesahu, žádná
-- SECURITY DEFINER funkce potřeba.
create policy "vlastni knihy" on public.writer_knihy
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "vlastni scenare" on public.writer_scenare
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "vlastni komiksy" on public.writer_komiksy
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index writer_knihy_user_updated_idx on public.writer_knihy (user_id, updated_at);
create index writer_scenare_user_updated_idx on public.writer_scenare (user_id, updated_at);
create index writer_komiksy_user_updated_idx on public.writer_komiksy (user_id, updated_at);
