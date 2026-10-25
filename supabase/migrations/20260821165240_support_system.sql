-- Support systém: uživatel založí tiket s první zprávou, dál si s
-- podporou (adminem) píše ve vlákně. Stejný "id/text" i "atomicky
-- jedním voláním" tvar jako zaloz_chat — dvě vložení napůl by nechala
-- osiřelý tiket bez zpráv, kdyby druhé selhalo.

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  subject text not null check (char_length(btrim(subject)) > 0 and char_length(subject) <= 200),
  status text not null default 'otevreny' check (status in ('otevreny', 'vyrizeny')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_zpravy (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  autor_id uuid not null references auth.users(id) default auth.uid(),
  je_od_podpory boolean not null,
  text text not null check (char_length(text) >= 1 and char_length(text) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;
alter table public.support_zpravy enable row level security;

create index support_tickets_user_id_idx on public.support_tickets (user_id);
create index support_tickets_status_idx on public.support_tickets (status);
create index support_zpravy_ticket_id_idx on public.support_zpravy (ticket_id, created_at);

-- Tikety: vlastník vidí svoje, admin vidí všechny. Zakládá se jen
-- přes zalozit_tiket() níž, ne přímým insertem (potřebuje i první
-- zprávu ve stejné transakci) — INSERT politika tu proto chybí
-- schválně, stejně jako u chats/zaloz_chat.
create policy "vlastnik nebo admin cte tikety" on public.support_tickets
  for select
  using (user_id = auth.uid() or public.jsem_admin());

-- Stav mění jen admin, přes vyridit_tiket() níž (loguje do audit_log).
-- Uživatelovo "otevřít znovu" je vedlejší účinek nové zprávy (trigger
-- níž), ne přímá úprava řádku.
create policy "admin meni stav tiketu" on public.support_tickets
  for update
  using (public.jsem_admin())
  with check (public.jsem_admin());

-- Zprávy: číst smí ten, kdo smí číst tiket (vlastník nebo admin).
create policy "vlastnik tiketu nebo admin cte zpravy" on public.support_zpravy
  for select
  using (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and (t.user_id = auth.uid() or public.jsem_admin())
    )
  );

-- Psát smí autor sám za sebe (autor_id = auth.uid()), do tiketu, který
-- smí číst, a je_od_podpory MUSÍ sedět se skutečnou rolí volajícího —
-- počítá se tady, ne se přebírá z klienta, jinak by si kdokoli mohl
-- poslat zprávu, která vypadá jako od podpory.
create policy "autor pise do sveho nebo spravovaneho tiketu" on public.support_zpravy
  for insert
  with check (
    autor_id = auth.uid()
    and je_od_podpory = public.jsem_admin()
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and (t.user_id = auth.uid() or public.jsem_admin())
    )
  );

create or replace function public.zalozit_tiket(predmet text, zprava text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  novy_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Musíš být přihlášený.' using errcode = '42501';
  end if;
  if btrim(predmet) = '' or btrim(zprava) = '' then
    raise exception 'Předmět i zpráva musí být vyplněné.' using errcode = '22023';
  end if;

  insert into public.support_tickets (user_id, subject) values (auth.uid(), predmet) returning id into novy_id;
  insert into public.support_zpravy (ticket_id, autor_id, je_od_podpory, text) values (novy_id, auth.uid(), false, zprava);

  return novy_id;
end;
$function$;

-- Nová zpráva od uživatele (ne od podpory) do vyřízeného tiketu ho
-- vrátí zpátky do fronty — mlčky, bez nutnosti zvláštního tlačítka
-- "otevřít znovu". Zpráva od podpory jen posune updated_at, stav mění
-- admin výslovně přes vyridit_tiket().
create or replace function public.oznac_ticket_po_zprave()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not new.je_od_podpory then
    update public.support_tickets set status = 'otevreny', updated_at = now() where id = new.ticket_id;
  else
    update public.support_tickets set updated_at = now() where id = new.ticket_id;
  end if;
  return new;
end;
$function$;

create trigger po_nove_zprave_tiketu
  after insert on public.support_zpravy
  for each row execute function public.oznac_ticket_po_zprave();

-- Odpověď od podpory je privilegovaná akce, loguje se stejně jako
-- ostatní admin zásahy v audit_log — přes trigger, protože jde
-- o obyčejný insert, ne o RPC (viz tři způsoby zápisu do audit_log
-- v CLAUDE.md).
create or replace function public.zaznamenej_odpoved_podpory()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  cil uuid;
begin
  if new.je_od_podpory then
    select user_id into cil from public.support_tickets where id = new.ticket_id;
    perform public.zapis_audit_log(auth.uid(), 'odpovedet_v_podpore', cil,
      jsonb_build_object('ticket_id', new.ticket_id, 'text', left(new.text, 200)));
  end if;
  return new;
end;
$function$;

create trigger po_odpovedi_podpory
  after insert on public.support_zpravy
  for each row execute function public.zaznamenej_odpoved_podpory();

create or replace function public.vyridit_tiket(tiket uuid, novy_stav text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.jsem_admin() then
    raise exception 'Přístup jen pro administrátory.' using errcode = '42501';
  end if;
  if novy_stav not in ('otevreny', 'vyrizeny') then
    raise exception 'Neplatný stav.' using errcode = '22023';
  end if;

  update public.support_tickets set status = novy_stav, updated_at = now() where id = tiket;

  perform public.zapis_audit_log(auth.uid(), 'vyridit_tiket', (select user_id from public.support_tickets where id = tiket),
    jsonb_build_object('ticket_id', tiket, 'stav', novy_stav));
end;
$function$;

alter publication supabase_realtime add table public.support_zpravy;
