-- Skutečná push notifikace pro Pomodoro i po tvrdém zavření appky.
-- Dvě tabulky: kam poslat (push_prihlaseni, Web Push subscription na
-- zařízení) a co poslat kdy (pomodoro_casovace, jeden běžící časovač na
-- uživatele). Obě čistě self-service přes plain RLS — klient čte/píše
-- jen svůj vlastní řádek, žádná SECURITY DEFINER funkce není potřeba,
-- protože nejde o nic citlivějšího než "tohle je moje zařízení / můj
-- časovač". Skutečně privilegovaný přístup (číst přes všechny uživatele
-- najednou, aby cron věděl, komu poslat push) má jen api/pomodoro-push.ts
-- přes service role klíč, stejný vzor jako api/admin-ban.ts.

create table public.push_prihlaseni (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_klic text not null,
  created_at timestamptz not null default now()
);

alter table public.push_prihlaseni enable row level security;

create policy "cti vlastni push prihlaseni"
  on public.push_prihlaseni for select
  to authenticated
  using (user_id = auth.uid());

create policy "nahraj vlastni push prihlaseni"
  on public.push_prihlaseni for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "aktualizuj vlastni push prihlaseni"
  on public.push_prihlaseni for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "smaz vlastni push prihlaseni"
  on public.push_prihlaseni for delete
  to authenticated
  using (user_id = auth.uid());

-- Jeden řádek na uživatele — nový běžící blok ten předchozí prostě
-- přepíše (upsert on_conflict=user_id), historie tu nemá smysl
-- (na to slouží místní completedSessions v usePomodoro.ts).
create table public.pomodoro_casovace (
  user_id uuid primary key references auth.users(id) on delete cascade,
  konci_v timestamptz not null,
  rezim text not null check (rezim in ('prace', 'pauza')),
  aktualizovano_v timestamptz not null default now()
);

alter table public.pomodoro_casovace enable row level security;

create policy "cti vlastni pomodoro casovac"
  on public.pomodoro_casovace for select
  to authenticated
  using (user_id = auth.uid());

create policy "nastav vlastni pomodoro casovac"
  on public.pomodoro_casovace for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "aktualizuj vlastni pomodoro casovac"
  on public.pomodoro_casovace for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "smaz vlastni pomodoro casovac"
  on public.pomodoro_casovace for delete
  to authenticated
  using (user_id = auth.uid());
