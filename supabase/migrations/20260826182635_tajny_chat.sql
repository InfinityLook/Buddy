-- Secret Chat: samostatné tabulky, ne rozšíření chats/messages — jde
-- o jinou hranici přístupu (jen VIP/moderátor/admin mezi sebou, mizící
-- zprávy, moderátor bez přístupu na rozdíl od běžné moderace) a sdílet
-- tabulku by tyhle rozdílné RLS/expirační vlastnosti muselo řešit
-- podmínkami nad každým řádkem místo jedné jasné hranice na úrovni tabulky.

create table public.tajne_chaty (
  id uuid primary key default gen_random_uuid(),
  ucastnik_a uuid not null references auth.users(id) on delete cascade,
  ucastnik_b uuid not null references auth.users(id) on delete cascade,
  zalozil uuid not null references auth.users(id),
  stav text not null default 'cekajici' check (stav in ('cekajici', 'aktivni', 'zamitnuto')),
  created_at timestamptz not null default now(),
  potvrzeno_at timestamptz,
  constraint tajne_chaty_ruzni_ucastnici check (ucastnik_a <> ucastnik_b)
);

-- Jedna dvojice = jeden chat, bez ohledu na to, kdo je "a" a kdo "b" —
-- least/greatest při zápisu (viz zaloz_tajny_chat) drží pořadí pevné,
-- ať unikátní index vůbec funguje jako dvojice, ne jako uspořádaná trasa.
create unique index tajne_chaty_dvojice_idx
  on public.tajne_chaty (least(ucastnik_a, ucastnik_b), greatest(ucastnik_a, ucastnik_b));

create table public.tajne_zpravy (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.tajne_chaty(id) on delete cascade,
  odesilatel uuid not null references auth.users(id),
  text text not null,
  created_at timestamptz not null default now(),
  -- Mizící zprávy: 48 h je kompromis mezi "dost na skutečný rozhovor" a
  -- "dost krátké, aby mizení bylo cítit" — žádný technický důvod pro
  -- přesně tohle číslo, jen zvolená výchozí hodnota.
  expiruje_at timestamptz not null default (now() + interval '48 hours')
);

alter table public.tajne_chaty enable row level security;
alter table public.tajne_zpravy enable row level security;

-- ---------- oprávnění ----------
--
-- Jednoargumentová, přesně jako je_blokovan_se_mnou/najdi_podle_kodu —
-- ale na rozdíl od nich NENÍ udělená authenticated a nesmí být použitá
-- v žádné RLS politice: "má cíl VIP/moderátora/admina" je informace
-- o cizím účtu, ne o vztahu volajícího k němu (jako blokace), takže by
-- šlo přes RPC zjišťovat roli kohokoli. Volá se jen zevnitř dalších
-- SECURITY DEFINER funkcí níž, kde běží s právy vlastníka bez ohledu
-- na to, kdo funkci zavolal.
create or replace function public.ma_pravo_na_tajny_chat(cil uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = cil
      and r.role in ('vip', 'moderator', 'admin')
      and (r.valid_until is null or r.valid_until > now())
  );
$$;

-- ---------- založení a potvrzení ----------
--
-- Obě funkce jsou jediná cesta k zápisu do tajne_chaty — žádná INSERT/
-- UPDATE politika pro nikoho, stejný tvar jako user_roles/audit_log
-- ("server rozhoduje, klient jen čte").
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

  return novy;
end;
$$;

grant execute on function public.zaloz_tajny_chat(uuid) to authenticated;

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

  update public.tajne_chaty
  set stav = case when p_prijmout then 'aktivni' else 'zamitnuto' end,
      potvrzeno_at = now()
  where id = p_chat_id;
end;
$$;

grant execute on function public.potvrd_tajny_chat(uuid, boolean) to authenticated;

-- ---------- zprávy ----------
--
-- Na rozdíl od support_zpravy/messages jde o SECURITY DEFINER funkci,
-- ne plain insert + RLS politiku — WITH CHECK by musel volat
-- ma_pravo_na_tajny_chat, a ta se schválně nesmí grantnout authenticated
-- (viz komentář výš). Zabalení do funkce navíc ověří, že odesílatel
-- pořád má potřebnou roli v okamžiku odeslání, ne jen když chat vznikl —
-- komu mezitím vypršelo VIP, dál psát nemůže, i když chat zůstává aktivní.
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

  insert into public.tajne_zpravy (chat_id, odesilatel, text)
  values (p_chat_id, auth.uid(), orezany)
  returning * into nova;

  return nova;
end;
$$;

grant execute on function public.posli_tajnou_zpravu(uuid, text) to authenticated;

-- Líné mazání expirovaných zpráv — bez pg_cron: klient tohle volá
-- příležitostně (otevření panelu, odeslání zprávy), nic se nerozbije,
-- když se nezavolá vůbec, protože SELECT politika níž expirované stejně
-- skryje. Globální, bez cíle na konkrétního uživatele — nic citlivého
-- neprozrazuje, komu maže co.
create or replace function public.smaz_expirovane_tajne_zpravy()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.tajne_zpravy where expiruje_at <= now();
$$;

grant execute on function public.smaz_expirovane_tajne_zpravy() to authenticated;

-- ---------- čtení ----------
--
-- Jen účastník, nebo admin (dohled) — schválně bez moderátora, na rozdíl
-- od běžné moderace hlášení. Žádná zvláštní funkce na čtení netřeba,
-- plain select projde přes tuhle politiku stejně jako u chats/messages.
create policy "vidim vlastni tajne chaty nebo jsem admin"
  on public.tajne_chaty for select
  to authenticated
  using (ucastnik_a = auth.uid() or ucastnik_b = auth.uid() or public.jsem_admin());

create policy "vidim zpravy z vlastnich tajnych chatu nebo jsem admin"
  on public.tajne_zpravy for select
  to authenticated
  using (
    expiruje_at > now()
    and (
      public.jsem_admin()
      or exists (
        select 1 from public.tajne_chaty c
        where c.id = tajne_zpravy.chat_id
          and (c.ucastnik_a = auth.uid() or c.ucastnik_b = auth.uid())
      )
    )
  );

-- Živé doručování žádostí/potvrzení i zpráv — stejná publikace jako
-- messages/friendships, Realtime nad ní pouští jen to, co by čtenář
-- dostal i normálním čtením (viz politiky výš).
alter publication supabase_realtime add table public.tajne_chaty;
alter publication supabase_realtime add table public.tajne_zpravy;
