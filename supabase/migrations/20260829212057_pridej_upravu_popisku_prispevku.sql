
-- Úprava popisku příspěvku po zveřejnění — messages.edited_at už tenhle
-- "jen aktuální text, žádná historie" vzor zavedlo, posts.edited_at ho
-- opakuje. Klient posílá v UPDATE jen caption/edited_at (nikdy
-- media_path/media_type/user_id) — RLS to nijak nevynucuje po
-- sloupcích (Postgres to neumí), appka to prostě neposílá.
alter table public.posts add column edited_at timestamptz;

create policy "upravit popisek vlastního příspěvku" on public.posts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
