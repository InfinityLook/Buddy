import { expect, test, type Page } from '@playwright/test'
import { mockSupabase, vlozRelaci } from './helpers'

const apps = [
  ['kalendar', 'Kalendář', '/skola', /^Kalendář/, false],
  ['rozvrh', 'Rozvrh', '/skola', /^Rozvrh/, false],
  ['znamky', 'Známky', '/skola', /^Známky/, false],
  ['file-manager', 'File Manager', '/music', /^Soubory/, false],
  ['flashcards', 'Flashcards', '/skola', /^Flashcards/, true],
  ['exam-prep', 'Maturitní centrum', '/skola', /^Maturitní centrum/, true],
  ['math-solver', 'Math Solver', '/skola', /^Math Solver/, true],
  ['citace', 'Citace', '/skola', /^Citace/, true],
  ['goal-tracker', 'Moje cíle', '/growth', /^Otevřít Goal Tracker/, false],
  ['finance', 'Finance', '/economy', /^Finance/, true],
  ['sporici-simulator', 'Spořicí simulátor', '/economy', /^Spořicí simulátor/, true],
  ['uver-kalkulacka', 'Splátkový kalkulátor', '/economy', /^Splátkový kalkulátor/, true],
  ['posilovna', 'Posilovna', '/fitness', /^Posilovna/, true],
  ['behani', 'Běhání', '/fitness', /^Běhání/, true],
  ['form-check', 'Form Check', '/fitness', /^Form Check/, true],
  ['document-editor', 'Textový editor', '/skola', /^Textový editor/, true],
  ['mind-map', 'Mind Map', '/skola', /^Mind Map/, true],
  ['book-writer', 'Kniha', '/spisovatel', /^Kniha/, true],
  ['screenplay-writer', 'Scénář', '/spisovatel', /^Scénář/, true],
  ['comic-writer', 'Komiks', '/spisovatel', /^Komiks/, true],
  ['music-studio', 'Music Studio', '/music', /^Music Studio/, true],
] as const

test.beforeEach(async ({ context, page }) => {
  await vlozRelaci(context, '11111111-1111-1111-1111-111111111111')
  await mockSupabase(context, {})
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { value: false }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 568 })
})

async function openApp(page: Page, id: typeof apps[number][0]) {
  const [, title, room, shortcut, inTools] = apps.find(entry => entry[0] === id)!
  await page.goto(room)
  if (inTools) {
    await page.getByRole('button', { name: /^Nástroje/ }).click()
    await page.getByRole('dialog', { name: 'Nástroje' }).getByRole('button', { name: shortcut }).click()
  } else {
    await page.getByRole('button', { name: shortcut }).first().click()
  }
  await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible()
  await expect(page.locator('.app-fullscreen-content .buddy-miniapp').first()).toBeVisible()
  if (id === 'behani') {
    await page.getByRole('dialog', { name: 'Přístup k poloze' }).getByRole('button', { name: 'Teď ne' }).click()
  }
}

test('all 21 miniapps use the theme, fit a 320 px shell and return to their room', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/rooms')
  await page.getByLabel(/^Motiv Rooms/).click()
  await page.getByRole('button', { name: 'Čistý den', exact: true }).click()
  await page.getByRole('button', { name: 'Použít v celé aplikaci' }).click()
  for (const [id, , room] of apps) {
    await test.step(id, async () => {
      await openApp(page, id)
      const shell = page.locator('.app-fullscreen-view')
      await expect(shell).toHaveAttribute('data-buddy-surface', id)
      await expect(shell).toHaveAttribute('data-buddy-theme', 'cisty-den')
      await expect(page.getByRole('navigation', { name: 'Hlavní navigace' })).toBeInViewport()
      const overflow = await shell.locator('.app-fullscreen-content').evaluate(el => el.scrollWidth - el.clientWidth)
      expect(overflow).toBeLessThanOrEqual(1)
      await page.getByRole('button', { name: 'Zpět', exact: true }).click()
      await expect(page).toHaveURL(room)
    })
  }
})

test('calendar details and timetable editor preserve saved data', async ({ page }) => {
  await openApp(page, 'kalendar')
  await page.getByRole('button', { name: '+ Událost' }).click()
  const event = page.getByRole('dialog', { name: 'Nová událost' })
  await event.getByLabel('Název').fill('P3 konzultace')
  await event.getByRole('button', { name: 'Uložit událost' }).click()
  await page.getByRole('button', { name: 'Možnosti: P3 konzultace' }).click()
  await page.getByRole('dialog', { name: 'P3 konzultace' }).getByRole('button', { name: 'Upravit' }).click()
  await expect(page.getByRole('dialog', { name: 'Upravit událost' }).getByLabel('Název')).toHaveValue('P3 konzultace')

  await openApp(page, 'rozvrh')
  await page.getByRole('button', { name: '+ Přidat hodinu' }).click()
  const lesson = page.getByRole('dialog', { name: 'Přidat hodinu' })
  await lesson.getByRole('combobox', { name: 'Den', exact: true }).selectOption('1')
  await lesson.getByRole('textbox', { name: 'Předmět' }).fill('P3 Matematika')
  await lesson.getByRole('button', { name: 'Přidat', exact: true }).click()
  await expect(page.getByText('P3 Matematika', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Den v týdnu' }).selectOption('2')
  await expect(page.getByText('Pro tento den nemáš žádnou hodinu.')).toBeVisible()
  await page.getByRole('combobox', { name: 'Den v týdnu' }).selectOption('1')
  await page.getByRole('button', { name: 'Upravit P3 Matematika' }).click()
  await expect(page.getByRole('dialog', { name: 'Upravit hodinu' })).toBeVisible()
})

test('file upload, details, rename and themed deletion confirmation', async ({ page }) => {
  await openApp(page, 'file-manager')
  await page.locator('input[type=file]').setInputFiles({
    name: 'p3-test.txt', mimeType: 'text/plain', buffer: Buffer.from('Buddy P3'),
  })
  await page.getByRole('button', { name: 'p3-test.txt', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'p3-test.txt' }).getByText('Velikost')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Přejmenovat p3-test.txt' }).click()
  const rename = page.getByRole('dialog', { name: 'Název a složka' })
  await rename.getByLabel('Název souboru').fill('p3-prejmenovany.txt')
  await rename.getByLabel('Složka', { exact: true }).fill('P3 materiály')
  await rename.getByRole('button', { name: 'Uložit' }).click()
  const remove = page.getByRole('button', { name: 'Smazat p3-prejmenovany.txt' })
  await remove.click()
  const confirm = page.getByRole('dialog', { name: 'Smazat soubor?' })
  await expect(confirm.getByRole('button', { name: 'Zrušit' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(remove).toBeFocused()
  await remove.click()
  await confirm.getByRole('button', { name: 'Smazat soubor', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Soubor smazán.')
  await expect(page.getByText('Zatím tu nemáš žádné soubory.')).toBeVisible()
})

test('flashcards, equation steps and citation preview', async ({ page }) => {
  await openApp(page, 'flashcards')
  await page.getByRole('button', { name: '+ Přidat', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Nová kartička' })
  await editor.getByLabel('Otázka').fill('Kolik je 2 + 2?')
  await editor.getByLabel('Odpověď').fill('Čtyři')
  await editor.getByRole('button', { name: 'Uložit', exact: true }).click()
  await page.getByRole('button', { name: 'Otočit', exact: true }).click()
  await expect(page.getByText('Čtyři', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Umím ✓', exact: true }).click()

  await openApp(page, 'math-solver')
  await page.getByRole('textbox', { name: 'Výraz nebo rovnice' }).fill('2x+1=9')
  await page.getByRole('button', { name: 'Vyřešit rovnici' }).click()
  await expect(page.getByRole('status', { name: 'Výsledek' })).toContainText('4')
  await expect(page.getByText('Postup:')).toBeVisible()

  await openApp(page, 'citace')
  await page.getByRole('textbox', { name: 'Název zdroje' }).fill('Buddy P3 kniha')
  await expect(page.locator('.citace-nahled')).toContainText('Buddy P3 kniha')
  await page.getByRole('button', { name: '+ Přidat do seznamu' }).click()
  await expect(page.locator('.citace-seznam')).toContainText('Buddy P3 kniha')
})

test('Finance records income and Text editor saves from a short viewport', async ({ page }) => {
  await openApp(page, 'finance')
  await page.getByRole('button', { name: '+ Záznam' }).click()
  const transaction = page.getByRole('dialog', { name: 'Nový záznam' })
  await transaction.getByRole('button', { name: 'Příjem', exact: true }).click()
  await transaction.getByRole('spinbutton', { name: 'Částka v Kč' }).fill('150')
  await transaction.getByRole('button', { name: 'Přidat záznam' }).click()
  await expect(page.locator('.fin-summary-card--prijem')).toContainText('150')
  await expect(page.locator('.fin-row-castka')).toContainText('150')

  await openApp(page, 'document-editor')
  await page.setViewportSize({ width: 320, height: 440 })
  await page.getByRole('textbox', { name: 'Název dokumentu' }).fill('Buddy P3 dokument')
  await page.getByRole('textbox', { name: 'Obsah dokumentu' }).fill('Ověření pracovního prostoru')
  await page.getByRole('button', { name: 'Uložit', exact: true }).click()
  await page.getByRole('button', { name: 'Dokumenty', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Otevřít Buddy P3 dokument' })).toBeVisible()
  await page.getByRole('button', { name: 'Smazat Buddy P3 dokument' }).click()
  await expect(page.getByRole('dialog', { name: 'Smazat dokument?' })).toBeInViewport()
})
