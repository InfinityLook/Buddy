-- ==========================================
-- Social Fáze 1: přečteno (read receipts), reakce na zprávy, odpověď
-- na konkrétní zprávu, ztlumení chatu. Čtyři nezávislé, malé kousky
-- v jedné migraci, protože jdou ven jako jeden balíček a nic z nich
-- na sobě datově nezávisí.
-- ==========================================

-- 1) Ztlumení chatu — vlastní řádek v chat_members, stejná "jen svoje"
-- UPDATE politika, jakou už last_read_at používá, žádná nová politika
-- není potřeba.
alter table public.chat_members add column if not exists muted boolean not null default false;

-- 2) Odpověď na zprávu — nullable self-reference, žádná nová politika
-- (INSERT politika messages se nemění, jen přibývá sloupec, který smí
-- poslat kdokoli, kdo smí zprávu vůbec napsat).
alter table public.messages add column if not exists reply_to_id uuid references public.messages(id) on delete set null;

-- 3) Reakce na zprávy — vlastní tabulka, ne sloupec na messages, protože
-- jedna zpráva může mít víc reakcí od víc lidí. chat_id je schválně
-- denormalizovaný (ne jen message_id) ze dvou důvodů: realtime filtr
-- "postgres_changes" umí filtrovat jen podle sloupce přímo na tabulce,
-- ne přes join, a RLS politiky níž jsou tak stejně jednoduché jako
-- u messages (jsem_clenem(chat_id)), ne vnořený EXISTS přes messages
-- při každém čtení.
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

-- chat_id se nikdy nebere od klienta — dopočítá ho tenhle trigger ze
-- zprávy, na kterou se reaguje, než RLS WITH CHECK níž zkontroluje
-- výslednou řádku. Nemusí být SECURITY DEFINER: čte messages jako
-- volající, a ten musí danou zprávu už vidět (jsem_clenem), aby na ni
-- vůbec mohl reagovat — stejné oprávnění, jaké by potřeboval i bez
-- triggeru.
create or replace function public.vynut_chat_id_reakce()
returns trigger
language plpgsql
as $$
begin
  select chat_id into new.chat_id from public.messages where id = new.message_id;
  if new.chat_id is null then
    raise exception 'Zpráva neexistuje nebo k ní nemáš přístup.';
  end if;
  return new;
end;
$$;

create trigger vynut_chat_id_pred_vlozenim
before insert on public.message_reactions
for each row execute function public.vynut_chat_id_reakce();

create policy "vidět reakce ve svých chatech" on public.message_reactions
for select using (
  jsem_clenem(chat_id) and not je_blokovan_se_mnou(user_id)
);

create policy "přidat reakci smí člen sám za sebe" on public.message_reactions
for insert with check (
  user_id = auth.uid()
  and jsem_clenem(chat_id)
  and je_skutecny_ucet()
  and not je_zabanovan_ze_social()
  and not je_blokovan_se_mnou((select sender_id from public.messages where id = message_reactions.message_id))
);

create policy "smazat vlastní reakci" on public.message_reactions
for delete using (user_id = auth.uid());

-- Přečteno (chat_members) a reakce potřebují realtime, ať se "Přečteno"
-- a nová reakce objeví bez refreshe, stejně jako zprávy a žádosti
-- o přátelství už mají.
alter publication supabase_realtime add table public.chat_members;
alter publication supabase_realtime add table public.message_reactions;
