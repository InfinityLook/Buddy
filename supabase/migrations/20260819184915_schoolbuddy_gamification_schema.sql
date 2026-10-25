-- Puvodni tabulka profiles pochazela z jine verze aplikace (sloupec
-- active_module, id jako text) a mela zcela otevrena pravidla: SELECT,
-- INSERT i UPDATE pro kohokoliv s podminkou true. Protoze verejny klic
-- Supabase je soucasti staženeho JavaScriptu, mohl kdokoliv cist
-- a prepisovat data vsem. Tabulka je prazdna (0 radku), takze ji
-- nahrazujeme schematem vazanym na auth.uid().
drop table if exists public.profiles cascade;

-- Jeden radek na uzivatele. Anonymni prihlaseni vytvori zaznam
-- v auth.users, na ktery se tady odkazujeme.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Student',
  motto text not null default '',
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  streak_days integer not null default 0 check (streak_days >= 0),
  -- Aplikace drzi datum posledni aktivity jako retezec, ne timestamp
  last_active_date text,
  updated_at timestamptz not null default now()
);

-- Odemcene odznaky. Definice odznaku (nazev, popis, ikona) zustava
-- v kodu aplikace, v databazi je jen to, co patri uzivateli.
create table public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- Pocitadla cinnosti (flashcard, note, mindNode, document, file, calculation)
create table public.activity_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, kind)
);

-- Zebricek podle XP se bude ptat na serazeni
create index profiles_xp_idx on public.profiles (xp desc);

alter table public.profiles enable row level security;
alter table public.user_badges enable row level security;
alter table public.activity_counters enable row level security;

-- Kazdy vidi a meni jen sve vlastni radky.
create policy "Vlastnik cte svuj profil" on public.profiles
  for select using (auth.uid() = id);
create policy "Vlastnik zaklada svuj profil" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Vlastnik upravuje svuj profil" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Vlastnik cte sve odznaky" on public.user_badges
  for select using (auth.uid() = user_id);
create policy "Vlastnik zaklada sve odznaky" on public.user_badges
  for insert with check (auth.uid() = user_id);
create policy "Vlastnik upravuje sve odznaky" on public.user_badges
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Vlastnik cte sva pocitadla" on public.activity_counters
  for select using (auth.uid() = user_id);
create policy "Vlastnik zaklada sva pocitadla" on public.activity_counters
  for insert with check (auth.uid() = user_id);
create policy "Vlastnik upravuje sva pocitadla" on public.activity_counters
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at se ma udrzovat sam, ne spolehat na klienta
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();