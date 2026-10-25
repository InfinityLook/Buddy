
-- Sdílet příspěvek do chatu — stejný tvar jako messages.story_id: jeden
-- nepovinný sloupec, žádná zvláštní RLS validace (messages' vlastní
-- INSERT politika už plně řídí, kdo smí psát do kterého chatu, a
-- shared_post_id je jen odkaz, ne citlivé pole).
alter table public.messages add column shared_post_id uuid references public.posts(id) on delete set null;

-- Čtení sdíleného příspěvku v bublině — na rozdíl od story appka tu
-- opravdu ukazuje náhled, ne jen obecný štítek, protože sdílení
-- příspěvku je celé o tom, že si ho příjemce prohlédne. smim_videt_prispevek()
-- se ale musí ověřit vždycky znovu při čtení, ne jen v okamžiku sdílení
-- — příjemce nemusí vůbec smět vidět příspěvky autora (soukromý účet,
-- blokace), i když odesílatel sám smí.
create function public.nacti_jeden_prispevek(p_post_id uuid)
returns table (id uuid, user_id uuid, media_path text, media_type text, caption text, created_at timestamptz, dalsi_media jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.user_id, p.media_path, p.media_type, p.caption, p.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object('media_path', pm.media_path, 'media_type', pm.media_type) order by pm.position)
       from public.post_media pm where pm.post_id = p.id),
      '[]'::jsonb
    ) as dalsi_media
  from public.posts p
  where p.id = p_post_id and public.smim_videt_prispevek(p.id);
$$;

revoke all on function public.nacti_jeden_prispevek(uuid) from public, anon;
grant execute on function public.nacti_jeden_prispevek(uuid) to authenticated;
