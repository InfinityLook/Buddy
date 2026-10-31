## Jak pokračovat dál

Od teď platí: každá nová změna schématu (nová tabulka, nová/upravená
RLS politika, nová funkce) by měla vzniknout jako nový `.sql` soubor
tady — `<YYYYMMDDHHMMSS>_<popisný_název>.sql`, stejná konvence jako
existující soubory — a až pak se aplikovat na živý projekt, ne naopak.
Timestamp lze získat třeba `date +%Y%m%d%H%M%S` (UTC).

## Supabase Preview / GitHub Actions

Pro přímou synchronizaci mezi repozitářem a preview/produkcním Supabase
projektem se používá workflow `.github/workflows/supabase-preview.yml`.
Workflow:

- nastaví Supabase CLI,
- naváže projekt podle `SUPABASE_PROJECT_REF`,
- odešle lokální migrace pomocí `supabase db push`.

To je důležité zejména tehdy, když Supabase Preview hlásí chybu:
`Remote migration versions not found in local migrations directory.`
V takovém případě je potřeba mít v repozitáři přesnou historii migrací a
připojený správný projekt ref v GitHub secrets.

Požadované GitHub secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD` (pokud preview/projekt používá DB password v CLI flow)

Pokud je projekt rozbitý kvůli mismatchu migrací, běžný řešitelný postup je:

1. ověřit správný projekt ref,
2. `supabase link --project-ref <project_ref>`,
3. `supabase db pull` nebo `supabase db push`,
4. zkontrolovat, že `supabase/migrations/` odpovídá reálnému stavu serveru.
