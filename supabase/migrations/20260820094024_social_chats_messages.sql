create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  name text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_members (
  chat_id uuid not null references public.chats (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  -- Smazání je měkké: druhá strana má vidět, že tu zpráva byla,
  -- jinak by z rozhovoru beze stopy zmizel kus.
  deleted_at timestamptz
);

create index if not exists chat_members_user_idx on public.chat_members (user_id);
create index if not exists messages_chat_idx on public.messages (chat_id, created_at desc);

alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;

-- Jsem členem toho chatu?
--
-- SECURITY DEFINER je tu nutnost, ne pohodlí: kdyby se pravidlo nad
-- chat_members ptalo přímo do chat_members, Postgres by se zacyklil.
-- Funkce běží mimo pravidla, takže cyklus nevznikne.
create or replace function public.je_clenem(chat uuid, kdo uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.chat_members m
    where m.chat_id = chat and m.user_id = kdo
  );
$$;

-- chaty
create policy "vidět chaty, kterých jsem členem"
  on public.chats for select
  using (public.je_clenem(id, auth.uid()));

create policy "založit chat smí kdokoli sám za sebe"
  on public.chats for insert
  with check (auth.uid() = created_by);

create policy "přejmenovat skupinu smí její člen"
  on public.chats for update
  using (public.je_clenem(id, auth.uid()) and is_group)
  with check (public.je_clenem(id, auth.uid()));

-- členství
create policy "vidět členy svých chatů"
  on public.chat_members for select
  using (public.je_clenem(chat_id, auth.uid()));

-- Do chatu se nedá vstoupit sám od sebe: buď se přidává zakladatel při
-- zakládání, nebo někoho přidává člen — a jen svého přítele.
create policy "přidat člena smí zakladatel nebo člen"
  on public.chat_members for insert
  with check (
    (
      user_id = auth.uid()
      and exists (select 1 from public.chats c where c.id = chat_id and c.created_by = auth.uid())
    )
    or (
      (
        public.je_clenem(chat_id, auth.uid())
        or exists (select 1 from public.chats c where c.id = chat_id and c.created_by = auth.uid())
      )
      and public.jsou_pratele(auth.uid(), user_id)
      and not public.je_blokovano(auth.uid(), user_id)
    )
  );

create policy "odejít z chatu smí každý sám za sebe"
  on public.chat_members for delete
  using (user_id = auth.uid());

create policy "označit přečtení smí každý u sebe"
  on public.chat_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- zprávy
-- Blokovaný uživatel se do rozhovoru nedostane ani ve skupině: jeho
-- zprávy se k zablokovanému vůbec nenačtou.
create policy "číst zprávy ze svých chatů, kromě blokovaných"
  on public.messages for select
  using (
    public.je_clenem(chat_id, auth.uid())
    and not public.je_blokovano(sender_id, auth.uid())
  );

create policy "psát smí člen sám za sebe"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.je_clenem(chat_id, auth.uid())
  );

create policy "smazat vlastní zprávu"
  on public.messages for update
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

-- Živé doručování zpráv
alter publication supabase_realtime add table public.messages;

revoke execute on function public.je_clenem(uuid, uuid) from anon, public;