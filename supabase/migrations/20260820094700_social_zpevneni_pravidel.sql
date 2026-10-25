-- ==========================================
-- Zpevnění po bezpečnostní kontrole.
--
-- 1) Pomocné funkce braly dvě libovolná id. Protože jsou SECURITY
--    DEFINER a přihlášený je smí volat přes /rest/v1/rpc, dalo se jimi
--    proklepávat cizí vztahy — "jsou tihle dva přátelé?" na kohokoliv.
--    Ve všech pravidlech přitom byla jedna strana vždycky volající sám,
--    takže stačí druhý parametr zrušit a dosadit auth.uid() uvnitř.
--    Pak funkce odpovídá jen na otázky o tom, kdo se ptá.
--
-- 2) Social je jen pro skutečné účty. Anonymní identita vzniká sama na
--    každém zařízení a psát z ní dětem by šlo bez jakékoli stopy.
-- ==========================================

create or replace function public.je_skutecny_ucet()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) = false;
$$;

create or replace function public.je_blokovan_se_mnou(druhy uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = druhy)
       or (blocker_id = druhy and blocked_id = auth.uid())
  );
$$;

create or replace function public.je_muj_pritel(druhy uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = druhy)
        or (requester_id = druhy and addressee_id = auth.uid()))
  );
$$;

create or replace function public.jsem_clenem(chat uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.chat_members m
    where m.chat_id = chat and m.user_id = auth.uid()
  );
$$;

-- ---------- přepsaná pravidla ----------

drop policy if exists "vlastní bloky lze číst" on public.blocks;
drop policy if exists "blokovat smí jen sám za sebe" on public.blocks;
drop policy if exists "odblokovat smí jen sám za sebe" on public.blocks;

create policy "vlastní bloky lze číst" on public.blocks for select
  to authenticated using (auth.uid() = blocker_id);
create policy "blokovat smí jen sám za sebe" on public.blocks for insert
  to authenticated with check (auth.uid() = blocker_id);
create policy "odblokovat smí jen sám za sebe" on public.blocks for delete
  to authenticated using (auth.uid() = blocker_id);

drop policy if exists "vidět vlastní přátelství a žádosti" on public.friendships;
drop policy if exists "žádost smí poslat jen sám za sebe a nezablokovanému" on public.friendships;
drop policy if exists "přijmout žádost smí jen adresát" on public.friendships;
drop policy if exists "zrušit smí kdokoli z dvojice" on public.friendships;

create policy "vidět vlastní přátelství a žádosti" on public.friendships for select
  to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy "žádost smí poslat jen skutečný účet nezablokovanému" on public.friendships for insert
  to authenticated with check (
    auth.uid() = requester_id
    and status = 'pending'
    and public.je_skutecny_ucet()
    and not public.je_blokovan_se_mnou(addressee_id)
  );
create policy "přijmout žádost smí jen adresát" on public.friendships for update
  to authenticated using (auth.uid() = addressee_id and status = 'pending')
  with check (status = 'accepted');
create policy "zrušit smí kdokoli z dvojice" on public.friendships for delete
  to authenticated using (auth.uid() in (requester_id, addressee_id));

drop policy if exists "vidět chaty, kterých jsem členem" on public.chats;
drop policy if exists "založit chat smí kdokoli sám za sebe" on public.chats;
drop policy if exists "přejmenovat skupinu smí její člen" on public.chats;

create policy "vidět chaty, kterých jsem členem" on public.chats for select
  to authenticated using (public.jsem_clenem(id));
create policy "založit chat smí skutečný účet" on public.chats for insert
  to authenticated with check (auth.uid() = created_by and public.je_skutecny_ucet());
create policy "přejmenovat skupinu smí její člen" on public.chats for update
  to authenticated using (public.jsem_clenem(id) and is_group)
  with check (public.jsem_clenem(id));

drop policy if exists "vidět členy svých chatů" on public.chat_members;
drop policy if exists "přidat člena smí zakladatel nebo člen" on public.chat_members;
drop policy if exists "odejít z chatu smí každý sám za sebe" on public.chat_members;
drop policy if exists "označit přečtení smí každý u sebe" on public.chat_members;

create policy "vidět členy svých chatů" on public.chat_members for select
  to authenticated using (public.jsem_clenem(chat_id));
create policy "přidat člena smí zakladatel nebo člen" on public.chat_members for insert
  to authenticated with check (
    (
      user_id = auth.uid()
      and exists (select 1 from public.chats c where c.id = chat_id and c.created_by = auth.uid())
    )
    or (
      (
        public.jsem_clenem(chat_id)
        or exists (select 1 from public.chats c where c.id = chat_id and c.created_by = auth.uid())
      )
      and public.je_muj_pritel(user_id)
      and not public.je_blokovan_se_mnou(user_id)
    )
  );
create policy "odejít z chatu smí každý sám za sebe" on public.chat_members for delete
  to authenticated using (user_id = auth.uid());
create policy "označit přečtení smí každý u sebe" on public.chat_members for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "číst zprávy ze svých chatů, kromě blokovaných" on public.messages;
drop policy if exists "psát smí člen sám za sebe" on public.messages;
drop policy if exists "smazat vlastní zprávu" on public.messages;

create policy "číst zprávy ze svých chatů, kromě blokovaných" on public.messages for select
  to authenticated using (
    public.jsem_clenem(chat_id) and not public.je_blokovan_se_mnou(sender_id)
  );
create policy "psát smí člen sám za sebe" on public.messages for insert
  to authenticated with check (
    auth.uid() = sender_id and public.jsem_clenem(chat_id) and public.je_skutecny_ucet()
  );
create policy "smazat vlastní zprávu" on public.messages for update
  to authenticated using (auth.uid() = sender_id) with check (auth.uid() = sender_id);

drop policy if exists "nahlásit smí kdokoli sám za sebe" on public.reports;
drop policy if exists "vidět vlastní hlášení" on public.reports;

create policy "nahlásit smí kdokoli sám za sebe" on public.reports for insert
  to authenticated with check (auth.uid() = reporter_id);
create policy "vidět vlastní hlášení" on public.reports for select
  to authenticated using (auth.uid() = reporter_id);

drop policy if exists "číst svůj profil, profily přátel a spoluúčastníků chatů" on public.profiles;
create policy "číst svůj profil, profily přátel a spoluúčastníků chatů"
  on public.profiles for select to authenticated
  using (
    auth.uid() = id
    or public.je_muj_pritel(id)
    or exists (
      select 1 from public.chat_members m1
      join public.chat_members m2 on m1.chat_id = m2.chat_id
      where m1.user_id = auth.uid() and m2.user_id = public.profiles.id
    )
    or exists (
      select 1 from public.friendships f
      where f.status = 'pending'
        and ((f.requester_id = auth.uid() and f.addressee_id = public.profiles.id)
          or (f.addressee_id = auth.uid() and f.requester_id = public.profiles.id))
    )
  );

-- Staré dvouparametrové verze už nikdo nepotřebuje
drop function if exists public.je_blokovano(uuid, uuid);
drop function if exists public.jsou_pratele(uuid, uuid);
drop function if exists public.je_clenem(uuid, uuid);

revoke execute on function public.je_blokovan_se_mnou(uuid) from anon, public;
revoke execute on function public.je_muj_pritel(uuid) from anon, public;
revoke execute on function public.jsem_clenem(uuid) from anon, public;
revoke execute on function public.je_skutecny_ucet() from anon, public;