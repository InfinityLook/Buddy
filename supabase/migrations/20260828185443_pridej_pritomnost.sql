
-- ==========================================
-- Online/offline mezi přáteli — na rozdíl od Presence kanálu u
-- otevřeného chatu (sledovatPritomnost v api.ts, "je v tomhle
-- konkrétním chatu právě teď") tohle je appka-wide "má appku
-- otevřenou vůbec", ale schválně viditelné jen přátelům, ne komukoli
-- (na rozdíl od úplně globálního kanálu, který by appka dřív musela
-- postavit nad Realtime Presence a který by šel zneužít i tím, kdo
-- tě jen jednou viděl — viz zdůvodnění u sledovatPritomnost výš
-- v tomhle souboru).
--
-- Plain tabulka + last_seen_at, ne skutečný Presence kanál — appka
-- "online" odvozuje na klientovi z toho, jak čerstvý je poslední
-- záznam (viz JE_ONLINE_PRAH_MS v social/presence.ts), stejná
-- "absolutní čas, ne countdown" logika jako Pomodoro/registerSW.ts.
create table public.presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.presence enable row level security;

create policy "vlastní přítomnost lze zapsat"
  on public.presence for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "vlastní přítomnost lze aktualizovat"
  on public.presence for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Číst smí vlastník, nebo nezablokovaný přítel — stejná dvojice
-- podmínek jako u story visibility, ne širší.
create policy "přítomnost čte vlastník nebo nezablokovaný přítel"
  on public.presence for select
  to authenticated
  using (
    user_id = auth.uid()
    or (public.je_muj_pritel(user_id) and not public.je_blokovan_se_mnou(user_id))
  );

alter publication supabase_realtime add table public.presence;
