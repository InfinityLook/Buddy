
-- nastav_stav_sledovani() je čistě spouštěcí funkce triggeru (pracuje
-- s NEW, dává smysl jen uvnitř before-insert), ne něco, co má někdo
-- volat přímo přes /rest/v1/rpc — get_advisors ji ale (jako každou
-- novou SECURITY DEFINER funkci v tomhle projektu, viz CLAUDE.md)
-- našel se stále platným výchozím EXECUTE pro `public`/`anon`. Přímé
-- zavolání by beztak selhalo (NEW mimo trigger neexistuje), ale
-- explicitní revoke je tu zvyk, ne výjimka.
revoke all on function public.nastav_stav_sledovani() from public;
revoke all on function public.nastav_stav_sledovani() from anon;
revoke all on function public.nastav_stav_sledovani() from authenticated;
