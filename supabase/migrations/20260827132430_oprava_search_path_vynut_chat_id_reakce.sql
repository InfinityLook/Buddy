-- Linter (function_search_path_mutable) chytil, že vynut_chat_id_reakce
-- nemá pevný search_path — bez něj by šlo funkci teoreticky obelstít
-- podstrčeným schématem, i když uvnitř používá plně kvalifikované
-- public.messages. Pevný search_path je levná obrana navíc.
create or replace function public.vynut_chat_id_reakce()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select chat_id into new.chat_id from public.messages where id = new.message_id;
  if new.chat_id is null then
    raise exception 'Zpráva neexistuje nebo k ní nemáš přístup.';
  end if;
  return new;
end;
$$;
