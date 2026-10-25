-- Foto/video zprávy v chatu (Social Fáze — foto/video v chatu).
-- media_path je jen cesta v privátním bucketu 'chat-media', nikdy plná
-- URL — appka si k ní generuje krátkodobě platný podepsaný odkaz při
-- vykreslení, stejná úvaha jako u banner_url/avatar_url, jen bucket tady
-- musí zůstat privátní (na rozdíl od 'avatary'), protože obsah chatu je
-- soukromý mezi členy, ne veřejný jako profilová fotka.
alter table public.messages
  add column media_path text,
  add column media_type text check (media_type is null or media_type in ('image', 'video')),
  add constraint media_path_ma_typ check (media_path is null or media_type is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  26214400, -- 25 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
);

-- Cesta objektu je vždy '<chat_id>/<souborové jméno>' — první segment
-- cesty tak funguje jako chat_id, přesně jak to storage.foldername()
-- vrací. Číst i nahrávat smí jen člen daného chatu — stejná dvojice
-- podmínek jako u messages' vlastní INSERT politiky výš, ať appka
-- nemá dvě různá pravidla pro to samé.
create policy "člen chatu smí do jeho složky nahrát médium"
on storage.objects for insert
with check (
  bucket_id = 'chat-media'
  and jsem_clenem(((storage.foldername(name))[1])::uuid)
  and je_skutecny_ucet()
  and not je_zabanovan_ze_social()
);

create policy "člen chatu smí médium z jeho složky číst"
on storage.objects for select
using (
  bucket_id = 'chat-media'
  and jsem_clenem(((storage.foldername(name))[1])::uuid)
);
