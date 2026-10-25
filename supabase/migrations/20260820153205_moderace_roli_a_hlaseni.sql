-- ==========================================
-- Role v databázi a vyřizování hlášení.
--
-- Role dosud žily jen v prohlížeči, takže se podle nich nedalo nic
-- chránit — kdo si přepsal localStorage, byl správcem. Aby hlášení měla
-- adresáta, musí databáze sama vědět, kdo je moderátor.
--
-- Role se schválně NEUKLÁDÁ do profiles: tabulku profilů si uživatel
-- upravuje sám a stačilo by poslat role = 'admin'. Vlastní tabulka
-- nemá jediné pravidlo pro zápis, takže do ní zvenčí nedosáhne nikdo —
-- měnit ji jde jen ze správy projektu.
-- ==========================================

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'vip', 'moderator', 'admin')),
  valid_until timestamptz,
  granted_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- Čtení jen vlastní role. Zápis nemá pravidlo žádné — a to je záměr.
create policy "vidět vlastní roli"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

/**
 * Má přihlášený právo moderovat?
 *
 * Platnost se vyhodnocuje při čtení, stejně jako u VIP v aplikaci —
 * uložený příznak "ještě platí" by mezi spuštěními zastaral.
 */
create or replace function public.jsem_moderator()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid()
      and r.role in ('moderator', 'admin')
      and (r.valid_until is null or r.valid_until > now())
  );
$$;

revoke execute on function public.jsem_moderator() from anon, public;

-- ---------- hlášení ----------

alter table public.reports
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references auth.users (id) on delete set null,
  add column if not exists resolution text check (resolution in ('vyreseno', 'zamitnuto'));

create index if not exists reports_nevyrizene_idx
  on public.reports (created_at desc) where resolved_at is null;

drop policy if exists "vidět vlastní hlášení" on public.reports;

create policy "vidět vlastní hlášení nebo všechna jako moderátor"
  on public.reports for select
  to authenticated
  using (auth.uid() = reporter_id or public.jsem_moderator());

create policy "vyřídit hlášení smí jen moderátor"
  on public.reports for update
  to authenticated
  using (public.jsem_moderator())
  with check (public.jsem_moderator());

-- Moderátor musí k nahlášené zprávě vidět i její text, jinak nemá
-- podle čeho rozhodnout.
drop policy if exists "číst zprávy ze svých chatů, kromě blokovaných" on public.messages;

create policy "číst zprávy ze svých chatů nebo nahlášené jako moderátor"
  on public.messages for select
  to authenticated
  using (
    (public.jsem_clenem(chat_id) and not public.je_blokovan_se_mnou(sender_id))
    or (
      public.jsem_moderator()
      and exists (select 1 from public.reports r where r.message_id = public.messages.id)
    )
  );

-- Stejně tak jméno nahlášeného a toho, kdo hlásí.
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
    or (
      public.jsem_moderator()
      and exists (
        select 1 from public.reports r
        where r.target_user_id = public.profiles.id or r.reporter_id = public.profiles.id
      )
    )
  );