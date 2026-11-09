-- Identita brání tomu, aby staré zrušení
-- nebo cron smazaly nový blok.

alter table public.pomodoro_casovace
  add column if not exists block_id text;

create index if not exists
  pomodoro_casovace_konci_idx
  on public.pomodoro_casovace (konci_v);
