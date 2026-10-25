-- ==========================================
-- Ikona skupinového chatu — u víc skupin najednou šlo splést, který je
-- který, protože SocialAvatar.tsx u skupiny vždycky kreslil jen "#".
--
-- Schválně emoji z pevné nabídky (text, krátký), ne nahraný obrázek —
-- appka nemá vůbec zapojené Supabase Storage a řešit upload/moderaci
-- obrázků kvůli jedné ikonce skupiny by bylo o řád víc práce, než co
-- si tahle drobnost zaslouží.
--
-- Žádná nová RLS politika netřeba: "přejmenovat skupinu smí její člen"
-- (UPDATE na chats, WITH CHECK jsem_clenem(id)) je sloupcově neutrální —
-- kdo smí měnit name, smí měnit i icon.
-- ==========================================

alter table public.chats
  add column icon text null;

alter table public.chats
  add constraint chats_icon_length check (icon is null or char_length(icon) <= 8);
