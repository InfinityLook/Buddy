
-- ==========================================
-- Lajky a komentáře u příspěvků — první skutečný engagement, který
-- posts (od IG redesignu) dosud vůbec neměly. Sdílené pravidlo
-- viditelnosti (soukromý účet skrývá obsah před nepřáteli, stejné jako
-- nacti_prispevky) je teď vytažené do jedné funkce, ne zopakované ve
-- třech RLS politikách zvlášť.
-- ==========================================

create or replace function public.smi_videt_prispevky_uzivatele(cil uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and not public.je_blokovan_se_mnou(cil)
    and coalesce(
      (select not pr.soukromy or cil = auth.uid() or public.je_muj_pritel(cil)
       from public.profiles pr where pr.id = cil),
      false
    );
$$;

revoke all on function public.smi_videt_prispevky_uzivatele(uuid) from public;
revoke all on function public.smi_videt_prispevky_uzivatele(uuid) from anon;
grant execute on function public.smi_videt_prispevky_uzivatele(uuid) to authenticated;

create or replace function public.nacti_prispevky(cil uuid)
returns table(id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamptz)
language sql
stable security definer
set search_path = ''
as $$
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at
  from public.posts p
  where p.user_id = cil
    and public.smi_videt_prispevky_uzivatele(cil)
  order by p.created_at desc;
$$;

-- ---------- lajky ----------

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

-- Plain tabulka, ne řízená funkce jako u posts samotných — lajk u
-- příspěvku, který appka smí zobrazit, je vidět celý (kdo, kdy), stejná
-- otevřenost jako u message_reactions. Appka dnes vykresluje jen počet
-- a "lajkoval/a jsem už?", ale seznam lidí je odsud dostupný zadarmo,
-- kdyby ho appka chtěla ukázat později.
create policy "vidět lajky u příspěvků, které smím vidět" on public.post_likes
  for select
  using (exists (
    select 1 from public.posts p
    where p.id = post_likes.post_id and public.smi_videt_prispevky_uzivatele(p.user_id)
  ));

create policy "lajkovat smí jen skutečný účet" on public.post_likes
  for insert
  with check (
    user_id = auth.uid()
    and public.je_skutecny_ucet()
    and not public.je_zabanovan_ze_social()
    and exists (
      select 1 from public.posts p
      where p.id = post_likes.post_id and public.smi_videt_prispevky_uzivatele(p.user_id)
    )
  );

create policy "odebrat lajk smí jen sám za sebe" on public.post_likes
  for delete
  using (user_id = auth.uid());

-- ---------- komentáře ----------

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (length(btrim(text)) >= 1),
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

create policy "vidět komentáře u příspěvků, které smím vidět" on public.post_comments
  for select
  using (exists (
    select 1 from public.posts p
    where p.id = post_comments.post_id and public.smi_videt_prispevky_uzivatele(p.user_id)
  ));

create policy "komentovat smí jen skutečný účet" on public.post_comments
  for insert
  with check (
    user_id = auth.uid()
    and public.je_skutecny_ucet()
    and not public.je_zabanovan_ze_social()
    and exists (
      select 1 from public.posts p
      where p.id = post_comments.post_id and public.smi_videt_prispevky_uzivatele(p.user_id)
    )
  );

-- Smazat smí autor komentáře, nebo majitel příspěvku (stejné právo,
-- jaké má na svém profilu ve skutečném světě — moderuje si vlastní
-- zeď). Žádná editace komentáře v týhle fázi — stejná jednoduchost
-- jako u message_reactions, žádná historie verzí.
create policy "smazat komentář smí autor nebo majitel příspěvku" on public.post_comments
  for delete
  using (
    user_id = auth.uid()
    or exists (select 1 from public.posts p where p.id = post_comments.post_id and p.user_id = auth.uid())
  );
