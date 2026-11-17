-- ==========================================================================
-- Library — katalog knih, komiksů a scénářů (Fáze 1: schéma, RLS, úložiště).
--
-- Zásady, které tahle migrace drží:
--  * Čtenář vidí jen ZVEŘEJNĚNÉ dílo a jen jeho SCHVÁLENOU verzi. Koncepty
--    vidí jen autor (a správce), ke schválení čekající věci moderátor.
--  * Uživatelé do works/versions ZATÍM vůbec nezapisují (žádná politika) —
--    publikování z Writer's Room půjde přes SECURITY DEFINER funkce až ve
--    Fázi 7. Katalog plní správce přímo (politika jsem_admin()).
--  * Počítadla (hodnocení, čtenáři) mění jen triggery, nikdy klient.
--  * Pomocné funkce pro politiky nejsou volatelné anonymně (revoke), ať
--    se neopakuje chyba s výchozím EXECUTE pro anon.
--  * Smazání účtu: owner_id/user_id mají ON DELETE CASCADE, takže díla
--    autora, jeho recenze i cizí záložky na jeho díla zmizí s ním.
-- ==========================================================================

-- ---------- Autoři z katalogu (Verne, Čapek…; uživatelé mají profil) --------
create table public.library_authors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  bio text check (char_length(bio) <= 2000),
  born_year smallint,
  died_year smallint,
  photo_path text check (char_length(photo_path) <= 300),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Díla ------------------------------------------------------------
create table public.library_works (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('kniha', 'komiks', 'scenar')),
  title text not null check (char_length(title) between 1 and 160),
  summary text not null default '' check (char_length(summary) <= 2000),
  language text not null default 'cs' check (language ~ '^[a-z]{2,3}$'),
  genres text[] not null default '{}' check (cardinality(genres) <= 5),
  age_rating text not null default 'vsichni' check (age_rating in ('vsichni', '12', '16')),
  license text not null check (license in (
    'public-domain', 'cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nd',
    'cc-by-nc-sa', 'cc-by-nc-nd', 'vlastni', 'smluvni'
  )),
  license_url text check (char_length(license_url) <= 500),
  source_url text check (char_length(source_url) <= 500),
  attribution text check (char_length(attribution) <= 500),
  -- U překladů volných děl: je i samotný překlad volný? null = originál.
  translation_free boolean,
  author_name text not null check (char_length(author_name) between 1 and 120),
  author_id uuid references public.library_authors(id) on delete set null,
  -- null = dílo z katalogu (dodal správce); jinak uživatel, který ho vydal.
  owner_id uuid references auth.users(id) on delete cascade,
  cover_path text check (char_length(cover_path) <= 300),
  status text not null default 'koncept'
    check (status in ('koncept', 'ke_schvaleni', 'zverejneno', 'odmitnuto', 'skryto')),
  published_version_id uuid,
  -- id dokumentu ve Writer's Room, ze kterého dílo vzniklo (aktualizace).
  source_doc_id text check (char_length(source_doc_id) <= 100),
  featured_at timestamptz,
  published_at timestamptz,
  rating_count integer not null default 0 check (rating_count >= 0),
  rating_sum integer not null default 0 check (rating_sum >= 0),
  readers_count integer not null default 0 check (readers_count >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_works_zverejneno_ma_verzi
    check (status <> 'zverejneno' or published_version_id is not null),
  -- Uživatel nesmí do katalogu vlastním jménem vložit cizí volné dílo ani
  -- smluvní obsah — to smí jen správce (owner_id is null).
  constraint library_works_licence_uzivatele
    check (owner_id is null or license not in ('public-domain', 'smluvni'))
);

-- ---------- Verze děl (neměnné snapshoty, schvalují se zvlášť) -------------
create table public.library_versions (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.library_works(id) on delete cascade,
  version_no integer not null check (version_no >= 1),
  format text not null check (format in ('text', 'komiks-obrazky', 'scenar')),
  status text not null default 'koncept'
    check (status in ('koncept', 'ke_schvaleni', 'schvaleno', 'odmitnuto')),
  review_note text check (char_length(review_note) <= 1000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  chapter_count integer not null default 0 check (chapter_count >= 0),
  page_count integer not null default 0 check (page_count >= 0),
  word_count integer not null default 0 check (word_count >= 0),
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (work_id, version_no),
  unique (work_id, id)
);

-- Zveřejněná verze musí patřit ke stejnému dílu (složený cizí klíč; při
-- smazání verze se vynuluje jen published_version_id, ne id díla).
alter table public.library_works
  add constraint library_works_zverejnena_verze_fkey
  foreign key (id, published_version_id)
  references public.library_versions (work_id, id)
  on delete set null (published_version_id);

-- ---------- Obsah verzí -----------------------------------------------------
-- Kapitoly knihy / scény scénáře. Obsah je pole bloků (ne HTML), takže se
-- vykresluje jako React text a nejde do něj propašovat skript; stejné bloky
-- slouží jako stabilní kotvy pro záložky a zvýraznění (kapitola, blok, znak).
create table public.library_chapters (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.library_versions(id) on delete cascade,
  position integer not null check (position >= 0),
  title text not null default '' check (char_length(title) <= 200),
  blocks jsonb not null default '[]'
    check (jsonb_typeof(blocks) = 'array' and pg_column_size(blocks) <= 1000000),
  word_count integer not null default 0 check (word_count >= 0),
  created_at timestamptz not null default now(),
  unique (version_id, position)
);

-- Strany komiksu (obrázky ve Storage) s volitelnými panely pro režim
-- "panel po panelu" (normalizované obdélníky 0..1).
create table public.library_pages (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.library_versions(id) on delete cascade,
  position integer not null check (position >= 0),
  image_path text not null check (char_length(image_path) <= 300),
  width integer check (width > 0),
  height integer check (height > 0),
  alt text check (char_length(alt) <= 300),
  panels jsonb not null default '[]' check (jsonb_typeof(panels) = 'array'),
  created_at timestamptz not null default now(),
  unique (version_id, position)
);

-- ---------- Data čtenáře (jen vlastní řádky) -------------------------------
create table public.library_shelf (
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id uuid not null references public.library_works(id) on delete cascade,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, work_id)
);

create table public.library_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id uuid not null references public.library_works(id) on delete cascade,
  version_id uuid references public.library_versions(id) on delete set null,
  chapter_pos integer not null default 0 check (chapter_pos >= 0),
  block_idx integer not null default 0 check (block_idx >= 0),
  char_off integer not null default 0 check (char_off >= 0),
  page_pos integer not null default 0 check (page_pos >= 0),
  percent numeric(5, 2) not null default 0 check (percent between 0 and 100),
  seconds_read integer not null default 0 check (seconds_read >= 0),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, work_id)
);

-- Záložky, zvýraznění a poznámky. Id vymýšlí klient (offline-first),
-- smazání je tombstone, ať se dá synchronizovat mezi zařízeními.
create table public.library_annotations (
  id text primary key check (char_length(id) between 1 and 100),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id uuid not null references public.library_works(id) on delete cascade,
  version_id uuid references public.library_versions(id) on delete set null,
  kind text not null check (kind in ('zalozka', 'zvyrazneni', 'poznamka')),
  chapter_pos integer not null default 0 check (chapter_pos >= 0),
  block_idx integer not null default 0 check (block_idx >= 0),
  char_start integer not null default 0 check (char_start >= 0),
  char_end integer not null default 0 check (char_end >= 0),
  page_pos integer check (page_pos >= 0),
  excerpt text check (char_length(excerpt) <= 500),
  note text check (char_length(note) <= 2000),
  color text check (color in ('zluta', 'zelena', 'modra', 'ruzova', 'fialova')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.library_reviews (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.library_works(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text check (char_length(body) <= 2000),
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_id, user_id)
);

-- ---------- Indexy ---------------------------------------------------------
create index library_authors_name_idx on public.library_authors (name);
create index library_works_status_pub_idx on public.library_works (status, published_at desc);
create index library_works_owner_idx on public.library_works (owner_id) where owner_id is not null;
create index library_works_featured_idx on public.library_works (featured_at desc) where featured_at is not null;
create index library_works_kind_idx on public.library_works (kind);
create index library_works_genres_idx on public.library_works using gin (genres);
create index library_works_author_idx on public.library_works (author_id) where author_id is not null;
create index library_versions_work_idx on public.library_versions (work_id);
create index library_shelf_user_idx on public.library_shelf (user_id);
create index library_shelf_work_idx on public.library_shelf (work_id);
create index library_progress_user_idx on public.library_progress (user_id, updated_at desc);
create index library_progress_work_idx on public.library_progress (work_id);
create index library_annotations_user_work_idx on public.library_annotations (user_id, work_id);
create index library_annotations_work_idx on public.library_annotations (work_id);
create index library_reviews_work_idx on public.library_reviews (work_id, created_at desc);
create index library_reviews_user_idx on public.library_reviews (user_id);

-- ---------- Nahlášení děl a recenzí (existující pipeline reports) ----------
alter table public.reports
  add column library_work_id uuid references public.library_works(id) on delete set null,
  add column library_review_id uuid references public.library_reviews(id) on delete set null;

alter table public.reports
  drop constraint reports_reason_check,
  add constraint reports_reason_check check (reason = any (array[
    'spam', 'obtezovani', 'nevhodny_obsah', 'nevhodne_foto', 'jine', 'porusuje_autorska_prava'
  ]));

-- ---------- Pomocné funkce pro politiky (jen "smím já …?") -----------------
create or replace function public.library_smi_videt_dilo(p_work uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.library_works w
    where w.id = p_work
      and (
        w.owner_id = auth.uid()
        or public.jsem_admin()
        or (w.status = 'zverejneno'
            and (w.owner_id is null or not public.je_blokovan_se_mnou(w.owner_id)))
        or (public.jsem_moderator() and w.status <> 'koncept')
      )
  );
$$;

create or replace function public.library_smi_cist_verzi(p_version uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.library_versions v
    join public.library_works w on w.id = v.work_id
    where v.id = p_version
      and (
        w.owner_id = auth.uid()
        or public.jsem_admin()
        or (w.status = 'zverejneno'
            and w.published_version_id = v.id
            and (w.owner_id is null or not public.je_blokovan_se_mnou(w.owner_id)))
        or (public.jsem_moderator() and v.status <> 'koncept')
      )
  );
$$;

create or replace function public.library_je_muj_koncept_verze(p_version uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.library_versions v
    join public.library_works w on w.id = v.work_id
    where v.id = p_version
      and w.owner_id = auth.uid()
      and v.status = 'koncept'
  );
$$;

create or replace function public.library_smi_recenzovat(p_work uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.library_works w
    where w.id = p_work
      and w.status = 'zverejneno'
      and w.owner_id is distinct from auth.uid()
      and (w.owner_id is null or not public.je_blokovan_se_mnou(w.owner_id))
  );
$$;

-- Cesta souboru: <uid>/<id díla>/… (uživatelská díla) nebo katalog/<id díla>/…
-- CASE hlídá, že se text převádí na uuid, jen když opravdu vypadá jako uuid.
create or replace function public.library_smi_psat_soubor(p_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and case
    when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.+$'
      and split_part(p_name, '/', 1) = auth.uid()::text
    then exists (
      select 1 from public.library_works w
      where w.id = split_part(p_name, '/', 2)::uuid and w.owner_id = auth.uid()
    )
    else false
  end;
$$;

-- Soubor strany/obrázku: <scope>/<id díla>/<id verze>/<soubor>; čte se, když
-- smím číst danou verzi.
create or replace function public.library_smi_cist_soubor(p_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_name ~ '^[^/]+/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.+$'
    then public.library_smi_cist_verzi(split_part(p_name, '/', 3)::uuid)
    else false
  end;
$$;

-- ---------- Triggery --------------------------------------------------------
create or replace function public.library_reviews_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  -- Klient nesmí recenzi sám skrýt/odkrýt ani ji přesunout k jinému dílu;
  -- skrývá moderátor přes SECURITY DEFINER funkci (current_user pak není
  -- authenticated).
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.hidden_at := null;
    else
      new.hidden_at := old.hidden_at;
      new.work_id := old.work_id;
      new.user_id := old.user_id;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.library_prepocet_hodnoceni()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_work uuid := coalesce(new.work_id, old.work_id);
begin
  update public.library_works w
     set rating_count = s.c, rating_sum = s.s
    from (
      select count(*)::int as c, coalesce(sum(rating), 0)::int as s
      from public.library_reviews
      where work_id = v_work and hidden_at is null
    ) s
   where w.id = v_work;
  return null;
end;
$$;

create or replace function public.library_prepocet_ctenaru()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.library_works
     set readers_count = greatest(0, readers_count + case when tg_op = 'INSERT' then 1 else -1 end)
   where id = coalesce(new.work_id, old.work_id);
  return null;
end;
$$;

create trigger library_reviews_guard_trg
  before insert or update on public.library_reviews
  for each row execute function public.library_reviews_guard();

create trigger library_reviews_hodnoceni_trg
  after insert or update of rating, hidden_at or delete on public.library_reviews
  for each row execute function public.library_prepocet_hodnoceni();

create trigger library_progress_ctenari_trg
  after insert or delete on public.library_progress
  for each row execute function public.library_prepocet_ctenaru();

create trigger library_authors_touch before update on public.library_authors
  for each row execute function public.touch_updated_at();
create trigger library_shelf_touch before update on public.library_shelf
  for each row execute function public.touch_updated_at();
create trigger library_progress_touch before update on public.library_progress
  for each row execute function public.touch_updated_at();
create trigger library_annotations_touch before update on public.library_annotations
  for each row execute function public.touch_updated_at();
create trigger library_reviews_touch before update on public.library_reviews
  for each row execute function public.touch_updated_at();

-- ---------- RLS -------------------------------------------------------------
alter table public.library_authors enable row level security;
alter table public.library_works enable row level security;
alter table public.library_versions enable row level security;
alter table public.library_chapters enable row level security;
alter table public.library_pages enable row level security;
alter table public.library_shelf enable row level security;
alter table public.library_progress enable row level security;
alter table public.library_annotations enable row level security;
alter table public.library_reviews enable row level security;

-- autoři: čte každý přihlášený, píše správce
create policy "autory čte každý přihlášený" on public.library_authors
  for select to authenticated using (true);
create policy "autory spravuje správce" on public.library_authors
  for all to authenticated using (public.jsem_admin()) with check (public.jsem_admin());

-- díla/verze/obsah: čtení podle viditelnosti, zápis jen správce
create policy "dílo vidí, kdo ho smí vidět" on public.library_works
  for select to authenticated using (public.library_smi_videt_dilo(id));
create policy "díla spravuje správce" on public.library_works
  for all to authenticated using (public.jsem_admin()) with check (public.jsem_admin());

create policy "verzi čte, kdo smí" on public.library_versions
  for select to authenticated using (public.library_smi_cist_verzi(id));
create policy "verze spravuje správce" on public.library_versions
  for all to authenticated using (public.jsem_admin()) with check (public.jsem_admin());

create policy "kapitoly čte, kdo smí číst verzi" on public.library_chapters
  for select to authenticated using (public.library_smi_cist_verzi(version_id));
create policy "kapitoly spravuje správce" on public.library_chapters
  for all to authenticated using (public.jsem_admin()) with check (public.jsem_admin());
create policy "kapitoly konceptu píše autor" on public.library_chapters
  for all to authenticated
  using (public.library_je_muj_koncept_verze(version_id))
  with check (public.library_je_muj_koncept_verze(version_id));

create policy "strany čte, kdo smí číst verzi" on public.library_pages
  for select to authenticated using (public.library_smi_cist_verzi(version_id));
create policy "strany spravuje správce" on public.library_pages
  for all to authenticated using (public.jsem_admin()) with check (public.jsem_admin());
create policy "strany konceptu píše autor" on public.library_pages
  for all to authenticated
  using (public.library_je_muj_koncept_verze(version_id))
  with check (public.library_je_muj_koncept_verze(version_id));

-- data čtenáře: jen vlastní řádky; přidat jde jen dílo, které smím vidět
create policy "polici čte jen vlastník" on public.library_shelf
  for select to authenticated using (user_id = auth.uid());
create policy "na polici přidá jen sám sobě" on public.library_shelf
  for insert to authenticated
  with check (user_id = auth.uid() and public.je_skutecny_ucet() and public.library_smi_videt_dilo(work_id));
create policy "polici mění jen vlastník" on public.library_shelf
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "z police maže jen vlastník" on public.library_shelf
  for delete to authenticated using (user_id = auth.uid());

create policy "postup čte jen vlastník" on public.library_progress
  for select to authenticated using (user_id = auth.uid());
create policy "postup zakládá jen sám sobě" on public.library_progress
  for insert to authenticated
  with check (user_id = auth.uid() and public.je_skutecny_ucet() and public.library_smi_videt_dilo(work_id));
create policy "postup mění jen vlastník" on public.library_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "postup maže jen vlastník" on public.library_progress
  for delete to authenticated using (user_id = auth.uid());

create policy "poznámky čte jen vlastník" on public.library_annotations
  for select to authenticated using (user_id = auth.uid());
create policy "poznámky zakládá jen sám sobě" on public.library_annotations
  for insert to authenticated
  with check (user_id = auth.uid() and public.je_skutecny_ucet() and public.library_smi_videt_dilo(work_id));
create policy "poznámky mění jen vlastník" on public.library_annotations
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "poznámky maže jen vlastník" on public.library_annotations
  for delete to authenticated using (user_id = auth.uid());

-- recenze: veřejné u viditelného díla, skryté jen autor a moderátor
create policy "recenze čte, kdo smí vidět dílo" on public.library_reviews
  for select to authenticated
  using (
    public.library_smi_videt_dilo(work_id)
    and (hidden_at is null or user_id = auth.uid() or public.jsem_moderator())
    and (user_id = auth.uid() or not public.je_blokovan_se_mnou(user_id))
  );
create policy "recenzi píše jen sám za sebe" on public.library_reviews
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.je_skutecny_ucet()
    and not public.je_zabanovan_ze_social()
    and public.library_smi_recenzovat(work_id)
  );
create policy "recenzi mění jen autor" on public.library_reviews
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recenzi maže autor nebo moderátor" on public.library_reviews
  for delete to authenticated using (user_id = auth.uid() or public.jsem_moderator());

-- ---------- Oprávnění: nic pro anon, funkce jen pro přihlášené --------------
revoke all on
  public.library_authors, public.library_works, public.library_versions,
  public.library_chapters, public.library_pages, public.library_shelf,
  public.library_progress, public.library_annotations, public.library_reviews
  from anon, public;
grant select, insert, update, delete on
  public.library_authors, public.library_works, public.library_versions,
  public.library_chapters, public.library_pages, public.library_shelf,
  public.library_progress, public.library_annotations, public.library_reviews
  to authenticated;

revoke all on function
  public.library_smi_videt_dilo(uuid), public.library_smi_cist_verzi(uuid),
  public.library_je_muj_koncept_verze(uuid), public.library_smi_recenzovat(uuid),
  public.library_smi_psat_soubor(text), public.library_smi_cist_soubor(text)
  from public, anon;
grant execute on function
  public.library_smi_videt_dilo(uuid), public.library_smi_cist_verzi(uuid),
  public.library_je_muj_koncept_verze(uuid), public.library_smi_recenzovat(uuid),
  public.library_smi_psat_soubor(text), public.library_smi_cist_soubor(text)
  to authenticated;

-- Triggerové funkce nejsou určené k volání přes /rest/v1/rpc.
revoke all on function
  public.library_reviews_guard(), public.library_prepocet_hodnoceni(),
  public.library_prepocet_ctenaru()
  from public, anon, authenticated;

-- ---------- Storage ---------------------------------------------------------
-- library-covers: veřejné obálky. library-pages: soukromé strany komiksů a
-- obrázky z EPUB, čtou se přes podepsané URL jen u díla, které smím číst.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('library-covers', 'library-covers', true, 2097152,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('library-pages', 'library-pages', false, 8388608,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "knihovna: obálky čte kdokoli" on storage.objects
  for select using (bucket_id = 'library-covers');
create policy "knihovna: obálky vkládá autor díla nebo správce" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'library-covers' and (public.jsem_admin() or public.library_smi_psat_soubor(name)));
create policy "knihovna: obálky mění autor díla nebo správce" on storage.objects
  for update to authenticated
  using (bucket_id = 'library-covers' and (public.jsem_admin() or public.library_smi_psat_soubor(name)));
create policy "knihovna: obálky maže autor díla nebo správce" on storage.objects
  for delete to authenticated
  using (bucket_id = 'library-covers' and (public.jsem_admin() or public.library_smi_psat_soubor(name)));

create policy "knihovna: strany čte, kdo smí číst verzi" on storage.objects
  for select to authenticated
  using (bucket_id = 'library-pages'
         and (public.jsem_admin() or public.library_smi_psat_soubor(name) or public.library_smi_cist_soubor(name)));
create policy "knihovna: strany vkládá autor díla nebo správce" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'library-pages' and (public.jsem_admin() or public.library_smi_psat_soubor(name)));
create policy "knihovna: strany mění autor díla nebo správce" on storage.objects
  for update to authenticated
  using (bucket_id = 'library-pages' and (public.jsem_admin() or public.library_smi_psat_soubor(name)));
create policy "knihovna: strany maže autor díla nebo správce" on storage.objects
  for delete to authenticated
  using (bucket_id = 'library-pages' and (public.jsem_admin() or public.library_smi_psat_soubor(name)));
