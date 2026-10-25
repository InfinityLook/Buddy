-- Stejná chyba, jakou tenhle projekt už chytil několikrát u funkcí
-- (výchozí ALTER DEFAULT PRIVILEGES uděluje anon/public práva na
-- nově vzniklé tabulky) — RLS by anonymního volajícího stejně
-- odmítla (auth.uid() je NULL, žádný řádek nemá user_id NULL), ale
-- "belt and suspenders" disciplína tohohle projektu žádá explicitní
-- revoke, ne spoléhání na to, že RLS samotná stačí.
revoke all on public.finance_transactions from anon, public;
revoke all on public.finance_wallets from anon, public;
revoke all on public.finance_budgets from anon, public;
revoke all on public.finance_recurring from anon, public;
revoke all on public.finance_goals from anon, public;

grant select, insert, update, delete on public.finance_transactions to authenticated;
grant select, insert, update, delete on public.finance_wallets to authenticated;
grant select, insert, update, delete on public.finance_budgets to authenticated;
grant select, insert, update, delete on public.finance_recurring to authenticated;
grant select, insert, update, delete on public.finance_goals to authenticated;
