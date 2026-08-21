import { test, expect } from '@playwright/test'
import { mockSupabase, vlozRelaci, cekejNaHub } from './helpers'

// ==========================================
// Auth gate — App.tsx: `dovnitr` rozhoduje o každé jedné trase kromě
// "/", a "/" samo se přesměruje na /hub, jakmile je dovnitr true (viz
// <Navigate to="/hub" replace /> u path="/"). Tenhle spec ověřuje
// přesně tenhle kontrakt, na kterém stojí každá jiná trasa v appce —
// nejvyšší návratnost ze všech e2e testů, protože jediná regrese tady
// by rozbila úplně celou appku, ne jednu funkci.
// ==========================================

test.describe('přihlašovací brána', () => {
  test('nepřihlášený návštěvník vidí přihlašovací obrazovku na /', async ({ page, context }) => {
    await mockSupabase(context, {})

    await page.goto('/')

    await expect(page.getByText('SchoolBuddy', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Vítej zpátky' })).toBeVisible()
    // Bez relace appka nesmí sama od sebe skočit dál.
    await expect(page).toHaveURL('/')
  })

  test('nepřihlášený návštěvník je z chráněné trasy vrácen na /', async ({ page, context }) => {
    await mockSupabase(context, {})

    await page.goto('/hub')

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Vítej zpátky' })).toBeVisible()
  })

  test('přihlášený návštěvník je z / rovnou přesměrován na /hub', async ({ page, context }) => {
    await vlozRelaci(context, '11111111-1111-1111-1111-111111111111')
    await mockSupabase(context, {})

    await page.goto('/')

    await cekejNaHub(page)
    await expect(page).toHaveURL(/\/hub$/)
  })

  test('admin panel odmítne přihlášeného uživatele bez oprávnění a vrátí ho do nastavení', async ({
    page,
    context,
  }) => {
    const userId = '11111111-1111-1111-1111-111111111111'
    await vlozRelaci(context, userId)
    await mockSupabase(
      context,
      { user_roles: [] }, // žádná role -> ani admin.panel, ani moderation.content
      { rpc: { jsem_admin: false, jsem_moderator: false } }
    )

    await page.goto('/admin')

    // Přihlášený, ale bez role -> /nastaveni, ne / (na rozdíl od
    // úplně nepřihlášeného návštěvníka výš).
    await expect(page).toHaveURL(/\/nastaveni$/)
  })
})
