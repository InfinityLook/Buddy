import { expect, test } from '@playwright/test'
import { mockSupabase, vlozRelaci } from './helpers'

test.beforeEach(async ({ context, page }) => {
  await vlozRelaci(context, '11111111-1111-1111-1111-111111111111')
  await mockSupabase(context, {})
  // Keep the viewport resizable after the app's first interaction.
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { value: false }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 568 })
})

test('Hub → Rooms → School Room → Planner → Pomodoro → the same task', async ({ page }) => {
  await page.goto('/hub')
  await expect(page.getByRole('navigation', { name: 'Hlavní navigace' })).toBeInViewport()
  await page.getByRole('button', { name: 'Otevřít menu' }).click()
  const roomLink = page.getByRole('button', { name: 'Rooms', exact: true })
  await expect(roomLink).toBeInViewport()
  await roomLink.click()
  await expect(page).toHaveURL('/rooms')
  await expect(page.locator('.rooms-hero')).toHaveAttribute('data-buddy-theme', 'zlaty-soumrak')
  await page.getByRole('button', { name: 'Vstoupit do místnosti' }).click()

  await expect(page.getByRole('heading', { name: 'School Room' })).toBeVisible()
  await page.getByRole('button', { name: 'Přidat widget' }).click()
  const picker = page.getByRole('dialog', { name: 'Vybrat widget' })
  await expect(picker).toHaveAttribute('data-buddy-theme', 'zlaty-soumrak')
  await picker.getByRole('button', { name: /Kalendář/ }).click()
  await expect(picker).toHaveCount(0)
  await page.getByRole('button', { name: /^Nástroje/ }).click()
  const tools = page.getByRole('dialog', { name: 'Nástroje' })
  await expect(tools).toHaveAttribute('data-buddy-theme', 'zlaty-soumrak')
  await tools.getByRole('button', { name: 'Zavřít panel' }).click()

  await page.getByRole('button', { name: /^Úkoly/ }).click()
  await expect(page.getByRole('heading', { name: 'Plánovač' })).toBeVisible()
  await page.getByRole('button', { name: 'Přidat úkol' }).click()
  const newTask = page.getByRole('dialog', { name: 'Nový úkol' })
  await newTask.getByLabel('Co potřebuješ udělat?').fill('Připravit prezentaci')
  await newTask.getByRole('button', { name: 'Přidat úkol' }).click()
  await expect(newTask).toHaveCount(0)

  await page.getByRole('button', { name: 'Připravit prezentaci', exact: true }).click()
  const detail = page.getByRole('dialog', { name: 'Detail úkolu' })
  await detail.getByRole('button', { name: 'Soustředit se' }).click()
  await expect(page.getByRole('heading', { name: 'Pomodoro' })).toBeVisible()
  await expect(page.getByText('Připravit prezentaci', { exact: true })).toBeVisible()
  const timer = page.locator('.pomo-timer')
  await expect(timer).toHaveAttribute('data-timer-state', 'running')
  await page.getByRole('button', { name: 'Pozastavit' }).click()
  await expect(timer).toHaveAttribute('data-timer-state', 'paused')

  await page.getByRole('button', { name: 'Zpět', exact: true }).click()
  await expect(detail.getByLabel('Co potřebuješ udělat?')).toHaveValue('Připravit prezentaci')
  await detail.getByRole('button', { name: 'Zavřít detail' }).click()
  await page.getByRole('button', { name: 'Zpět', exact: true }).click()
  await expect(page).toHaveURL('/skola')

  await page.getByRole('button', { name: /^Upozornění/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Upozornění' })).toBeVisible()
  await expect(page.locator('[data-buddy-surface="school-alerts"]')).toHaveAttribute('data-buddy-theme', 'zlaty-soumrak')
  await page.getByRole('button', { name: 'Zpět', exact: true }).click()
  await page.getByRole('button', { name: /^Statistiky/ }).click()
  await expect(page.getByRole('heading', { name: 'Statistiky', exact: true })).toBeVisible()
  await expect(page.locator('[data-buddy-surface="school-stats"]')).toHaveAttribute('data-buddy-theme', 'zlaty-soumrak')
})

test('Apps search and Quick Notes save on a short viewport in Čistý den', async ({ page }) => {
  await page.goto('/rooms')
  await page.getByLabel(/^Motiv Rooms/).click()
  await page.getByRole('button', { name: 'Čistý den' }).click()
  await page.getByRole('button', { name: 'Použít v celé aplikaci' }).click()
  await page.getByRole('button', { name: 'Zpět na Hub' }).click()
  await page.getByRole('button', { name: 'Otevřít menu' }).click()
  await page.getByRole('button', { name: 'Apps', exact: true }).click()
  await expect(page).toHaveURL('/apps')

  const search = page.getByRole('searchbox', { name: 'Hledat aplikaci' })
  await search.fill('neexistující')
  await expect(page.getByRole('status')).toContainText('nenašla žádná aplikace')
  await page.getByRole('button', { name: 'Vymazat hledání' }).click()
  await expect(search).toBeFocused()
  await expect(search).toHaveValue('')
  await search.fill('Quick Notes')
  await page.getByRole('button', { name: 'Quick Notes' }).click()
  await expect(page.locator('.qn-app')).toHaveAttribute('data-buddy-theme', 'cisty-den')
  await page.getByRole('button', { name: 'Nová poznámka' }).click()
  await page.getByRole('textbox', { name: 'Název poznámky' }).fill('Test rozložení')
  await page.getByRole('textbox', { name: 'Obsah poznámky' }).fill('Poznámka z mobilního editoru.')
  await page.setViewportSize({ width: 320, height: 380 })
  await expect(page.getByRole('toolbar', { name: 'Formátování poznámky' })).toBeInViewport()
  await expect(page.getByRole('status').filter({ hasText: 'Uloženo do zařízení' })).toBeVisible()
  await page.getByRole('button', { name: 'Zpět na poznámky' }).click()
  await page.getByRole('searchbox', { name: 'Hledat v poznámkách' }).fill('rozložení')
  await expect(page.getByRole('button', { name: /Test rozložení/ })).toBeVisible()
})

test('Rooms preview matches the opened room in the remaining themes', async ({ page }) => {
  await page.goto('/rooms')
  const rooms = page.locator('.rooms-page')
  const fitness = rooms.getByRole('button', { name: 'Fitness Room', exact: true })
  await fitness.click()

  for (const [theme, id] of [
    ['Neonová noc', 'neonova-noc'],
    ['Polární záře', 'polarni-zare'],
    ['Lesní klid', 'lesni-klid'],
  ]) {
    await page.getByLabel(/^Motiv Rooms/).click()
    await page.getByRole('button', { name: theme, exact: true }).click()
    await expect(rooms.locator('.rooms-hero')).toHaveAttribute('data-buddy-theme', id)
    await page.getByRole('button', { name: 'Použít v celé aplikaci' }).click()

    await page.getByRole('button', { name: 'Vstoupit do místnosti' }).click()
    await expect(page).toHaveURL('/fitness')
    await expect(page.locator('.fs-page[data-buddy-surface="fitness-room"]')).toHaveAttribute('data-buddy-theme', id)
    await page.getByRole('button', { name: 'Zpět', exact: true }).click()
    await expect(fitness).toHaveAttribute('aria-pressed', 'true')
  }
})
