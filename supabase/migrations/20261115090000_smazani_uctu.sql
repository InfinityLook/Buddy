-- Smazání účtu a souvisejících dat (Google Play: Account Deletion).
--
-- Smazání účtu = smazání řádku v auth.users (Admin API ze serverové funkce
-- api/delete-account.ts). Většina tabulek na něj už visí přes ON DELETE
-- CASCADE (profil, příspěvky, finance, plánovač, …) a smaže se sama.
-- Tahle migrace řeší jen to, co by se bez zásahu rozbilo:
--
--  A) chats.created_by / messages.sender_id měly CASCADE — smazání zakladatele
--     skupiny nebo odesílatele by smazalo celý chat a všechny zprávy i všem
--     ostatním. Teď SET NULL: konverzace zůstane druhým, jen bez autora
--     (obsah zpráv se před smazáním vyčistí funkcí smaz_osobni_data_uctu).
--  B) reports / audit_log / oznameni / social_bans jsou evidence moderace
--     a bezpečnosti (oprávněný zájem, právní nároky — čl. 17 odst. 3 GDPR).
--     Řádek zůstane, odkaz na smazaný účet se anonymizuje (SET NULL).
--  C) stories / story_views / support_* / client_errors měly NO ACTION, což
--     by smazání účtu úplně zablokovalo — teď CASCADE (jsou to osobní data).
--  D) tajne_* (odstraněný Secret Chat) — dva NO ACTION by smazání blokovaly.

-- ---------- A) konverzace přežijí odchod autora ----------
alter table public.chats alter column created_by drop not null;
alter table public.chats drop constraint chats_created_by_fkey;
alter table public.chats add constraint chats_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.messages alter column sender_id drop not null;
alter table public.messages drop constraint messages_sender_id_fkey;
alter table public.messages add constraint messages_sender_id_fkey
  foreign key (sender_id) references auth.users(id) on delete set null;

-- ---------- B) evidence moderace zůstává, anonymizovaně ----------
alter table public.reports alter column reporter_id drop not null;
alter table public.reports drop constraint reports_reporter_id_fkey;
alter table public.reports add constraint reports_reporter_id_fkey
  foreign key (reporter_id) references auth.users(id) on delete set null;

alter table public.reports alter column target_user_id drop not null;
alter table public.reports drop constraint reports_target_user_id_fkey;
alter table public.reports add constraint reports_target_user_id_fkey
  foreign key (target_user_id) references auth.users(id) on delete set null;

alter table public.audit_log drop constraint audit_log_admin_id_fkey;
alter table public.audit_log add constraint audit_log_admin_id_fkey
  foreign key (admin_id) references auth.users(id) on delete set null;

alter table public.oznameni alter column created_by drop not null;
alter table public.oznameni drop constraint oznameni_created_by_fkey;
alter table public.oznameni add constraint oznameni_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.social_bans alter column banned_by drop not null;
alter table public.social_bans drop constraint social_bans_banned_by_fkey;
alter table public.social_bans add constraint social_bans_banned_by_fkey
  foreign key (banned_by) references public.profiles(id) on delete set null;

-- ---------- C) osobní data se smažou spolu s účtem ----------
alter table public.stories drop constraint stories_user_id_fkey;
alter table public.stories add constraint stories_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.story_views drop constraint story_views_viewer_id_fkey;
alter table public.story_views add constraint story_views_viewer_id_fkey
  foreign key (viewer_id) references auth.users(id) on delete cascade;

alter table public.support_tickets drop constraint support_tickets_user_id_fkey;
alter table public.support_tickets add constraint support_tickets_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.support_zpravy drop constraint support_zpravy_autor_id_fkey;
alter table public.support_zpravy add constraint support_zpravy_autor_id_fkey
  foreign key (autor_id) references auth.users(id) on delete cascade;

alter table public.client_errors drop constraint client_errors_user_id_fkey;
alter table public.client_errors add constraint client_errors_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- ---------- D) zbytky Secret Chatu (tabulky se mažou zvlášť) ----------
do $$
begin
  if to_regclass('public.tajne_chaty') is not null then
    alter table public.tajne_chaty drop constraint tajne_chaty_zalozil_fkey;
    alter table public.tajne_chaty add constraint tajne_chaty_zalozil_fkey
      foreign key (zalozil) references auth.users(id) on delete cascade;
  end if;
  if to_regclass('public.tajne_zpravy') is not null then
    alter table public.tajne_zpravy drop constraint tajne_zpravy_odesilatel_fkey;
    alter table public.tajne_zpravy add constraint tajne_zpravy_odesilatel_fkey
      foreign key (odesilatel) references auth.users(id) on delete cascade;
  end if;
end $$;

-- ---------- Čištění obsahu, který FK samo nevyčistí ----------
-- SET NULL smaže jen odkaz na autora, ne text ani přílohu. Voláno ze
-- serverové funkce těsně před smazáním účtu (po smazání souborů).
create or replace function public.smaz_osobni_data_uctu(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages
     set body = '[Zpráva smazána]',
         media_path = null,
         media_type = null,
         edited_at = null,
         shared_post_id = null,
         story_id = null,
         deleted_at = coalesce(deleted_at, now())
   where sender_id = p_uid;

  update public.reports set note = null where reporter_id = p_uid;

  update public.audit_log set cil_id = null, detail = null where cil_id = p_uid;
end;
$$;

-- Značka "migrace je nasazená" — serverová funkce se jí před smazáním
-- zeptá, aby se při nasazení kódu dřív než schématu nikdy nesmazal chat
-- všem ostatním.
create or replace function public.ucet_smazani_pripraveno()
returns boolean
language sql
security definer
set search_path = public
as $$ select true $$;

-- Funkce berou libovolné uid, takže je nesmí volat nikdo kromě serveru.
revoke all on function public.smaz_osobni_data_uctu(uuid) from public, anon, authenticated;
revoke all on function public.ucet_smazani_pripraveno() from public, anon, authenticated;
grant execute on function public.smaz_osobni_data_uctu(uuid) to service_role;
grant execute on function public.ucet_smazani_pripraveno() to service_role;
