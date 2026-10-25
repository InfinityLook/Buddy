
-- prijmi_pozadavek_po_zprave() je čistě spouštěcí funkce triggeru (NEW
-- dává smysl jen uvnitř before/after-insert kontextu) — stejný zlozvyk
-- jako nastav_stav_sledovani() dřív v týhle session, get_advisors ho
-- zase našel jako anon-spustitelný přes /rest/v1/rpc. Revoke je tu
-- zvyk po každé nové SECURITY DEFINER funkci, ne výjimka pro tuhle.
revoke all on function public.prijmi_pozadavek_po_zprave() from public;
revoke all on function public.prijmi_pozadavek_po_zprave() from anon;
revoke all on function public.prijmi_pozadavek_po_zprave() from authenticated;
