
-- Zvýraznění (Highlights) — pojmenovaná trvalá sbírka story na profilu,
-- co narozdíl od obyčejné story nezmizí po 24 h. Přidání do zvýraznění
-- OKOPÍRUJE media_path/media_type/caption story v okamžiku přidání do
-- vlastní trvalé položky (story_highlight_polozky) — původní řádek
-- ve `stories` appka nijak nemění, dál expiruje a maže se přesně jako
-- dřív (smaz_expirovane_stories se ho vůbec netýká, protože zvýraznění
-- je od teď nezávislá kopie, ne odkaz na story samotnou).
create table public.story_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nazev text not null check (char_length(nazev) between 1 and 30),
  created_at timestamptz not null default now()
);

create table public.story_highlight_polozky (
  id uuid primary key default gen_random_uuid(),
  highlight_id uuid not null references public.story_highlights(id) on delete cascade,
  media_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index story_highlight_polozky_highlight_id_idx on public.story_highlight_polozky (highlight_id, position);

alter table public.story_highlights enable row level security;
alter table public.story_highlight_polozky enable row level security;

-- Viditelnost zvýraznění kopíruje viditelnost příspěvků (ne story
-- samotné) — zvýraznění appka chce jako trvalou součást profilu, ne
-- jako ještě jednu věc omezenou jen na vzájemné přátele. smi_videt_
-- prispevky_uzivatele() je SECURITY DEFINER funkce, bezpečné volat
-- přímo v RLS (na rozdíl od syrového poddotazu na posts, co nemá
-- vlastní SELECT politiku).
create policy "vidět zvýraznění, které smím vidět" on public.story_highlights
  for select using (public.smi_videt_prispevky_uzivatele(user_id));

create policy "založit vlastní zvýraznění" on public.story_highlights
  for insert with check (user_id = auth.uid() and public.je_skutecny_ucet() and not public.je_zabanovan_ze_social());

create policy "přejmenovat vlastní zvýraznění" on public.story_highlights
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "smazat vlastní zvýraznění" on public.story_highlights
  for delete using (user_id = auth.uid());

-- Kdo vlastní zvýraznění, do kterého položka patří — stejný "autor_
-- prispevku"-tvar jako u příspěvků, tady jen o úroveň výš (zvýraznění
-- místo příspěvku, položka místo příspěvku).
create function public.autor_zvyrazneni(p_highlight_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select user_id from public.story_highlights where id = p_highlight_id;
$$;

revoke all on function public.autor_zvyrazneni(uuid) from public, anon;
grant execute on function public.autor_zvyrazneni(uuid) to authenticated;

create policy "vidět položky zvýraznění, které smím vidět" on public.story_highlight_polozky
  for select using (
    exists (select 1 from public.story_highlights h where h.id = story_highlight_polozky.highlight_id)
  );

create policy "přidat položku do vlastního zvýraznění" on public.story_highlight_polozky
  for insert with check (public.autor_zvyrazneni(highlight_id) = auth.uid());

create policy "smazat položku z vlastního zvýraznění" on public.story_highlight_polozky
  for delete using (public.autor_zvyrazneni(highlight_id) = auth.uid());
