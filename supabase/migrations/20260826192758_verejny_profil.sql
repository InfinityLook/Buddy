-- Zobrazení cizího profilu v Social (přátelé, hlavička 1:1 chatu,
-- výsledky hledání) — avatar/jméno appka už umí odjinud, ale úroveň/XP/
-- sérii a role tag ne. Přímé čtení přes RLS politiku "číst svůj profil,
-- profily přátel a spoluúčastníků chat" by pokrylo přátele a chat, ale
-- ne výsledky hledání (tam žádný vztah ještě neexistuje) — stejná
-- řízená funkce jako u hledej_podle_jmena/najdi_podle_kodu proto
-- funguje jednotně pro všechny tři vstupní body, ne dvěma různými
-- cestami podle toho, odkud se profil otevřel.
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
    and not public.je_blokovan_se_mnou(cil);
$$;

grant execute on function public.precti_verejny_profil(uuid) to authenticated;
