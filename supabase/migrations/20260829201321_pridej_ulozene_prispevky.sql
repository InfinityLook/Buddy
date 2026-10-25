
-- "Uloženo" tab byl od IG redesignu jen stub ("bude brzy") — appka
-- teď skutečně umí uložit cizí příspěvek na vlastní seznam, viditelný
-- jen tomu, kdo ho uložil (na rozdíl od lajku appka záměrně nikde
-- neukazuje, kdo si co uložil — to na Instagramu taky není veřejné).
create table public.saved_posts (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.saved_posts enable row level security;

create policy "číst vlastní uložené" on public.saved_posts
  for select using (user_id = auth.uid());

-- smim_videt_prispevek() — stejná SECURITY DEFINER funkce, kterou si
-- lajky/komentáře vynutily po chybě s elevací přes posts (viz
-- oprava_rls_lajku_a_komentaru_pres_posts) — uložit jde jen to, co
-- appka smí zrovna teď vidět, ne libovolné cizí id.
create policy "uložit vlastní" on public.saved_posts
  for insert with check (user_id = auth.uid() and public.smim_videt_prispevek(post_id));

create policy "odebrat vlastní uložené" on public.saved_posts
  for delete using (user_id = auth.uid());

-- Čtení uloženého seznamu jde přes funkci, ne přímý join na posts z
-- klienta (posts nemá plain SELECT politiku vůbec) — a zároveň znovu
-- ověří viditelnost: příspěvek uložený od účtu, který mezitím zablokoval
-- nebo zprivátnil profil, appka v Uloženém dál neukáže, i když řádek
-- v saved_posts zůstává.
create or replace function public.nacti_ulozene_prispevky()
returns table (
  id uuid,
  user_id uuid,
  media_path text,
  media_type text,
  caption text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Přístup jen pro přihlášené.' using errcode = '42501';
  end if;

  return query
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at
  from public.saved_posts s
  join public.posts p on p.id = s.post_id
  where s.user_id = auth.uid() and public.smim_videt_prispevek(p.id)
  order by s.created_at desc;
end;
$$;

revoke all on function public.nacti_ulozene_prispevky() from public, anon;
grant execute on function public.nacti_ulozene_prispevky() to authenticated;
