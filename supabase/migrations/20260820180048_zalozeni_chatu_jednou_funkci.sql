-- ==========================================
-- Založení chatu jedním voláním.
--
-- Klient to dřív skládal ze tří dotazů: vlož chat, přidej sebe, přidej
-- ostatní. První z nich používal INSERT ... RETURNING id, jenže pravidlo
-- pro čtení chatů zní "jsem jeho členem" a zakladatel se členem stává až
-- tím druhým dotazem. Postgres proto celý příkaz odmítl s 42501 a
-- uživatel viděl jen "něco se nepovedlo". Zakládání chatu tak nefungovalo
-- vůbec — a kdyby se pravidlo jen rozšířilo, zbyl by po každém selhání
-- druhého dotazu chat bez členů, který už nikdo nikdy neuvidí ani nesmaže.
--
-- Tady vzniká všechno najednou, takže buď je chat i s členy, nebo není nic.
-- Funkce běží s právy vlastníka, a proto si pravidla musí ohlídat sama:
-- skutečný účet, jen přátelé, nikdo blokovaný.
-- ==========================================

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

  -- Dvojice spolu mají jeden chat. Kdyby vznikal pokaždé znovu,
  -- rozhovor by se roztříštil do několika vláken.
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