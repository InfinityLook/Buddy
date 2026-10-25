-- Hlasové zprávy — třetí hodnota media_type vedle image/video, stejná
-- infrastruktura jako foto/video v chatu (migrace
-- pridej_media_zpravy_v_chatu): stejný bucket 'chat-media', stejná
-- RLS (jsem_clenem podle prvního segmentu cesty), jen nová hodnota
-- v CHECKu a rozšíření povolených MIME typů bucketu o audio formáty.
alter table public.messages drop constraint messages_media_type_check;
alter table public.messages add constraint messages_media_type_check
  check (media_type is null or media_type in ('image', 'video', 'audio'));

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a'
]
where id = 'chat-media';
