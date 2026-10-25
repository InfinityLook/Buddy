
-- ==========================================
-- Sledování (follow) — jednosměrné, na rozdíl od friendships (žádost/
-- přijetí, obousměrné). Vlastní tabulka, ne rozšíření friendships:
-- friendships.status je 'pending'/'accepted'/'declined' s jasným
-- významem "vztah mezi dvěma lidmi", sledování je jednostranný fakt
-- ("já sleduju tebe"), který nepotřebuje žádost ani potvrzení druhé
-- strany — kombinovat obojí do jedné tabulky by matlo dva různé
-- modely do jednoho sloupce.
-- ==========================================

create table public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

alter table public.follows enable row level security;

-- Číst smí jen řádky, kde je přihlášený jednou ze stran — dost na to,
-- aby appka zjistila "sleduju už tohohle člověka" i "sleduje mě tenhle
-- člověk", ale ne na vytažení cizího kompletního seznamu sledujících/
-- sledovaných. Stejná zdrženlivost jako u pocet_spolecnych_pratel:
-- počet je veřejný (viz funkce níž), seznam ne.
create policy "číst smí jen svoje vazby sledování"
  on public.follows for select
  to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid());

create policy "sledovat smí jen sám za sebe"
  on public.follows for insert
  to authenticated
  with check (
    follower_id = auth.uid()
    and public.je_skutecny_ucet()
    and not public.je_zabanovan_ze_social()
    and not public.je_blokovan_se_mnou(following_id)
  );

create policy "přestat sledovat smí jen sám za sebe"
  on public.follows for delete
  to authenticated
  using (follower_id = auth.uid());

-- Počty jsou veřejné (jako u Instagramu), seznam ne — SECURITY DEFINER
-- funkce obchází řádkové omezení SELECT politiky výš jen pro součet,
-- nikdy nevrátí syrové řádky. Revoke z PUBLIC i anon explicitně —
-- tohle je přesně ta chyba (výchozí EXECUTE grant), co si tenhle
-- projekt už třikrát nechal ujít, viz smaz_expirovane_stories.
create function public.pocet_sledujicich(cil uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.follows where following_id = cil;
$$;

create function public.pocet_sledovanych(cil uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.follows where follower_id = cil;
$$;

revoke execute on function public.pocet_sledujicich(uuid) from public, anon;
revoke execute on function public.pocet_sledovanych(uuid) from public, anon;
grant execute on function public.pocet_sledujicich(uuid) to authenticated;
grant execute on function public.pocet_sledovanych(uuid) to authenticated;
