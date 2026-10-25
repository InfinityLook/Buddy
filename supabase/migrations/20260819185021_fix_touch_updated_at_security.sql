-- Trigger funkce nepotrebuje SECURITY DEFINER: bezi v ramci prikazu,
-- ktery uz prosel pravidly RLS. Jako SECURITY DEFINER byla navic
-- volatelna primo pres /rest/v1/rpc kymkoliv.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger si funkci zavola sam, pres API ji volat nikdo nepotrebuje.
revoke execute on function public.touch_updated_at() from anon, authenticated, public;