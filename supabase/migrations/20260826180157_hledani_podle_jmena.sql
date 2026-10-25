-- ==========================================
-- Vyhledávání lidí podle jména — appka se přejmenovává ze SchoolBuddy na
-- Buddy a necílí už jen na školáky, takže dřívější "jen podle kódu"
-- (viz najdi_podle_kodu, CLAUDE.md) přestává být jedinou cestou. Kód
-- samotný v databázi zůstává beze změny — bude znovu použitý pro
-- budoucí secret chat, jen ho Social v UI přestává nabízet.
--
-- I tak je tohle řízená funkce, ne plain RLS politika pouštějící číst
-- celou tabulku profiles: SECURITY DEFINER, nejmíň 2 znaky dotazu (jinak
-- nic nevrátí), max 20 výsledků, a vzájemně blokovaní se navzájem
-- nevidí — stejná ochrana, jakou zprávy i tak už mají přes
-- je_blokovan_se_mnou().
-- ==========================================

create or replace function public.hledej_podle_jmena(dotaz text)
returns table (id uuid, display_name text, avatar_url text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  where length(btrim(dotaz)) >= 2
    and p.id <> auth.uid()
    and p.display_name ilike '%' || btrim(dotaz) || '%'
    and not public.je_blokovan_se_mnou(p.id)
  order by p.display_name
  limit 20;
$$;

grant execute on function public.hledej_podle_jmena(text) to authenticated;
