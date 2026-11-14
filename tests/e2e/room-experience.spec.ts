import { expect, test } from '@playwright/test'
import { mockSupabase, vlozRelaci } from './helpers'

test.beforeEach(async ({ context, page }) => {
  await vlozRelaci(context, '11111111-1111-1111-1111-111111111111')
  await mockSupabase(context, {})
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { value: false }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 568 })
})

const rooms = [
  ['Fitness Room', '/fitness', 'fitness-room'],
  ['Economy Room', '/economy', 'economy-room'],
  ['Growth Room', '/growth', 'growth-room'],
  ['Music Room', '/music', 'music-room'],
  ["Writer's Room", '/spisovatel', 'writer-room'],
] as const

test('five room covers, tools, persistent navigation and return selection', async ({ page }) => {
  await page.goto('/rooms')
  await page.getByLabel(/^Motiv Rooms/).click()
  await page.getByRole('button', { name: 'Čistý den' }).click()
  await page.getByRole('button', { name: 'Použít v celé aplikaci' }).click()

  for (const [title, path, surface] of rooms) {
    await page.getByRole('button', { name: title, exact: true }).click()
    const preview = page.locator('.rooms-art img')
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    const expectedSource = await preview.getAttribute('src')
    await page.getByRole('button', { name: 'Vstoupit do místnosti' }).click()
    await expect(page).toHaveURL(path)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeInViewport()
    const room = page.locator(`.fs-page[data-buddy-surface="${surface}"]`)
    await expect(room).toHaveAttribute('data-buddy-theme', 'cisty-den')
    const cover = room.locator('.fs-room-cover img')
    await expect(cover).toHaveAttribute('src', expectedSource!)
    await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    const nav = page.getByRole('navigation', { name: 'Hlavní navigace' })
    await expect(nav).toBeInViewport()
    await page.getByRole('button', { name: /^Nástroje/ }).click()
    await expect(nav).toBeInViewport()
    const tools = page.getByRole('dialog', { name: 'Nástroje' })
    await expect(tools).toHaveAttribute('data-buddy-theme', 'cisty-den')
    await page.keyboard.press('Escape')
    await expect(tools).toHaveCount(0)
    await page.getByRole('button', { name: 'Zpět', exact: true }).click()
    await expect(page).toHaveURL('/rooms')
    await expect(page.locator('.rooms-hero').getByRole('heading', { name: title })).toBeVisible()
  }
})

test('Fitness records hydration and opens warm-up and leaderboard panels', async ({ page }) => {
  await page.goto('/fitness')
  await page.getByRole('button', { name: '+ Sklenice' }).click()
  await expect(page.getByText(/1 z \d+ sklenic?e? dnes/)).toBeVisible()
  await page.getByRole('button', { name: /Rozcvička \/ strečink/ }).click()
  const warmup = page.getByRole('dialog', { name: 'Rozcvička, strečink a jóga' })
  await expect(warmup).toBeVisible()
  await warmup.locator('.rc-program-radek').first().click()
  await expect(warmup.getByRole('timer', { name: 'Zbývající čas' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /Otevřít žebříček/ }).click()
  await expect(page.getByRole('dialog', { name: 'Žebříček fitness XP' })).toBeVisible()
})

test('Growth opens the new goal form and the exact saved goal', async ({ page }) => {
  await page.goto('/growth')
  await page.getByRole('button', { name: 'Nový cíl' }).click()
  const form = page.getByRole('dialog', { name: 'Nový cíl' })
  await form.getByLabel('Název').fill('Naučit se 10 akordů')
  await form.getByRole('button', { name: 'Uložit cíl', exact: true }).click()
  await expect(form).toHaveCount(0)
  await page.getByRole('button', { name: 'Zpět', exact: true }).click()
  await page.getByRole('button', { name: /Naučit se 10 akordů/ }).click()
  await expect(page.getByRole('dialog', { name: 'Naučit se 10 akordů' })).toBeVisible()
})

test('Music opens its own notification panel, studio tabs and Files', async ({ page }) => {
  await page.goto('/music')
  await page.getByRole('button', { name: /^Upozornění/ }).click()
  const notifications = page.getByRole('dialog', { name: 'Upozornění' })
  await expect(notifications).toBeInViewport()
  await notifications.getByRole('button', { name: 'Zavřít' }).click()

  for (const [shortcut, tab] of [['Nahrát zvuk', 'Nahrávání'], ['Nová skladba', 'Skladby']]) {
    await page.getByRole('button', { name: shortcut, exact: true }).click()
    await expect(page.getByRole('button', { name: tab, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Zpět', exact: true }).click()
    await expect(page).toHaveURL('/music')
  }

  await page.getByRole('button', { name: /^Soubory/ }).click()
  await expect(page.getByRole('heading', { name: 'File Manager', exact: true, level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Zpět', exact: true }).click()
  await expect(page).toHaveURL('/music')
})

test('Economy reaches Finance and Writer displays a newly created project', async ({ page }) => {
  await page.goto('/economy')
  await expect(page.getByText('Zůstatek', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Otevřít Finance' }).click()
  await expect(page.getByRole('heading', { name: 'Finance', exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Zpět', exact: true }).click()
  await expect(page).toHaveURL('/economy')

  await page.goto('/spisovatel')
  await page.getByRole('button', { name: /Nová kniha/ }).click()
  await page.getByPlaceholder('Název nové knihy').fill('První kapitola Buddy')
  await page.getByRole('button', { name: 'Založit', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Název knihy' })).toHaveValue('První kapitola Buddy')
  await page.getByRole('button', { name: 'Zpět', exact: true }).click()
  await expect(page).toHaveURL('/spisovatel')
  await expect(page.getByText('První kapitola Buddy', { exact: true })).toBeVisible()
})
