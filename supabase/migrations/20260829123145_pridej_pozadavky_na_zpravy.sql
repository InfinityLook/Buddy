
-- ==========================================
-- Žádosti o zprávy (message requests), jako na Instagramu: chat mezi
-- vzájemnými přáteli funguje přesně jako dřív (stav 'prijato' rovnou),
-- 1:1 chat s kýmkoli jiným (jednosměrné/žádné sledování, ale ne
-- blokovaný) teď taky jde založit, jen se u pozvaného objeví jako
-- čekající žádost, dokud ji neschválí nebo neodpoví. Skupina zůstává
-- jen pro přátele beze změny — skupinové žádosti nejsou v rozsahu.
-- ==========================================

alter table public.chat_members add column stav text not null default 'prijato'
  check (stav in ('pozadavek', 'prijato'));

-- Odpověď v chatu, kde je moje vlastní členství ještě 'pozadavek',
-- žádost sama přijme — stejná "reakce = souhlas" logika jako
-- oznac_ticket_po_zprave() pro support tikety, jen bez potřeby
-- zvláštního tlačítka. Explicitní "Přijmout" v UI (ChatView.tsx)
-- pořád existuje pro toho, kdo chce žádost schválit bez psaní.
create or replace function public.prijmi_pozadavek_po_zprave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_members
  set stav = 'prijato'
  where chat_id = new.chat_id and user_id = new.sender_id and stav = 'pozadavek';
  return new;
end;
$$;

create trigger po_zprave_prijmi_pozadavek
  after insert on public.messages
  for each row execute function public.prijmi_pozadavek_po_zprave();

create or replace function public.zaloz_chat(ucastnici uuid[], je_skupina boolean default false, nazev text default null::text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
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
    -- Skupina zůstává jen pro přátele — pozvat do ní někoho, kdo teprve
    -- čeká na schválení sledování, nedává smysl (skupinová žádost o
    -- zprávu není v rozsahu). 1:1 tuhle podmínku dál nekontroluje vůbec:
    -- s kýmkoli nezablokovaným jde chat založit, jen se stane žádostí.
    if je_skupina and not public.je_muj_pritel(kdo) then
      raise exception 'Do skupiny jde přidat jen přítele.' using errcode = '42501';
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

  -- Zakladatel je vždycky rovnou 'prijato' — je to jeho vlastní krok.
  -- Pozvaný dostane 'prijato' u přítele/skupiny, jinak 'pozadavek'
  -- (jen u 1:1, viz kontrola výš).
  insert into public.chat_members (chat_id, user_id, stav)
  select novy, ja, 'prijato'
  union all
  select
    novy,
    u,
    case when je_skupina or public.je_muj_pritel(u) then 'prijato' else 'pozadavek' end
  from unnest(ucastnici) as u;

  return novy;
end
$function$;
