
-- Kdo lajkl/okomentoval veřejný příspěvek nemusí být přítel příjemce
-- (nacti_prispevky pouští kohokoli přihlášeného k veřejnému účtu) —
-- plain profiles SELECT politika (přátelé/spoluúčastníci chatu) by tak
-- jméno/avatar autora aktivity běžně neuviděla. Stejný důvod jako
-- precti_verejny_profil(): SECURITY DEFINER funkce, filtrovaná uvnitř
-- na auth.uid() vlastní řádky, ne širší RLS politika na profiles.
create or replace function public.nacti_aktivitu_prispevku(p_limit int default 30)
returns table (
  id uuid,
  typ text,
  od_uzivatele_id uuid,
  od_display_name text,
  od_avatar_url text,
  post_id uuid,
  precteno boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Přístup jen pro přihlášené.' using errcode = '42501';
  end if;

  return query
  select a.id, a.typ, a.od_uzivatele_id, p.display_name, p.avatar_url, a.post_id, a.precteno, a.created_at
  from public.aktivita_prispevku a
  join public.profiles p on p.id = a.od_uzivatele_id
  where a.user_id = auth.uid()
  order by a.created_at desc
  limit least(p_limit, 100);
end;
$$;

revoke all on function public.nacti_aktivitu_prispevku(int) from public, anon;
grant execute on function public.nacti_aktivitu_prispevku(int) to authenticated;
