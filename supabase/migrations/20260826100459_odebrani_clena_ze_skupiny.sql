-- ==========================================
-- Odebrání člena ze skupinového chatu.
--
-- chat_members zatím umožňovalo jen "odejít sám za sebe" (DELETE, user_id
-- = auth.uid()). Odebrat NĚKOHO JINÉHO nešlo databázi vůbec — bez týhle
-- funkce by k tomu nebyla žádná politika, žádné RLS pravidlo neuspokojí
-- "smaž řádek někoho jiného", protože takové pravidlo je z principu
-- nebezpečné (kdokoli by mohl vyhodit kohokoli).
--
-- Řeší to stejný vzorec jako admin_nastav_roli(): SECURITY DEFINER funkce,
-- co si autorizaci ověří sama uvnitř — smí ji zavolat jen zakladatel
-- skupiny (chats.created_by), na skutečné skupině (ne 1:1 chat), a nejde
-- jí odebrat sám sebe (na to slouží existující "odejít z chatu").
-- ==========================================

create or replace function public.odebrat_ze_skupiny(p_chat_id uuid, p_cil uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_zakladatel uuid;
  v_je_skupina boolean;
begin
  select created_by, is_group into v_zakladatel, v_je_skupina
  from public.chats
  where id = p_chat_id;

  if v_zakladatel is null then
    raise exception 'Chat neexistuje.';
  end if;

  if not v_je_skupina then
    raise exception 'Odebrat člena jde jen ve skupinovém chatu.';
  end if;

  if auth.uid() is distinct from v_zakladatel then
    raise exception 'Jen zakladatel skupiny smí odebírat členy.';
  end if;

  if p_cil = v_zakladatel then
    raise exception 'Zakladatel nemůže odebrat sám sebe — použij opuštění chatu.';
  end if;

  delete from public.chat_members
  where chat_id = p_chat_id and user_id = p_cil;
end;
$$;

grant execute on function public.odebrat_ze_skupiny(uuid, uuid) to authenticated;
