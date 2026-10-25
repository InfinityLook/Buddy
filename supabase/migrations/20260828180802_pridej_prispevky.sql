
-- ==========================================
-- Trvalé příspěvky na profilu (Posts | Videos grid) — na rozdíl od
-- Stories nemizí po 24 h, a na rozdíl od chatového média nepatří
-- žádnému konkrétnímu chatu, patří profilu. Bucket je veřejný jako
-- 'avatary' (ne privátní jako 'chat-media'/'stories') — příspěvek na
-- profilu je zamýšlený jako veřejně viditelný komukoli, kdo profil
-- otevře, stejná úroveň citlivosti, jakou appka už přijala pro
-- profilovou fotku/banner.
-- ==========================================

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_path text not null,
  media_type text not null check (media_type in ('image','video')),
  caption text,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "přidat příspěvek smí jen sám za sebe"
  on public.posts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.je_skutecny_ucet()
    and not public.je_zabanovan_ze_social()
  );

create policy "smazat příspěvek smí jen jeho autor"
  on public.posts for delete
  to authenticated
  using (user_id = auth.uid());

-- Žádná plain SELECT politika — čtení jde přes nacti_prispevky() níž,
-- stejný důvod jako u precti_verejny_profil(): appka nechce jednu
-- širokou politiku "authenticated přečte všechno", i když by výsledek
-- byl skoro stejný, protože takhle je odmítnutí blokovaného vynucené
-- na jednom místě, ne opakované v každém dotazu, co kdy na posts sáhne.
create function public.nacti_prispevky(cil uuid)
returns table (
  id uuid,
  user_id uuid,
  media_path text,
  media_type text,
  caption text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at
  from public.posts p
  where p.user_id = cil
    -- Explicitní strážce, ne jen not je_blokovan_se_mnou(cil) — ten
    -- sám o sobě s auth.uid() NULL (nepřihlášený volající) nenajde
    -- žádný blok a vrátí false, takže "not ..." vyjde true i pro
    -- anonyma. Přesně tahle chyba se v týhle appce stala už třikrát
    -- (ma_pravo_na_tajny_chat, precti_verejny_profil), tady se
    -- kontroluje rovnou, ne až dodatečně.
    and auth.uid() is not null
    and not public.je_blokovan_se_mnou(cil)
  order by p.created_at desc;
$$;

revoke execute on function public.nacti_prispevky(uuid) from public, anon;
grant execute on function public.nacti_prispevky(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'posts',
  'posts',
  true,
  26214400,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
);

create policy "vlastní složku posts smí nahrát jen majitel"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vlastní příspěvek ve storage smí smazat jen majitel"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "posts fotky/videa smí číst kdokoli"
  on storage.objects for select
  using (bucket_id = 'posts');
