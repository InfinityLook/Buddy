-- precti_verejny_profil je (jako každá nová funkce v tomhle projektu)
-- technicky spustitelná i rolí anon přes PostgREST výchozí grant — u
-- ostatních funkcí (hledej_podle_jmena, najdi_podle_kodu…) to nevadí,
-- protože se samy chrání odkazem na auth.uid() (NULL u anon dělá
-- podmínku nepravdivou). Tahle funkce se ale opírala jen o
-- je_blokovan_se_mnou(cil), která je s auth.uid() = NULL vždycky
-- nepravdivá (žádná blokace se nenajde) — takže by bez přihlášení
-- prošla úplně stejně jako s ním a vrátila cizí xp/level/sérii/roli
-- komukoli bez účtu. Přidán výslovný požadavek na přihlášení.
create or replace function public.precti_verejny_profil(cil uuid)
returns table (display_name text, avatar_url text, xp integer, level integer, streak_days integer, role text)
language sql
stable security definer
set search_path = ''
as $$
  select p.display_name, p.avatar_url, p.xp, p.level, p.streak_days,
         coalesce(r.role, 'user') as role
  from public.profiles p
  left join public.user_roles r
    on r.user_id = p.id and (r.valid_until is null or r.valid_until > now())
  where p.id = cil
    and auth.uid() is not null
    and not public.je_blokovan_se_mnou(cil);
$$;
