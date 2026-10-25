
-- Odpovědi na komentář — jeden nepovinný sloupec, stejný tvar jako
-- messages.reply_to_id/story_id (žádná zvláštní RLS validace, "server
-- computes" tu není potřeba: appka jen skládá vlákno, nejde o citlivé
-- pole). ON DELETE SET NULL — smazaná rodičovská odpověď povýší svoje
-- vlastní odpovědi zpátky na kořenový komentář, ne že by appka musela
-- řešit osiřelé vlákno.
alter table public.post_comments add column reply_to_id uuid references public.post_comments(id) on delete set null;

-- Skutečná chyba, chycená při stavbě odpovědí, ne teoretická: appka
-- doteď jméno autora komentáře dotahovala přes obyčejné nactiProfily()
-- (plain SELECT na profiles), jehož RLS pustí jen přítele/spoluúčastníka
-- chatu/čekající sledování — kdokoli přihlášený smí ale okomentovat
-- veřejný účet i bez přátelství (post_comments' vlastní INSERT politika
-- to už dovoluje přes smi_videt_prispevek). Komentář od cizího, ne-
-- přátelského účtu appka proto dosud tiše zahazovala (nactiProfily()
-- pro něj vrátil nic, .filter(k => k !== null) ho vynechal) — reálná
-- ztráta dat, ne jen kosmetická vada, teď opravená stejnou SECURITY
-- DEFINER cestou jako nacti_aktivitu_prispevku/nacti_ulozene_prispevky
-- výš.
create or replace function public.nacti_komentare_prispevku(p_post_id uuid)
returns table (
  id uuid,
  post_id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  text text,
  created_at timestamptz,
  reply_to_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Přístup jen pro přihlášené.' using errcode = '42501';
  end if;
  if not public.smim_videt_prispevek(p_post_id) then
    raise exception 'K tomuhle příspěvku nemáš přístup.' using errcode = '42501';
  end if;

  return query
  select c.id, c.post_id, c.user_id, p.display_name, p.avatar_url, c.text, c.created_at, c.reply_to_id
  from public.post_comments c
  join public.profiles p on p.id = c.user_id
  where c.post_id = p_post_id
  order by c.created_at asc;
end;
$$;

revoke all on function public.nacti_komentare_prispevku(uuid) from public, anon;
grant execute on function public.nacti_komentare_prispevku(uuid) to authenticated;
