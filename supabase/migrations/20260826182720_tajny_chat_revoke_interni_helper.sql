-- Postgres granuje EXECUTE na nové funkce PUBLIC defaultně — zapomenutý
-- explicitní revoke tady znamenal, že ma_pravo_na_tajny_chat šla zavolat
-- rovnou přes /rest/v1/rpc/ma_pravo_na_tajny_chat i bez přihlášení,
-- přesně ten únik role kohokoli, kterému měl komentář u definice
-- zabránit. Potvrzeno get_advisors (0028/0029 anon/authenticated
-- security_definer_function_executable). Zbytek funkcí v této migraci
-- (zaloz_tajny_chat, potvrd_tajny_chat, posli_tajnou_zpravu,
-- smaz_expirovane_tajne_zpravy) zůstává grantnutý authenticated záměrně.
revoke execute on function public.ma_pravo_na_tajny_chat(uuid) from public, anon, authenticated;
