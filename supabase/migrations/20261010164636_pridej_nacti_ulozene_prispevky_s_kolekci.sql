create function public.nacti_ulozene_prispevky_s_kolekci()
returns table(id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamp with time zone, dalsi_media jsonb, edited_at timestamp with time zone, collection_id uuid)
language plpgsql security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Přístup jen pro přihlášené.' using errcode = '42501';
  end if;

  return query
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object('media_path', pm.media_path, 'media_type', pm.media_type) order by pm.position)
       from public.post_media pm where pm.post_id = p.id),
      '[]'::jsonb
    ) as dalsi_media,
    p.edited_at,
    s.collection_id
  from public.saved_posts s
  join public.posts p on p.id = s.post_id
  where s.user_id = auth.uid() and public.smim_videt_prispevek(p.id)
  order by s.created_at desc;
end;
$function$;

revoke all on function public.nacti_ulozene_prispevky_s_kolekci() from public, anon;
grant execute on function public.nacti_ulozene_prispevky_s_kolekci() to authenticated;
