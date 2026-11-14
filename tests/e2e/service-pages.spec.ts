import { expect, test } from '@playwright/test'
import { mockSupabase, SUPABASE_URL, vlozRelaci } from './helpers'

const userId = '11111111-1111-1111-1111-111111111111'
const now = '2026-11-13T16:00:00Z'
const ticketId = '55555555-5555-5555-5555-555555555555'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { value: false }))
  await page.setViewportSize({ width: 320, height: 568 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('Přihlášení, registrace a obnova hesla mají samostatné formuláře', async ({ page, context }) => {
  await mockSupabase(context, {})
  await page.goto('/')
  await page.getByRole('button', { name: 'Zaregistruj se' }).click()
  await expect(page.getByRole('heading', { name: 'Založ si účet' })).toBeVisible()
  await expect(page.getByLabel('Heslo', { exact: true })).toHaveAttribute('autocomplete', 'new-password')
  await page.getByRole('button', { name: 'Přihlas se' }).click()
  const opener = page.getByRole('button', { name: 'Zapomenuté heslo?' })
  await opener.click()
  const dialog = page.getByRole('dialog', { name: 'Zapomenuté heslo' })
  await expect(dialog.getByRole('button', { name: 'Poslat odkaz' })).toBeDisabled()
  await dialog.getByLabel('E-mail pro obnovu').fill('student@example.test')
  await page.setViewportSize({ width: 320, height: 320 })
  const [request] = await Promise.all([
    page.waitForRequest(request => request.url().includes('/auth/v1/recover') && request.method() === 'POST'),
    dialog.getByRole('button', { name: 'Poslat odkaz' }).click(),
  ])
  expect(request.postDataJSON()).toMatchObject({ email: 'student@example.test' })
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  await expect(page.getByRole('status').filter({ hasText: 'Odkaz na změnu hesla je na cestě.' })).toBeVisible()
})

test('Nastavení udrží spodní navigaci a záloha vyžaduje potvrzení', async ({ page, context }) => {
  await vlozRelaci(context, userId)
  await mockSupabase(context, {})
  await page.goto('/nastaveni')
  const nav = page.getByRole('navigation', { name: 'Hlavní navigace' })
  await page.getByRole('button', { name: /Osobní údaje/ }).click()
  await expect(page.locator('.buddy-page')).toHaveAttribute('data-buddy-surface', 'settings-personal')
  await expect(nav).toBeInViewport()
  await page.getByRole('button', { name: 'Zpět do nastavení' }).click()
  await page.getByRole('button', { name: /Zálohování dat/ }).click()
  await page.locator('input[type=file]').setInputFiles({
    name: 'zkouska.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  })
  const confirmation = page.getByRole('dialog', { name: 'Obnovit ze souboru?' })
  await expect(confirmation.getByText(/zkouska\.json/)).toBeVisible()
  await expect(confirmation.getByRole('button', { name: 'Zrušit' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(confirmation).toBeHidden()
  await page.getByRole('button', { name: /První kroky/ }).click()
  await page.getByRole('link', { name: 'Otevřít všechny návody' }).click()
  await expect(page).toHaveURL('/navod')
  await page.getByRole('button', { name: /Hub — Tvůj domov/ }).click()
  await expect(page.getByRole('heading', { name: 'Hub — Tvůj domov', exact: true, level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Zpět na přehled nápovědy' }).click()
  await page.getByRole('button', { name: 'Zpět do nastavení' }).click()
  await expect(page).toHaveURL('/nastaveni')
})

test('Obchod ukáže cenu, zůstatek a dostupnost v motivu aplikace', async ({ page, context }) => {
  await vlozRelaci(context, userId)
  await mockSupabase(context, {})
  await page.goto('/rooms')
  await page.getByLabel(/^Motiv Rooms/).click()
  await page.getByRole('button', { name: 'Čistý den', exact: true }).click()
  await page.getByRole('button', { name: 'Použít v celé aplikaci' }).click()
  await page.goto('/obchod')
  await expect(page.locator('.buddy-page')).toHaveAttribute('data-buddy-theme', 'cisty-den')
  const item = page.getByRole('button', { name: 'Detail nabídky Tmavý neon' })
  await item.click()
  const detail = page.getByRole('dialog', { name: 'Tmavý neon' })
  await expect(detail).toHaveAttribute('data-buddy-theme', 'cisty-den')
  await expect(detail.getByText('Zůstatek')).toBeVisible()
  await expect(detail.getByRole('status')).toContainText(/Chybí ti/)
  await detail.getByRole('button', { name: 'Hotovo' }).click()
  await expect(item).toBeFocused()
  await page.getByRole('button', { name: /Startovní/ }).click()
  await expect(page.getByRole('dialog', { name: 'Startovní' }).getByRole('status')).toContainText('Platby se teprve připojují')
})

test('Podpora zobrazí chybu načtení, otevře tiket a udrží text při chybě odeslání', async ({ page, context }) => {
  await vlozRelaci(context, userId)
  await mockSupabase(context, {
    support_tickets: [{ id: ticketId, subject: 'Dotaz k Rooms', status: 'otevreny', created_at: now, updated_at: now, user_id: userId }],
    support_zpravy: [{ id: 'prvni', ticket_id: ticketId, autor_id: userId, je_od_podpory: false, text: 'Jak přidám widget?', created_at: now }],
  })
  await context.route(url => url.origin === SUPABASE_URL && url.pathname.endsWith('/support_tickets'),
    route => route.fulfill({ status: 400, json: { message: 'Testovací výpadek' } }), { times: 1 })
  await context.route(url => url.origin === SUPABASE_URL && url.pathname.endsWith('/support_zpravy'), route => (
    route.request().method() === 'POST'
      ? route.fulfill({ status: 400, json: { message: 'Odeslání selhalo' } })
      : route.fallback()
  ))
  await page.goto('/podpora')
  await expect(page.getByRole('alert')).toHaveText('Tikety se nepodařilo načíst.')
  await page.getByRole('button', { name: 'Zkusit znovu' }).click()
  await page.getByRole('button', { name: 'Nový tiket' }).click()
  const form = page.getByRole('dialog', { name: 'Nový tiket' })
  await form.getByLabel('Předmět').fill('Druhý dotaz')
  await expect(form.getByRole('button', { name: 'Odeslat', exact: true })).toBeDisabled()
  await form.getByRole('button', { name: 'Zrušit' }).click()
  await page.getByRole('button', { name: /Dotaz k Rooms/ }).click()
  await expect(page.getByRole('log', { name: 'Zprávy podpory' })).toContainText('Jak přidám widget?')
  const reply = page.getByRole('textbox', { name: 'Odpověď' })
  await reply.fill('Moje rozepsaná odpověď')
  await page.setViewportSize({ width: 320, height: 330 })
  await expect(reply).toBeInViewport()
  await page.getByRole('button', { name: 'Poslat', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Odeslání selhalo')
  await expect(reply).toHaveValue('Moje rozepsaná odpověď')
})

test('Administrace potvrzuje publikování a zachová vstup konzole na mobilu', async ({ page, context }) => {
  await vlozRelaci(context, userId)
  await mockSupabase(context, {
    user_roles: [{ user_id: userId, role: 'admin', valid_until: null, granted_at: now }],
    oznameni: [],
  })
  await page.goto('/nastaveni')
  await page.getByRole('button', { name: /Otevřít admin|Otevřít administraci/i }).click()
  await page.getByRole('button', { name: /Notifikace/ }).click()
  const message = page.getByRole('textbox', { name: 'Text oznámení' })
  await message.fill('P5 testovací oznámení')
  await page.getByRole('button', { name: /Odeslat všem/ }).click()
  const confirmation = page.getByRole('dialog', { name: 'Odeslat oznámení všem?' })
  await expect(confirmation.getByText('P5 testovací oznámení')).toBeVisible()
  await expect(confirmation.getByRole('button', { name: 'Zrušit' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(message).toHaveValue('P5 testovací oznámení')
  await page.getByRole('button', { name: 'Zpět do menu' }).click()
  await page.getByRole('button', { name: /Konzole/ }).click()
  const command = page.getByRole('textbox', { name: 'Příkaz' })
  await command.fill('help')
  await command.press('Enter')
  await expect(page.getByRole('log', { name: 'Výstup konzole' })).toContainText('> help')
})

test('Indikátor PWA reaguje na ztrátu a návrat připojení', async ({ page, context }) => {
  await mockSupabase(context, {})
  await page.goto('/')
  await context.setOffline(true)
  await expect(page.getByRole('status').filter({ hasText: /Jsi offline/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vítej zpátky' })).toBeInViewport()
  await context.setOffline(false)
  await expect(page.getByText(/Jsi offline/)).toHaveCount(0)
})

test('Pět motivů se přenese do Nastavení a krátká stránka drží navigaci na tabletu', async ({ page, context }) => {
  await vlozRelaci(context, userId)
  await mockSupabase(context, {})
  await page.setViewportSize({ width: 820, height: 520 })
  const themes = [
    ['Neonová noc', 'neonova-noc'],
    ['Polární záře', 'polarni-zare'],
    ['Lesní klid', 'lesni-klid'],
    ['Čistý den', 'cisty-den'],
    ['Zlatý soumrak', 'zlaty-soumrak'],
  ]
  for (const [name, id] of themes) {
    await page.goto('/rooms')
    await page.getByLabel(/^Motiv Rooms/).click()
    await page.getByRole('button', { name, exact: true }).click()
    await page.getByRole('button', { name: 'Použít v celé aplikaci' }).click()
    await page.goto('/nastaveni')
    const surface = page.locator('.buddy-page')
    await expect(surface).toHaveAttribute('data-buddy-theme', id)
    await expect(surface.getByRole('navigation', { name: 'Hlavní navigace' })).toBeInViewport()
    await expect(surface.getByRole('heading', { name: 'Nastavení', exact: true })).toBeInViewport()
    expect(await surface.getByRole('main').evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0)
  }
})
