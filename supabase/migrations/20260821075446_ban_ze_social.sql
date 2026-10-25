-- ==========================================
-- Ban ze Socialu — samostatná tabulka, ne sloupec v profiles.
--
-- profiles smí upravovat jen vlastník řádku ("Vlastnik upravuje svuj
-- profil"), takže admin by tam žádný "banned" příznak jinému uživateli
-- vůbec nezapsal — RLS by ho zastavilo stejně jako kohokoli cizího.
-- Samostatná tabulka to obchází stejně, jako to dělá user_roles: nemá
-- žádnou INSERT/UPDATE/DELETE politiku pro nikoho, píše do ní jen
-- SECURITY DEFINER funkce níž.
-- ==========================================

create table public.social_bans (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  banned_at timestamptz not null default now(),
  banned_by uuid not null references public.profiles(id)
);

alter table public.social_bans enable row level security;

-- Nikdo nemá write politiku — stejný vzor jako user_roles. Čtení taky
-- ne: kdo je zabanovaný, se pozná z toho, že mu INSERT selže, ne
-- z toho, že by si mohl tabulku sám prohlédnout.

create or replace function public.je_zabanovan_ze_social()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.social_bans where user_id = auth.uid());
$$;

revoke all on function public.je_zabanovan_ze_social() from public;
grant execute on function public.je_zabanovan_ze_social() to authenticated;

create or replace function public.zabanuj_ze_social(cil uuid, zabanovat boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.jsem_admin() then
    raise exception 'Přístup jen pro administrátory.' using errcode = '42501';
  end if;

  if zabanovat then
    insert into public.social_bans (user_id, banned_by)
    values (cil, auth.uid())
    on conflict (user_id) do nothing;
  else
    delete from public.social_bans where user_id = cil;
  end if;
end;
$$;

revoke all on function public.zabanuj_ze_social(uuid, boolean) from public;
grant execute on function public.zabanuj_ze_social(uuid, boolean) to authenticated;

-- Nové žádosti o přátelství, zprávy a chaty banovanému účtu selžou.
-- Existující data se nemažou ani neschovávají — ban je "už nic
-- nového", ne retroaktivní vymazání toho, co bylo.

drop policy "žádost smí poslat jen skutečný účet nezablokovanému" on public.friendships;
create policy "žádost smí poslat jen skutečný účet nezablokovanému"
  on public.friendships for insert
  with check (
    auth.uid() = requester_id
    and status = 'pending'
    and public.je_skutecny_ucet()
    and not public.je_blokovan_se_mnou(addressee_id)
    and not public.je_zabanovan_ze_social()
  );

drop policy "psát smí člen sám za sebe" on public.messages;
create policy "psát smí člen sám za sebe"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.jsem_clenem(chat_id)
    and public.je_skutecny_ucet()
    and not public.je_zabanovan_ze_social()
  );

create or replace function public.zaloz_chat(
  ucastnici uuid[],
  je_skupina boolean default false,
  nazev text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ja uuid := auth.uid();
  kdo uuid;
  novy uuid;
  stavajici uuid;
begin
  if ja is null then
    raise exception 'Nejsi přihlášený.' using errcode = '42501';
  end if;

  if not public.je_skutecny_ucet() then
    raise exception 'Chat smí založit jen skutečný účet.' using errcode = '42501';
  end if;

  if public.je_zabanovan_ze_social() then
    raise exception 'Tenhle účet má zakázané zakládat nové chaty.' using errcode = '42501';
  end if;

  if ucastnici is null or array_length(ucastnici, 1) is null then
    raise exception 'Chat potřebuje aspoň jednoho druhého účastníka.' using errcode = '22023';
  end if;

  foreach kdo in array ucastnici loop
    if kdo = ja then
      raise exception 'Sám se sebou chat nezaložíš.' using errcode = '22023';
    end if;
    if not public.je_muj_pritel(kdo) then
      raise exception 'Chat jde založit jen s někým, koho máš mezi přáteli.' using errcode = '42501';
    end if;
    if public.je_blokovan_se_mnou(kdo) then
      raise exception 'S blokovaným uživatelem chat založit nejde.' using errcode = '42501';
    end if;
  end loop;

  if not je_skupina and array_length(ucastnici, 1) = 1 then
    select c.id into stavajici
    from public.chats c
    join public.chat_members m1 on m1.chat_id = c.id and m1.user_id = ja
    join public.chat_members m2 on m2.chat_id = c.id and m2.user_id = ucastnici[1]
    where c.is_group = false
    limit 1;

    if stavajici is not null then
      return stavajici;
    end if;
  end if;

  insert into public.chats (is_group, name, created_by)
  values (
    je_skupina,
    case when je_skupina then nullif(btrim(coalesce(nazev, '')), '') else null end,
    ja
  )
  returning id into novy;

  insert into public.chat_members (chat_id, user_id)
  select novy, ja
  union
  select novy, unnest(ucastnici);

  return novy;
end $$;

revoke all on function public.zaloz_chat(uuid[], boolean, text) from public;
grant execute on function public.zaloz_chat(uuid[], boolean, text) to authenticated;