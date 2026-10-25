-- Pokračování předchozí migrace: revoke ... from anon samo o sobě
-- nestačilo u funkcí, které EXECUTE nikdy neměly grantnutý přímo `anon`
-- roli, ale jen implicitně přes `PUBLIC` (výchozí chování Postgresu při
-- CREATE FUNCTION) — `anon`, jako každá role, `PUBLIC` grant dědí
-- automaticky, takže samotný "revoke ... from anon" u nich nic
-- nezavřel. Ověřeno přímo přes proacl: tyhle funkce měly `{=X/postgres,
-- authenticated=X/postgres, ...}` — prázdné jméno role před "=" je
-- právě PUBLIC. `authenticated` má u všech vlastní, samostatný grant
-- (`authenticated=X/postgres`), takže revoke z PUBLIC jeho přístup
-- nijak neomezí — nic dalšího není potřeba dograntovat.
revoke execute on function public.admin_aktivita_podle_druhu() from public;
revoke execute on function public.admin_nastav_roli(cil uuid, nova_role text, plati_do timestamp with time zone) from public;
revoke execute on function public.admin_rustovy_graf(dny integer) from public;
revoke execute on function public.admin_seznam_uctu(hledat text, pocet integer, posun integer) from public;
revoke execute on function public.admin_top_odznaky(pocet integer) from public;
revoke execute on function public.hledej_podle_jmena(dotaz text) from public;
revoke execute on function public.nacti_audit_log(pocet integer, posun integer) from public;
revoke execute on function public.nacti_client_errors(pocet integer, posun integer) from public;
revoke execute on function public.nastav_expiraci_tajneho_chatu(p_chat_id uuid, p_sekund integer) from public;
revoke execute on function public.odebrat_ze_skupiny(p_chat_id uuid, p_cil uuid) from public;
revoke execute on function public.oznac_ticket_po_zprave() from public;
revoke execute on function public.posli_tajnou_zpravu(p_chat_id uuid, p_text text, p_iv text) from public;
revoke execute on function public.potvrd_tajny_chat(p_chat_id uuid, p_prijmout boolean) from public;
revoke execute on function public.smaz_expirovane_tajne_zpravy() from public;
revoke execute on function public.vynut_chat_id_reakce() from public;
revoke execute on function public.vyridit_tiket(tiket uuid, novy_stav text) from public;
revoke execute on function public.zaloz_tajny_chat(cil uuid) from public;
revoke execute on function public.zalozit_tiket(predmet text, zprava text) from public;
revoke execute on function public.zapis_audit_log(p_admin_id uuid, p_akce text, p_cil_id uuid, p_detail jsonb) from public;
revoke execute on function public.zaznamenej_odpoved_podpory() from public;
revoke execute on function public.zaznamenej_oznameni() from public;
revoke execute on function public.zaznamenej_vyrizeni_hlaseni() from public;