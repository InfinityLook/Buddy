-- Přátelský kód: jediný způsob, jak uživatele najít.
-- Vyhledávání podle jména schválně neexistuje — v aplikaci pro studenty
-- by znamenalo, že kdokoliv může procházet seznam dětí a psát jim.

alter table public.profiles
  add column if not exists friend_code text,
  add column if not exists avatar_url text;

-- Abeceda bez znaků, které se pletou při diktování do telefonu:
-- chybí I, O, 0 a 1.
create or replace function public.vygeneruj_pratelsky_kod()
returns text
language plpgsql
security invoker
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

    -- Kolize je při 32^8 možnostech nepravděpodobná, ale ne nemožná
    exit when not exists (select 1 from public.profiles p where p.friend_code = kod);
  end loop;

  return kod;
end;
$$;

-- Kód dostane každý profil při založení
create or replace function public.doplnit_pratelsky_kod()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.friend_code is null then
    new.friend_code := public.vygeneruj_pratelsky_kod();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_pratelsky_kod on public.profiles;
create trigger profiles_pratelsky_kod
  before insert on public.profiles
  for each row execute function public.doplnit_pratelsky_kod();

-- Doplnit kód profilům, které vznikly dřív
update public.profiles
set friend_code = public.vygeneruj_pratelsky_kod()
where friend_code is null;

alter table public.profiles
  alter column friend_code set not null;

create unique index if not exists profiles_friend_code_key
  on public.profiles (friend_code);

-- Funkce se nesmí dát volat přes REST; jsou jen pro vnitřní použití
revoke execute on function public.vygeneruj_pratelsky_kod() from anon, authenticated, public;
revoke execute on function public.doplnit_pratelsky_kod() from anon, authenticated, public;