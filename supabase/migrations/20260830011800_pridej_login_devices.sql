create table public.login_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  popis text not null default 'Neznámé zařízení',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

alter table public.login_devices enable row level security;

-- Plain self-row politiky, stejná jednoduchost jako presence — appka
-- se sem ptá jen "moje vlastní zařízení", žádná SECURITY DEFINER funkce
-- není potřeba (na rozdíl od nacti_prispevky apod., tady nikdo nikdy
-- nečte data cizího účtu).
create policy "vidět vlastní zařízení" on public.login_devices
  for select using (user_id = auth.uid());

create policy "nahlásit vlastní zařízení" on public.login_devices
  for insert with check (user_id = auth.uid());

create policy "aktualizovat vlastní zařízení" on public.login_devices
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

alter publication supabase_realtime add table public.login_devices;