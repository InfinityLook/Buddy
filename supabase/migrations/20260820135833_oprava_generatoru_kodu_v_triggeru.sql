-- Oprava: synchronizace padala na "permission denied for function
-- vygeneruj_pratelsky_kod".
--
-- Spouštěč nad profiles volá generátor kódu, ale běžel s právy toho, kdo
-- zápis provedl. Protože je volání generátoru zvenčí zakázané (a má být),
-- neprošel ani z vnitřku spouštěče — a padl s ním každý zápis profilu,
-- tedy celá synchronizace XP a odznaků.
--
-- Obě funkce proto běží jako vlastník. Zákaz volání zvenčí zůstává:
-- dostat se k nim jde jen přes spouštěč, ne přes /rest/v1/rpc.

create or replace function public.vygeneruj_pratelsky_kod()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  abeceda constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  kod text;
  i int;
begin
  loop
    kod := '';
    for i in 1..8 loop
      kod := kod || substr(abeceda, 1 + floor(random() * length(abeceda))::int, 1);
    end loop;

    exit when not exists (select 1 from public.profiles p where p.friend_code = kod);
  end loop;

  return kod;
end;
$$;

create or replace function public.doplnit_pratelsky_kod()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Jen když kód chybí. Při upsertu už existujícího profilu se sloupec
  -- v ON CONFLICT nepřepisuje, takže se o něj nikdo nepřipraví.
  if new.friend_code is null then
    new.friend_code := public.vygeneruj_pratelsky_kod();
  end if;
  return new;
end;
$$;

revoke execute on function public.vygeneruj_pratelsky_kod() from anon, authenticated, public;
revoke execute on function public.doplnit_pratelsky_kod() from anon, authenticated, public;