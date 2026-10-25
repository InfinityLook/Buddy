-- Dvě rozšíření Tajného chatu:
--
-- 1) Skutečné E2E šifrování (ECDH P-256 + AES-GCM, Web Crypto na klientu).
--    Server od teď v tajne_zpravy.text vidí jen šifrovanou hatmatilku —
--    ani admin, jediný s dohledem přes RLS, obsah nepřečte, jen ví, že
--    zpráva existuje (a kdy, viz audit log z předchozí migrace). Klíč se
--    nikdy nepřenáší — obě strany si ho odvodí nezávisle z vlastního
--    soukromého + cizího veřejného klíče (vlastnost ECDH), server drží
--    jen veřejné klíče, ze kterých šifru nikdo nerozlomí.
--
-- 2) Konfigurovatelný časovač mizení místo pevných 48 h — sada hodnot
--    odpovídá běžným presetům "mizících zpráv" (Telegram Secret Chat aj.),
--    nastavuje ho kterýkoli účastník a platí jen pro zprávy odeslané POTÉ,
--    ne retroaktivně.

create table public.tajne_klice (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verejny_klic text not null,
  aktualizovano_v timestamptz not null default now()
);

alter table public.tajne_klice enable row level security;

-- Veřejný klíč je z podstaty asymetrické kryptografie neutajovaný, ale
-- pouštíme čtení jen tomu, kdo s daným účtem má (nebo zakládá) tajný
-- chat — stejná zdrženlivost jako u každého jiného vyhledání v profiles
-- v tomhle souboru, ne otevřený adresář klíčů.
create policy "cti vlastni klic nebo klic protistrany v tajnem chatu"
  on public.tajne_klice for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.tajne_chaty c
      where (c.ucastnik_a = auth.uid() and c.ucastnik_b = tajne_klice.user_id)
         or (c.ucastnik_b = auth.uid() and c.ucastnik_a = tajne_klice.user_id)
    )
  );

-- Nahrání/aktualizace vlastního klíče nepotřebuje SECURITY DEFINER funkci
-- jako zbytek tajného chatu — je to čistě "napiš svůj vlastní řádek",
-- stejný tvar jako u client_errors/oznameni (viz CLAUDE.md), žádné
-- riziko zneužití cizí identity.
create policy "nahraj svuj verejny klic"
  on public.tajne_klice for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "aktualizuj svuj verejny klic"
  on public.tajne_klice for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Konfigurovatelný časovač na chatu, ne na jednotlivé zprávě — stejný
-- vzor jako "disappearing messages" v běžných messengerech (nastaví se
-- pro konverzaci, ne pokaždé zvlášť). Sada hodnot je check constraint,
-- ne libovolné číslo, ať nejde poslat "expirace za rok" a zprávu tím
-- fakticky udělat trvalou.
alter table public.tajne_chaty
  add column expirace_sekund integer not null default 43200
  check (expirace_sekund in (10, 30, 60, 300, 600, 900, 1800, 3600, 14400, 28800, 43200));

alter table public.tajne_zpravy add column iv text not null;
-- Starý pevný default (now() + 48h) už neplatí — hodnotu teď vždycky
-- explicitně počítá posli_tajnou_zpravu z aktuálního nastavení chatu.
alter table public.tajne_zpravy alter column expiruje_at drop default;

-- Stará dvouparametrová signatura (bez iv) končí — text teď vždy nese
-- šifru, ne čitelnou zprávu, takže volání beze klíče nemá smysl nechávat
-- vedle sebe jako druhé přetížení.
drop function if exists public.posli_tajnou_zpravu(uuid, text);

create or replace function public.posli_tajnou_zpravu(p_chat_id uuid, p_text text, p_iv text)
returns public.tajne_zpravy
language plpgsql
security definer
set search_path = ''
as $$
declare
  radek public.tajne_chaty;
  nova public.tajne_zpravy;
  druhy_id uuid;
begin
  -- p_text je od teď base64 AES-GCM šifra z klienta, ne čitelný text —
  -- délka se validuje jen jako rozumný horní strop proti zneužití
  -- (šifra + tag + base64 režie je vždycky delší než původní text).
  if p_text = '' or length(p_text) > 8000 or p_iv = '' or length(p_iv) > 64 then
    raise exception 'Neplatná zpráva.' using errcode = '22023';
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

  insert into public.tajne_zpravy (chat_id, odesilatel, text, iv, expiruje_at)
  values (p_chat_id, auth.uid(), p_text, p_iv, now() + make_interval(secs => radek.expirace_sekund))
  returning * into nova;

  return nova;
end;
$$;

grant execute on function public.posli_tajnou_zpravu(uuid, text, text) to authenticated;

create or replace function public.nastav_expiraci_tajneho_chatu(p_chat_id uuid, p_sekund integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  radek public.tajne_chaty;
begin
  if p_sekund not in (10, 30, 60, 300, 600, 900, 1800, 3600, 14400, 28800, 43200) then
    raise exception 'Neplatná délka časovače.' using errcode = '22023';
  end if;

  select * into radek from public.tajne_chaty where id = p_chat_id;

  if radek is null then
    raise exception 'Chat nenalezen.' using errcode = '22023';
  end if;

  if radek.ucastnik_a <> auth.uid() and radek.ucastnik_b <> auth.uid() then
    raise exception 'Nejsi účastník tohoto chatu.' using errcode = '42501';
  end if;

  -- Mění se jen dopředu — už odeslané zprávy si nesou vlastní expiruje_at
  -- spočítané v okamžiku odeslání, tahle změna se jich nedotkne.
  update public.tajne_chaty set expirace_sekund = p_sekund where id = p_chat_id;
end;
$$;

grant execute on function public.nastav_expiraci_tajneho_chatu(uuid, integer) to authenticated;
