
-- Fitness Room, Fáze 4 — Žebříček s přáteli (ve skutečnosti globální,
-- viz CLAUDE.md pro zdůvodnění): celkové fitness XP se sčítá klientsky
-- (useGamificationStore.ts) z 'workout'/'behani'/'posilovna'/'mobilita'
-- ActivityKindů a syncuje se sem jako jedno číslo, stejným "higher wins"
-- mechanismem jako xp/streak_days.
alter table public.profiles
  add column fitness_xp integer not null default 0;

-- Top žebříček — capped na 50 řádků (stejná zdrženlivost jako
-- hledej_podle_jmena's limit 20/navrhy_pratel's limit 8), vyloučené
-- oboustranně blokované dvojice, nikdo s nulovým fitness_xp (nemá smysl
-- v "top" seznamu). auth.uid() is not null guard proti anonymnímu
-- volajícímu — je_blokovan_se_mnou samo o sobě by s NULL auth.uid()
-- nikoho nenašlo a tichým nic-nevyloučit efektem by nechráněně vrátilo
-- řádky i pro nepřihlášeného (stejná past jako u
-- ma_pravo_na_tajny_chat/precti_verejny_profil, viz CLAUDE.md).
create or replace function public.nacti_zebricek_fitness()
returns table(id uuid, display_name text, avatar_url text, role text, fitness_xp integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.avatar_url,
         coalesce(r.role, 'user') as role,
         p.fitness_xp
  from public.profiles p
  left join public.user_roles r
    on r.user_id = p.id and (r.valid_until is null or r.valid_until > now())
  where auth.uid() is not null
    and p.fitness_xp > 0
    and not public.je_blokovan_se_mnou(p.id)
  order by p.fitness_xp desc, p.display_name
  limit 50;
$$;

revoke all on function public.nacti_zebricek_fitness() from public, anon;
grant execute on function public.nacti_zebricek_fitness() to authenticated;

-- Vlastní pozice — poctivé i mimo viditelných 50 (stejný "count je
-- veřejný, seznam za ním nikdy" postoj jako pocet_spolecnych_pratel).
create or replace function public.muj_zebricek_radek()
returns table(fitness_xp integer, poradi integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.fitness_xp,
         case
           when p.fitness_xp > 0 then (
             1 + (
               select count(*)::integer
               from public.profiles p2
               where p2.fitness_xp > p.fitness_xp
                 and p2.id <> auth.uid()
                 and not public.je_blokovan_se_mnou(p2.id)
             )
           )
           else null
         end as poradi
  from public.profiles p
  where p.id = auth.uid()
    and auth.uid() is not null;
$$;

revoke all on function public.muj_zebricek_radek() from public, anon;
grant execute on function public.muj_zebricek_radek() to authenticated;
