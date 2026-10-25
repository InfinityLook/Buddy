-- Odebrání výchozího EXECUTE grantu pro `anon` u starších funkcí, kde se
-- to při jejich vzniku nikdy neudělalo (novější funkce v tomhle session
-- už `revoke ... from anon` mají od začátku — viz CLAUDE.md, opakovaně
-- chycená třída chyby). Žádná z těchhle funkcí anonymnímu volajícímu nic
-- doopravdy nedávala (auth.uid() is null se všude vyhodnotí bezpečně),
-- jde jen o druhou vrstvu obrany — zavření /rest/v1/rpc/<funkce> cesty
-- úplně, ne jen spoléhání na to, že si funkce sama pohlídá auth.uid().
revoke execute on function public.admin_aktivita_podle_druhu() from anon;
revoke execute on function public.admin_nastav_roli(cil uuid, nova_role text, plati_do timestamp with time zone) from anon;
revoke execute on function public.admin_prehled() from anon;
revoke execute on function public.admin_rustovy_graf(dny integer) from anon;
revoke execute on function public.admin_seznam_uctu(hledat text, pocet integer, posun integer) from anon;
revoke execute on function public.admin_top_odznaky(pocet integer) from anon;
revoke execute on function public.hledej_podle_jmena(dotaz text) from anon;
revoke execute on function public.je_zabanovan_ze_social() from anon;
revoke execute on function public.jsem_admin() from anon;
revoke execute on function public.nacti_audit_log(pocet integer, posun integer) from anon;
revoke execute on function public.nacti_client_errors(pocet integer, posun integer) from anon;
revoke execute on function public.nacti_prispevky(cil uuid) from anon;
revoke execute on function public.nacti_social_bany() from anon;
revoke execute on function public.nastav_expiraci_tajneho_chatu(p_chat_id uuid, p_sekund integer) from anon;
revoke execute on function public.odebrat_ze_skupiny(p_chat_id uuid, p_cil uuid) from anon;
revoke execute on function public.oznac_ticket_po_zprave() from anon;
revoke execute on function public.posli_tajnou_zpravu(p_chat_id uuid, p_text text, p_iv text) from anon;
revoke execute on function public.potvrd_tajny_chat(p_chat_id uuid, p_prijmout boolean) from anon;
revoke execute on function public.smaz_expirovane_tajne_zpravy() from anon;
revoke execute on function public.vynut_chat_id_reakce() from anon;
revoke execute on function public.vyridit_tiket(tiket uuid, novy_stav text) from anon;
revoke execute on function public.zabanuj_ze_social(cil uuid, zabanovat boolean) from anon;
revoke execute on function public.zaloz_chat(ucastnici uuid[], je_skupina boolean, nazev text) from anon;
revoke execute on function public.zaloz_tajny_chat(cil uuid) from anon;
revoke execute on function public.zalozit_tiket(predmet text, zprava text) from anon;
revoke execute on function public.zapis_audit_log(p_admin_id uuid, p_akce text, p_cil_id uuid, p_detail jsonb) from anon;
revoke execute on function public.zaznamenej_odpoved_podpory() from anon;
revoke execute on function public.zaznamenej_oznameni() from anon;
revoke execute on function public.zaznamenej_vyrizeni_hlaseni() from anon;