alter table public.finance_wallets
  add column if not exists pocatecni_zustatek numeric not null default 0;