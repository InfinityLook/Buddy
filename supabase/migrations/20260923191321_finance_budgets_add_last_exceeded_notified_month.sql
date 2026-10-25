alter table public.finance_budgets
  add column if not exists last_exceeded_notified_month text null;