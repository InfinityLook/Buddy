
-- Editace zprávy — appka dřív uměla zprávu jen smazat (měkce), nikdy
-- opravit. edited_at (na rozdíl od deleted_at) neschovává obsah, jen
-- značí, že aktuální text není ten původní — appka podle něj vedle
-- zprávy ukáže "(upraveno)", historii předchozích verzí neuchovává,
-- stejná jednoduchost jako u Discordu/WhatsAppu.
alter table public.messages add column edited_at timestamptz;

-- Politika "smazat vlastní zprávu" ve skutečnosti odjakživa dovolovala
-- upravit KTERÝKOLI sloupec vlastní zprávy (USING/WITH CHECK řeší jen
-- auth.uid() = sender_id, ne to, co konkrétně se mění) — mazání bylo
-- jen jediný způsob, jak se tahle politika kdy použila. Editace je
-- druhý, takže se přejmenovává na obecnější "upravit vlastní zprávu"
-- a WITH CHECK navíc žádá jsem_clenem(chat_id) — bez toho by
-- UPDATE mohl přesunout vlastní zprávu do libovolného chat_id, i
-- takového, jehož člen vůbec není, což předchozí verze politiky
-- nechytala (chat_id nikdy nikdo neměnil, ale politika to nezakazovala).
drop policy "smazat vlastní zprávu" on public.messages;

create policy "upravit vlastní zprávu"
  on public.messages for update
  to authenticated
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id and public.jsem_clenem(chat_id));
