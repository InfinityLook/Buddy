-- Stories — foto s volitelným popiskem, viditelné přátelům 24 hodin,
-- pak zmizí. Stejný "belt and suspenders" vzor jako u tajne_zpravy:
-- SELECT politika skryje expirovanou story okamžitě bez ohledu na to,
-- jestli byla fyzicky smazána, cleanup funkce níž ji smaže později.
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  media_path text not null,
  caption text check (caption is null or char_length(caption) <= 200),
  created_at timestamptz not null default now(),
  expiruje_at timestamptz not null default (now() + interval '24 hours')
);

-- Kdo story zhlédl — appka podle toho ukáže autorovi seznam zhlédnutí
-- a divákovi "už jsem tohle viděl/a" (kroužek kolem avataru v liště).
create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references auth.users(id),
  zhlednuto_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

alter table public.stories enable row level security;
alter table public.story_views enable row level security;

create policy "číst vlastní a přátelské nezexpirované stories"
on public.stories for select
using (
  expiruje_at > now()
  and (user_id = auth.uid() or (je_muj_pritel(user_id) and not je_blokovan_se_mnou(user_id)))
);

create policy "založit story smí jen sám za sebe"
on public.stories for insert
with check (
  user_id = auth.uid() and je_skutecny_ucet() and not je_zabanovan_ze_social()
);

create policy "smazat jen vlastní story"
on public.stories for delete
using (user_id = auth.uid());

create policy "zaznamenat zhlédnutí smí jen sám za sebe na story, kterou vidí"
on public.story_views for insert
with check (
  viewer_id = auth.uid()
  and exists (
    select 1 from public.stories s
    where s.id = story_id and s.expiruje_at > now()
      and (s.user_id = auth.uid() or (je_muj_pritel(s.user_id) and not je_blokovan_se_mnou(s.user_id)))
  )
);

create policy "autor vidí všechna zhlédnutí své story, divák jen svoje"
on public.story_views for select
using (
  viewer_id = auth.uid()
  or exists (select 1 from public.stories s where s.id = story_id and s.user_id = auth.uid())
);

-- Cleanup — žádný pg_cron v tomhle projektu (stejně jako u tajných
-- zpráv), volá se z klienta při otevření Profilu/lišty stories.
-- SECURITY DEFINER, protože maže napříč vlastníky, ne jen svoje řádky.
create or replace function public.smaz_expirovane_stories()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.stories where expiruje_at <= now();
$$;
revoke all on function public.smaz_expirovane_stories() from public;
grant execute on function public.smaz_expirovane_stories() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stories', 'stories', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']);

-- Cesta je vždy '<user_id>/<story_id>.jpg' — nahrát smí jen majitel
-- složky, přečíst majitel a jeho (neblokovaní) přátelé, stejná dvojice
-- podmínek jako u chat-media výš, jen "člen chatu" nahrazené "přítel".
create policy "vlastní složku stories smí nahrát jen majitel"
on storage.objects for insert
with check (
  bucket_id = 'stories'
  and ((storage.foldername(name))[1])::uuid = auth.uid()
  and je_skutecny_ucet()
  and not je_zabanovan_ze_social()
);

create policy "story fotku smí číst autor a jeho přátelé"
on storage.objects for select
using (
  bucket_id = 'stories'
  and (
    ((storage.foldername(name))[1])::uuid = auth.uid()
    or (
      je_muj_pritel(((storage.foldername(name))[1])::uuid)
      and not je_blokovan_se_mnou(((storage.foldername(name))[1])::uuid)
    )
  )
);
