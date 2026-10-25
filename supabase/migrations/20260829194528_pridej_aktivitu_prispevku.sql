
-- Aktivita k vlastním příspěvkům (lajk/komentář) — malá vlastní tabulka,
-- ne rozšíření oznameni (to je vyhrazené pro adminovský broadcast s
-- INSERT politikou gatovanou jsem_admin(), sem píše kdokoli přihlášený
-- přes trigger, ne admin). Řádek vzniká výhradně z triggeru na
-- post_likes/post_comments (SECURITY DEFINER), klient nemá žádnou
-- INSERT politiku vůbec.
create table public.aktivita_prispevku (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  typ text not null check (typ in ('lajk', 'komentar')),
  od_uzivatele_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  precteno boolean not null default false,
  created_at timestamptz not null default now()
);

create index aktivita_prispevku_user_id_idx on public.aktivita_prispevku (user_id, created_at desc);

alter table public.aktivita_prispevku enable row level security;

create policy "číst vlastní aktivitu" on public.aktivita_prispevku
  for select using (user_id = auth.uid());

create policy "označit vlastní aktivitu přečtenou" on public.aktivita_prispevku
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "smazat vlastní aktivitu" on public.aktivita_prispevku
  for delete using (user_id = auth.uid());

-- Server počítá, klient jen žádá (stejný tvar jako vynut_chat_id_reakce/
-- oznac_ticket_po_zprave) — příjemce se dopočítá z autor_prispevku(),
-- ne z toho, co by případně poslal klient. Autor svého vlastního
-- lajku/komentáře k sobě žádnou aktivitu nedostane.
create or replace function public.zaznamenej_aktivitu_lajk()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_autor uuid;
begin
  select public.autor_prispevku(new.post_id) into v_autor;
  if v_autor is not null and v_autor <> new.user_id then
    insert into public.aktivita_prispevku (user_id, typ, od_uzivatele_id, post_id)
    values (v_autor, 'lajk', new.user_id, new.post_id);
  end if;
  return new;
end;
$$;

create trigger po_lajku
  after insert on public.post_likes
  for each row execute function public.zaznamenej_aktivitu_lajk();

create or replace function public.zaznamenej_aktivitu_komentar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_autor uuid;
begin
  select public.autor_prispevku(new.post_id) into v_autor;
  if v_autor is not null and v_autor <> new.user_id then
    insert into public.aktivita_prispevku (user_id, typ, od_uzivatele_id, post_id)
    values (v_autor, 'komentar', new.user_id, new.post_id);
  end if;
  return new;
end;
$$;

create trigger po_komentari
  after insert on public.post_comments
  for each row execute function public.zaznamenej_aktivitu_komentar();

-- Stejná chyba, kterou tenhle soubor už chytil pětkrát/šestkrát dřív
-- (výchozí PUBLIC/anon EXECUTE grant) — trigger funkce nejsou určené
-- k přímému volání přes RPC, ale default grant to nerozlišuje.
revoke all on function public.zaznamenej_aktivitu_lajk() from public, anon, authenticated;
revoke all on function public.zaznamenej_aktivitu_komentar() from public, anon, authenticated;

alter publication supabase_realtime add table public.aktivita_prispevku;
