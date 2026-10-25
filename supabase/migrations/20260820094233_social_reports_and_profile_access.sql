-- Nahlášení. Blok jen schová, hlášení dá vědět — bez něj by obtěžování
-- nikdo nikdy neviděl.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_user_id uuid not null references auth.users (id) on delete cascade,
  message_id uuid references public.messages (id) on delete set null,
  reason text not null check (reason in ('spam', 'obtezovani', 'nevhodny_obsah', 'jine')),
  note text check (length(note) <= 1000),
  created_at timestamptz not null default now(),
  constraint reports_ne_sam_sebe check (reporter_id <> target_user_id)
);

alter table public.reports enable row level security;

create policy "nahlásit smí kdokoli sám za sebe"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- Vlastní hlášení si uživatel může přečíst, cizí ne. Vyřizovat je bude
-- správa přes service_role, na kterou pravidla neplatí.
create policy "vidět vlastní hlášení"
  on public.reports for select
  using (auth.uid() = reporter_id);

-- ==========================================
-- Přístup k cizím profilům
--
-- Dosud viděl každý jen svůj profil. Social potřebuje víc: jméno
-- a avatara přátel a spoluúčastníků chatů. Ne ale víc než to a ne
-- u kohokoliv.
-- ==========================================

drop policy if exists "Vlastní profil lze číst" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;

create policy "číst svůj profil, profily přátel a spoluúčastníků chatů"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.jsou_pratele(auth.uid(), id)
    or exists (
      select 1
      from public.chat_members m1
      join public.chat_members m2 on m1.chat_id = m2.chat_id
      where m1.user_id = auth.uid() and m2.user_id = public.profiles.id
    )
    -- Nevyřízená žádost: aby bylo vidět, kdo mě žádá o přátelství
    or exists (
      select 1 from public.friendships f
      where f.status = 'pending'
        and ((f.requester_id = auth.uid() and f.addressee_id = public.profiles.id)
          or (f.addressee_id = auth.uid() and f.requester_id = public.profiles.id))
    )
  );

-- ==========================================
-- Hledání podle kódu
--
-- Nejde přes běžné pravidlo: to by muselo pustit čtení všech profilů
-- a kdokoliv by si mohl stáhnout celý seznam uživatelů. Tahle funkce
-- vrátí jen shodu na přesný kód a jen jméno — nic víc se ven nedostane.
-- ==========================================
create or replace function public.najdi_podle_kodu(kod text)
returns table (id uuid, display_name text, avatar_url text)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  where upper(replace(kod, '-', '')) = p.friend_code
    and p.id <> auth.uid()
    and not public.je_blokovano(p.id, auth.uid())
  limit 1;
$$;

revoke execute on function public.najdi_podle_kodu(text) from anon, public;
grant execute on function public.najdi_podle_kodu(text) to authenticated;