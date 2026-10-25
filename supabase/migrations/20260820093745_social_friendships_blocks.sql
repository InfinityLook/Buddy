-- Blokování a přátelství.
--
-- Blok se vyhodnocuje v obou směrech: koho zablokuješ ty, ani ten, kdo
-- zablokoval tebe, ti nemůže poslat žádost ani zprávu. Kdyby platil jen
-- jedním směrem, dal by se obejít tím, že blokovaný pošle žádost první.

create table if not exists public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_ne_sam_sebe check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "vlastní bloky lze číst"
  on public.blocks for select
  using (auth.uid() = blocker_id);

create policy "blokovat smí jen sám za sebe"
  on public.blocks for insert
  with check (auth.uid() = blocker_id);

create policy "odblokovat smí jen sám za sebe"
  on public.blocks for delete
  using (auth.uid() = blocker_id);

-- Existuje mezi dvěma lidmi blok v kterémkoli směru?
-- SECURITY DEFINER schválně: volající nevidí do cizích bloků, ale
-- pravidla se na tuhle otázku potřebují zeptat.
create or replace function public.je_blokovano(a uuid, b uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

-- Přátelství. Dvojice je uložená jednou, směr určuje, kdo koho požádal.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_ne_sam_sebe check (requester_id <> addressee_id)
);

alter table public.friendships enable row level security;

-- Dvojice smí být v tabulce jen jednou, bez ohledu na to, kdo žádal.
-- Bez tohohle by šlo mít dvě žádosti mezi týmiž lidmi proti sobě.
create unique index if not exists friendships_dvojice_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);

create policy "vidět vlastní přátelství a žádosti"
  on public.friendships for select
  using (auth.uid() in (requester_id, addressee_id));

create policy "žádost smí poslat jen sám za sebe a nezablokovanému"
  on public.friendships for insert
  with check (
    auth.uid() = requester_id
    and status = 'pending'
    and not public.je_blokovano(requester_id, addressee_id)
  );

-- Přijmout žádost smí jen ten, komu přišla
create policy "přijmout žádost smí jen adresát"
  on public.friendships for update
  using (auth.uid() = addressee_id and status = 'pending')
  with check (status = 'accepted');

-- Zrušit může kdokoli z dvojice: odvolání žádosti i zrušení přátelství
create policy "zrušit smí kdokoli z dvojice"
  on public.friendships for delete
  using (auth.uid() in (requester_id, addressee_id));

-- Jsou ti dva přátelé? Používají to pravidla u profilů i chatů.
create or replace function public.jsou_pratele(a uuid, b uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b)
        or (requester_id = b and addressee_id = a))
  );
$$;

revoke execute on function public.je_blokovano(uuid, uuid) from anon, public;
revoke execute on function public.jsou_pratele(uuid, uuid) from anon, public;