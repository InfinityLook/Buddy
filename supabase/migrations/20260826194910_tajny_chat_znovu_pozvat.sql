-- Zamítnutá pozvánka do tajného chatu byla slepá ulička — unikátní
-- index na dvojici znamenal, že zaloz_tajny_chat vrátil pořád tu samou
-- zamítnutou řádku, navždy. Teď zamítnutou pozvánku znovupoužije jako
-- novou: nastaví stav zpátky na 'cekajici', zalozil na toho, kdo právě
-- volá (může to zkusit kdokoli z dvojice, ne jen původní zakladatel),
-- a čas založení na teď — nikdy nejde o obnovení zpráv, protože
-- zamítnutý chat nikdy neprošel do 'aktivni' a žádné zprávy mít nemůže.
create or replace function public.zaloz_tajny_chat(cil uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existujici public.tajne_chaty;
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

  select * into existujici
  from public.tajne_chaty
  where least(ucastnik_a, ucastnik_b) = least(auth.uid(), cil)
    and greatest(ucastnik_a, ucastnik_b) = greatest(auth.uid(), cil);

  if existujici.id is not null and existujici.stav = 'zamitnuto' then
    update public.tajne_chaty
    set stav = 'cekajici', zalozil = auth.uid(), created_at = now(), potvrzeno_at = null
    where id = existujici.id;

    perform public.zapis_audit_log(auth.uid(), 'zalozit_tajny_chat', cil, jsonb_build_object('chat_id', existujici.id, 'znovu', true));
    return existujici.id;
  end if;

  if existujici.id is not null then
    return existujici.id;
  end if;

  insert into public.tajne_chaty (ucastnik_a, ucastnik_b, zalozil)
  values (least(auth.uid(), cil), greatest(auth.uid(), cil), auth.uid())
  returning id into novy;

  perform public.zapis_audit_log(auth.uid(), 'zalozit_tajny_chat', cil, jsonb_build_object('chat_id', novy));

  return novy;
end;
$$;
