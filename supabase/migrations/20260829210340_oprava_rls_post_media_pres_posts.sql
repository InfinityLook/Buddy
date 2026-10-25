
-- Stejná chyba jako u post_likes/post_comments dřív (viz
-- oprava_rls_lajku_a_komentaru_pres_posts): posts nemá plain SELECT
-- politiku vůbec, takže "exists (select 1 from posts where …)" uvnitř
-- jiné tabulky's RLS politiky tiše vrací nic, i pro vlastníka
-- příspěvku samotného. Oprava přes autor_prispevku() — SECURITY
-- DEFINER funkce, co elevaci provede uvnitř sebe, ne přes syrový
-- poddotaz bez ní.
drop policy "přidat další médium smí jen vlastník příspěvku" on public.post_media;

create policy "přidat další médium smí jen vlastník příspěvku" on public.post_media
  for insert with check (public.autor_prispevku(post_id) = auth.uid());
