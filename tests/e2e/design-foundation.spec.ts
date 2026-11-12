import { expect, test } from '@playwright/test'
import { mockSupabase, vlozRelaci } from './helpers'

const THEMES = [
  ['Zlatý soumrak', 'zlaty-soumrak'],
  ['Neonová noc', 'neonova-noc'],
  ['Polární záře', 'polarni-zare'],
  ['Lesní klid', 'lesni-klid'],
  ['Čistý den', 'cisty-den'],
] as const

test.beforeEach(async ({ context }) => {
  await vlozRelaci(context, '11111111-1111-1111-1111-111111111111')
  await mockSupabase(context, {})
})

test('Rooms previews all five themes and applies only an explicit choice', async ({ page }) => {
  await page.goto('/rooms')
  const rooms = page.locator('.rooms-page')
  const themeMenu = page.getByLabel(/^Motiv Rooms/)
  const themeChoices = page.getByRole('group', { name: 'Náhled motivu' })

  await expect(rooms).toHaveAttribute('data-buddy-theme', 'zlaty-soumrak')
  const fullscreen = await page.getByRole('button', { name: 'Celá obrazovka', exact: true }).boundingBox()
  const bell = await rooms.getByRole('button', { name: /^Upozornění/ }).boundingBox()
  expect(fullscreen).not.toBeNull()
  expect(bell).not.toBeNull()
  expect(bell!.x + bell!.width).toBeLessThan(fullscreen!.x)
  await themeMenu.click()
  for (const [name, id] of THEMES) {
    await themeChoices.getByRole('button', { name, exact: true }).click()
    await expect(rooms).toHaveAttribute('data-buddy-theme', id)
    await expect(themeChoices.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true')
  }
  await page.getByRole('button', { name: 'Zrušit náhled' }).click()
  await expect(rooms).toHaveAttribute('data-buddy-theme', 'zlaty-soumrak')

  await themeMenu.click()
  await themeChoices.getByRole('button', { name: 'Lesní klid' }).click()
  await page.getByRole('button', { name: 'Vstoupit do místnosti' }).click()
  await expect(page).toHaveURL('/skola')
  await expect(page.locator('[data-buddy-surface="school-room"]')).toHaveAttribute('data-buddy-theme', 'zlaty-soumrak')

  await page.getByRole('button', { name: 'Zpět', exact: true }).click()
  await themeMenu.click()
  await themeChoices.getByRole('button', { name: 'Čistý den' }).click()
  await page.getByRole('button', { name: 'Použít v celé aplikaci' }).click()
  await expect(themeMenu).toBeFocused()
  await page.reload()
  await expect(rooms).toHaveAttribute('data-buddy-theme', 'cisty-den')
  await page.getByRole('button', { name: 'Zpět na Hub' }).click()
  await expect(page.locator('[data-buddy-surface="hub"]')).toHaveAttribute('data-buddy-theme', 'cisty-den')
  await expect(page.getByRole('navigation', { name: 'Hlavní navigace' }).getByRole('button', { name: 'Home' }))
    .toHaveAttribute('aria-current', 'page')
})

test('a miniapp override colors its shell and navigation while back returns to School Room', async ({ page }) => {
  await page.goto('/nastaveni')
  await page.getByRole('button', { name: /Vzhled a rámečky/ }).click()
  await page.getByRole('button', { name: /Motivy Buddyho/ }).click()
  await page.getByRole('combobox', { name: 'Kde změnit vzhled' }).selectOption('kalendar')
  await expect(page.getByLabel('Scénické pozadí z Hubu')).toHaveCount(0)
  await page.getByRole('radio', { name: /Polární záře/ }).check()
  await page.getByRole('button', { name: 'Použít motiv' }).click()
  await expect(page.locator('.buddy-appearance-picker').getByRole('status')).toContainText('Polární záře')

  await page.goto('/skola')
  await expect(page.locator('[data-buddy-surface="school-room"]')).toHaveAttribute('data-buddy-theme', 'zlaty-soumrak')
  await page.getByRole('button', { name: /Kalendář/ }).click()

  const shell = page.locator('.app-fullscreen-view')
  const nav = page.getByRole('navigation', { name: 'Hlavní navigace' })
  await expect(shell).toHaveAttribute('data-buddy-surface', 'kalendar')
  await expect(shell).toHaveAttribute('data-buddy-theme', 'polarni-zare')
  await expect(nav).toHaveCSS('background-color', 'rgb(10, 20, 39)')
  await page.getByRole('button', { name: 'Zpět', exact: true }).click()
  await expect(page).toHaveURL('/skola')
})

test('Pomodoro keeps its modal themed and scrollable in a short mobile viewport', async ({ page }) => {
  // Keep viewport resizing available after the application's first interaction.
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { value: false }))
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/rooms')
  await page.getByLabel(/^Motiv Rooms/).click()
  await page.getByRole('button', { name: 'Čistý den' }).click()
  await page.getByRole('button', { name: 'Použít v celé aplikaci' }).click()
  await expect(page.getByRole('button', { name: 'Vstoupit do místnosti' })).toBeInViewport()

  await page.goto('/apps?pomodoro=1')
  const workMode = page.getByRole('button', { name: 'Soustředění', exact: true })
  await expect(workMode).toBeVisible()
  expect(await workMode.evaluate(button => {
    const range = document.createRange()
    range.selectNodeContents(button)
    return range.getClientRects().length
  })).toBe(1)
  const settings = page.getByRole('button', { name: 'Nastavení časovače' })
  await settings.focus()
  await settings.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Nastavení Pomodora' })
  await expect(dialog).toHaveAttribute('data-buddy-theme', 'cisty-den')
  await expect(dialog).toHaveCSS('background-color', 'rgb(248, 247, 253)')
  await expect(dialog).toBeVisible()

  await page.setViewportSize({ width: 320, height: 380 })
  const content = dialog.locator('.buddy-ui-dialog-content')
  expect(await content.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
  await dialog.getByRole('button', { name: 'Uložit nastavení' }).scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('button', { name: 'Uložit nastavení' })).toBeInViewport()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(settings).toBeFocused()

  await page.getByRole('button', { name: 'Spustit', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pozastavit' })).toBeVisible()
  await page.getByRole('button', { name: 'Pozastavit' }).click()
})
