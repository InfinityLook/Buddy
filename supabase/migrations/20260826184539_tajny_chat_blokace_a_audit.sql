-- Dvě doplnění k tajnému chatu:
--
-- 1) Blokace se dřív kontrolovala jen při založení (zaloz_tajny_chat).
--    Kdo se zablokoval AŽ POTOM, co je chat aktivní, mohl dál psát —
--    posli_tajnou_zpravu to vůbec neřešilo. Teď kontroluje blokaci vůči
--    konkrétnímu druhému účastníkovi při každém odeslání, a totéž dělá
--    potvrd_tajny_chat před aktivací (blokovaný vztah se nemá aktivovat,
--    i kdyby k zablokování došlo až po pozvánce, ještě před potvrzením).
--    Čtení historie se schválně nemění — jen nová aktivita se zastaví,
--    ne že by blokace mazala, co už bylo řečeno.
--
-- 2) Audit log dřív o tajném chatu nevěděl vůbec. Admin (jediný, kdo má
--    na tajný chat dohled — moderátor záměrně ne) neměl ani stopu, kdo
--    s kým chat založil nebo jak dopadla pozvánka, bez čtení obsahu.
--    zapis_audit_log() se loguje jen na skutečnou změnu stavu — idempotentní
--    návrat už existujícího chatu ze zaloz_tajny_chat se nezaznamenává
--    znovu, ať opakované volání nezaplní log duplicitami.

create or replace function public.zaloz_tajny_chat(cil uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existujici uuid;
  novy uuid;
begin
  if cil = auth.uid() then
    raise exception 'Se sebou samým tajný chat nejde založit.' using errcode = '22023';
  end if;

  if not public.ma_pravo_na_tajny_chat(auth.uid()) then
    raise exception 'Tajný chat je jen pro VIP, moderátory a administrátory.' using errcode = '42501';
  end if;

  if not public.ma_pravo_na_tajny_chat(cil) then
    raise exception 'Tenhle účet tajný chat mít nemůže.' using errcode = '42501';
  end if;

  if public.je_blokovan_se_mnou(cil) then
    raise exception 'Se zablokovaným účtem nejde chat založit.' using errcode = '42501';
  end if;

  select id into existujici
  from public.tajne_chaty
  where least(ucastnik_a, ucastnik_b) = least(auth.uid(), cil)
    and greatest(ucastnik_a, ucastnik_b) = greatest(auth.uid(), cil);

  if existujici is not null then
    return existujici;
  end if;

  insert into public.tajne_chaty (ucastnik_a, ucastnik_b, zalozil)
  values (least(auth.uid(), cil), greatest(auth.uid(), cil), auth.uid())
  returning id into novy;

  perform public.zapis_audit_log(auth.uid(), 'zalozit_tajny_chat', cil, jsonb_build_object('chat_id', novy));

  return novy;
end;
$$;

create or replace function public.potvrd_tajny_chat(p_chat_id uuid, p_prijmout boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  radek public.tajne_chaty;
begin
  select * into radek from public.tajne_chaty where id = p_chat_id;

  if radek is null then
    raise exception 'Chat nenalezen.' using errcode = '22023';
  end if;

  if radek.ucastnik_a <> auth.uid() and radek.ucastnik_b <> auth.uid() then
    raise exception 'Nejsi účastník tohoto chatu.' using errcode = '42501';
  end if;

  if radek.zalozil = auth.uid() then
    raise exception 'Vlastní pozvánku nejde potvrzovat, čeká se na druhou stranu.' using errcode = '42501';
  end if;

  if radek.stav <> 'cekajici' then
    raise exception 'Tenhle chat už není čekající.' using errcode = '22023';
  end if;

  -- Zakladatel je tu vždycky ten druhý — potvrzuje výhradně pozvaný
  -- (viz kontrola výš), takže druhá strana vztahu je radek.zalozil.
  if p_prijmout and public.je_blokovan_se_mnou(radek.zalozil) then
    raise exception 'Se zablokovaným účtem nejde chat aktivovat.' using errcode = '42501';
  end if;

  update public.tajne_chaty
  set stav = case when p_prijmout then 'aktivni' else 'zamitnuto' end,
      potvrzeno_at = now()
  where id = p_chat_id;

  perform public.zapis_audit_log(
    auth.uid(),
    case when p_prijmout then 'potvrdit_tajny_chat' else 'zamitnout_tajny_chat' end,
    radek.zalozil,
    jsonb_build_object('chat_id', p_chat_id)
  );
end;
$$;

create or replace function public.posli_tajnou_zpravu(p_chat_id uuid, p_text text)
returns public.tajne_zpravy
language plpgsql
security definer
set search_path = ''
as $$
declare
  radek public.tajne_chaty;
  orezany text := btrim(p_text);
  nova public.tajne_zpravy;
  druhy_id uuid;
begin
  if orezany = '' or length(orezany) > 4000 then
    raise exception 'Neplatná délka zprávy.' using errcode = '22023';
  end if;

  select * into radek from public.tajne_chaty where id = p_chat_id;

  if radek is null or radek.stav <> 'aktivni' then
    raise exception 'Tenhle chat není aktivní.' using errcode = '22023';
  end if;

  if radek.ucastnik_a <> auth.uid() and radek.ucastnik_b <> auth.uid() then
    raise exception 'Nejsi účastník tohoto chatu.' using errcode = '42501';
  end if;

  if not public.ma_pravo_na_tajny_chat(auth.uid()) then
    raise exception 'Oprávnění na tajný chat mezitím vypršelo.' using errcode = '42501';
  end if;

  druhy_id := case when radek.ucastnik_a = auth.uid() then radek.ucastnik_b else radek.ucastnik_a end;

  if public.je_blokovan_se_mnou(druhy_id) then
    raise exception 'Se zablokovaným účtem nejde psát.' using errcode = '42501';
  end if;

  insert into public.tajne_zpravy (chat_id, odesilatel, text)
  values (p_chat_id, auth.uid(), orezany)
  returning * into nova;

  return nova;
end;
$$;
