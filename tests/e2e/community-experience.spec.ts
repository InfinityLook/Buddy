import { expect, test } from '@playwright/test'
import { mockSupabase, vlozRelaci } from './helpers'

const me = '11111111-1111-1111-1111-111111111111'
const other = '22222222-2222-2222-2222-222222222222'
const chatId = '33333333-3333-3333-3333-333333333333'
const directId = '44444444-4444-4444-4444-444444444444'
const member = { id: other, display_name: 'Klára Buddy', avatar_url: null }
const post = {
  id: 'p4-post', user_id: other, media_path: 'p4/test.png', media_type: 'image',
  caption: 'P4 testovací příspěvek', created_at: '2026-10-15T10:00:00Z',
}
const image = {
  name: 'obrazek.png',
  mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
}

test.beforeEach(async ({ context, page }) => {
  await vlozRelaci(context, me)
  await mockSupabase(context, {
    profiles: [member],
    chats: [
      { id: chatId, is_group: true, name: 'Studijní skupina', created_by: me },
      { id: directId, is_group: false, name: null, created_by: me },
    ],
    chat_members: [chatId, directId].flatMap(chat_id => [me, other].map(user_id => ({
      chat_id, user_id, last_read_at: '2026-10-01T10:00:00Z', muted: false, stav: 'prijato',
    }))),
    messages: [{
      id: 'p4-message', chat_id: chatId, body: 'Ahoj ze skupiny', sender_id: other,
      created_at: '2026-10-15T10:00:00Z',
    }],
  }, {
    rpc: {
      nacti_feed: (body: unknown) => (body as { kurzor?: string }).kurzor ? [] : [post],
      nacti_doporuceny_feed: [],
      hledej_podle_jmena: [member],
      zaloz_chat: directId,
      precti_verejny_profil: [{ ...member, xp: 25, level: 1, streak_days: 0, role: 'user', soukromy: false }],
    },
  })
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { value: false }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 568 })
})

test('Feed a Komunita sdílejí karty, motiv a pořadí dialogů', async ({ page }) => {
  await page.goto('/rooms')
  await page.getByLabel(/^Motiv Rooms/).click()
  await page.getByRole('button', { name: 'Čistý den', exact: true }).click()
  await page.getByRole('button', { name: 'Použít v celé aplikaci' }).click()

  for (const route of ['/feed', '/social?zalozka=domu']) {
    await page.goto(route)
    const community = page.locator('.community-page')
    await expect(community).toHaveAttribute('data-buddy-theme', 'cisty-den')
    await expect(community.locator('> .buddy-theme-backdrop img')).toHaveAttribute('src', /cisty-den/)
    const card = community.locator('.social-feed-post[data-post-id="p4-post"]')
    await expect(card).toHaveCount(1)
    await card.getByRole('button', { name: /Komentáře/ }).click()
    const detail = page.getByRole('dialog', { name: 'Příspěvek', exact: true })
    await expect(detail).toBeVisible()
    await detail.getByRole('button', { name: 'Nahlásit příspěvek' }).click()
    const report = page.getByRole('dialog', { name: 'Nahlásit', exact: true })
    await expect(report.getByRole('group', { name: 'Důvod nahlášení' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(report).toBeHidden()
    await expect(detail).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(detail).toBeHidden()
    const recommended = page.getByRole('button', { name: 'Pro tebe', exact: true })
    await recommended.click()
    await expect(recommended).toHaveAttribute('aria-pressed', 'true')
    await expect(card).toHaveCount(0)
  }
})

test('Feed otevře náhled souboru pro příspěvek i story', async ({ page }) => {
  await page.goto('/feed')
  await expect(page.getByRole('button', { name: 'Přidat příspěvek' })).toBeVisible()
  await page.locator('input[type=file][multiple]').setInputFiles(image)
  const postDialog = page.getByRole('dialog', { name: 'Nový příspěvek' })
  await expect(postDialog.getByAltText('Náhled příspěvku')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(image)
  const story = page.getByRole('dialog', { name: 'Nová story' })
  await expect(story.getByAltText('Náhled story')).toBeVisible()
  await expect(story.getByRole('button', { name: 'Sdílet story' })).toBeEnabled()
})

test('Napsat ve veřejném profilu z Feedu otevře správný rozhovor', async ({ page }) => {
  await page.goto('/feed')
  const post = page.locator('.social-feed-post[data-post-id="p4-post"]')
  await post.getByRole('button', { name: 'Klára Buddy' }).click()
  await page.getByRole('dialog', { name: 'Veřejný profil' }).getByRole('button', { name: 'Napsat' }).click()
  await expect(page.getByRole('button', { name: 'Zpět na chaty' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Klára Buddy' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Zpráva', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/social\?zalozka=chaty$/)
})

test('Skupinový chat udrží rozepsanou zprávu i na malé výšce', async ({ page }) => {
  await page.goto('/social?zalozka=chaty')
  const group = page.getByRole('button', { name: /Studijní skupina/ })
  await expect(group.getByLabel('Nepřečtené zprávy: 1')).toBeVisible()
  await group.click()
  await expect(page.getByRole('region', { name: 'Zprávy' }).getByText('Ahoj ze skupiny')).toBeVisible()
  const message = page.getByRole('textbox', { name: 'Zpráva', exact: true })
  await message.fill('Rozepsaná zpráva')
  await page.setViewportSize({ width: 320, height: 330 })
  await expect(message).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Odeslat', exact: true })).toBeInViewport()
  await page.getByRole('button', { name: 'Spravovat skupinu' }).click()
  await expect(page.getByRole('dialog', { name: 'Spravovat skupinu' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(message).toHaveValue('Rozepsaná zpráva')
  await page.getByRole('button', { name: 'Zpět na chaty' }).click()
  await expect(group).toBeVisible()
})

test('Vyhledávání, profil a odznaky mají samostatné přístupné dialogy', async ({ page }) => {
  await page.goto('/social?zalozka=vyhledavac')
  const search = page.getByRole('searchbox', { name: 'Jméno nebo hashtag' })
  await search.fill('Klára')
  await search.press('Enter')
  await page.getByText('Klára Buddy', { exact: true }).click()
  const publicProfile = page.getByRole('dialog', { name: 'Veřejný profil' })
  await publicProfile.getByRole('button', { name: 'Zablokovat', exact: true }).click()
  const confirmBlock = page.getByRole('dialog', { name: 'Zablokovat účet?' })
  await expect(confirmBlock).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(confirmBlock).toBeHidden()
  await expect(publicProfile).toBeVisible()

  await page.goto('/profil')
  await page.getByRole('button', { name: /^Upozornění/ }).click()
  await expect(page.getByRole('dialog', { name: 'Upozornění' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Moje odznaky' }).click()
  await page.getByRole('button', { name: /První krok.*Zamčeno/ }).click()
  const badge = page.getByRole('dialog', { name: 'První krok' })
  await expect(badge.getByText('Odznak je zatím zamčený.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(badge).toBeHidden()
})

test('Rychlá akce Buddyho připraví editovatelnou zprávu a Escape vrátí fokus', async ({ page }) => {
  await page.goto('/hub')
  await page.getByRole('button', { name: 'Otevřít menu' }).click()
  await page.getByRole('button', { name: 'AI', exact: true }).click()
  const chat = page.locator('.buddy3d-tools').getByRole('button', { name: 'Chat', exact: true })
  await chat.click()
  const dialog = page.getByRole('dialog', { name: 'Rozhovor s Buddym' })
  await dialog.getByRole('button', { name: 'Poznámka' }).click()
  const message = dialog.getByRole('textbox', { name: 'Zpráva pro Buddyho' })
  await expect(message).toHaveValue('Vytvoř poznámku')
  await page.setViewportSize({ width: 320, height: 335 })
  await expect(message).toBeInViewport()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(chat).toBeFocused()
})
