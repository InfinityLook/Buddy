-- ==========================================
-- Oznámení od správy — upozornění na update, soutěže apod., která
-- napíše admin a uvidí je každý přihlášený.
--
-- Na rozdíl od social_bans/user_roles tahle tabulka nepotřebuje
-- SECURITY DEFINER wrapper na zápis: admin nezasahuje do cizího řádku
-- ani nedělá nic složitějšího než "vlož řádek", takže obyčejná RLS
-- INSERT politika volající jsem_admin() stačí a je to o kus čitelnější
-- než další RPC funkce.
--
-- created_by má DEFAULT auth.uid(), ne hodnotu poslanou z klienta —
-- stejný důvod, proč social_bans.banned_by nikdy nebere id z těla
-- požadavku: klient by si mohl das vymyslet cizí id.
-- ==========================================

create table public.oznameni (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(btrim(text)) > 0 and char_length(text) <= 500),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references public.profiles(id)
);

alter table public.oznameni enable row level security;

-- Plošné upozornění pro všechny — kdokoli se skutečným účtem ho smí
-- číst, není to ničí soukromý obsah.
create policy "kdokoli prihlaseny cte oznameni"
  on public.oznameni for select
  using (auth.uid() is not null);

create policy "psat smi jen admin"
  on public.oznameni for insert
  with check (public.jsem_admin() and created_by = auth.uid());

create policy "mazat smi jen admin"
  on public.oznameni for delete
  using (public.jsem_admin());

alter publication supabase_realtime add table public.oznameni;