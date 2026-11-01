import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createBuddyDialogue } from '../../src/buddy/local/dialogue'
import type { BuddyActionRequest, BuddyActionResult } from '../../src/buddy/local/dialogue'
import type { IntentModel } from '../../src/buddy/local/intentModel'

const model = JSON.parse(readFileSync(
  'public/buddy-ai/model-v1.json', 'utf8',
)) as IntentModel

const executor = () => vi.fn((_request: BuddyActionRequest): BuddyActionResult => ({
  status: 'done', text: 'Akce je hotová.',
}))

describe('Krátkodobá paměť rozhovoru Buddyho', () => {
  it('naváže na předmět i téma a drží příkazy odděleně', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    expect(await dialogue.reply('Mám zítra zkoušku.')).toContain('Z jakého předmětu')
    expect(await dialogue.reply('Z biologie.')).toContain('biologie')
    expect(await dialogue.reply('Lidské srdce.')).toContain('Lidské srdce')
    expect(await dialogue.reply('Co jsme řešili?')).toContain('Lidské srdce')
    expect(await dialogue.reply('A co dál?')).toContain('Lidské srdce')
    expect(execute).not.toHaveBeenCalled()
  })

  it('rozpozná předmět už v první zprávě', async () => {
    const dialogue = createBuddyDialogue(model)
    expect(await dialogue.reply('Mám zítra test z biologie.')).toContain('biologie')
    expect(await dialogue.reply('Buňka.')).toContain('Buňka')
  })

  it('naváže na chybějící část projektu', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    expect(await dialogue.reply('Chci dokončit prezentaci.')).toContain('Která část')
    expect(await dialogue.reply('Chybí mi závěr.')).toContain('závěrečný odstavec')
    expect(await dialogue.reply('Co jsme řešili?')).toContain('závěr')
    expect(execute).not.toHaveBeenCalled()
  })

  it('povolí povídání v záporné větě bez spuštění akce', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    expect(await dialogue.reply('Nechci nic plánovat, jen si povídat.')).toContain('O čem')
    expect(await dialogue.reply('Škola.')).toContain('Škola')
    expect(execute).not.toHaveBeenCalled()
  })

  it('zachová zákaz záporných a složených příkazů', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    expect(await dialogue.reply('Neotvírej chat.')).toContain('nebudu spouštět')
    expect(await dialogue.reply('Otevři chat a potom přidej úkol.')).toContain('nebudu spouštět')
    expect(execute).not.toHaveBeenCalled()
  })

  it('během otázky na předmět upřednostní přímý příkaz', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    await dialogue.reply('Mám zítra zkoušku.')
    expect(await dialogue.reply('Otevři chat.')).toBe('Akce je hotová.')
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ intent: 'open_module' }))
    expect(await dialogue.reply('Co jsme řešili?')).toContain('Z jakého předmětu')
    expect(await dialogue.reply('Chemie.')).toContain('chemie')
  })

  it.each([
    ['Otevři chat.', 'open_module'],
    ['Vytvoř poznámku.', 'create_note'],
    ['Přidej úkol.', 'create_task'],
    ['Spusť Pomodoro na 25 minut.', 'start_pomodoro'],
    ['Změň motiv.', 'change_theme'],
  ])('zachová příkaz %s i během konverzace', async (text, intent) => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    await dialogue.reply('Chci se učit.')
    expect(await dialogue.reply(text)).toBe('Akce je hotová.')
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ intent, text }))
  })

  it('zachová rozpoznanou žádost s chci a povídání od ní odliší', async () => {
    const actionModel: IntentModel = {
      version: 1, featureCount: 128, labels: ['open_module', 'help'],
      weights: [Array<number>(128).fill(0), Array<number>(128).fill(0)],
      biases: [20, -20],
    }
    const execute = executor()
    const dialogue = createBuddyDialogue(actionModel, execute)
    await dialogue.reply('Mám zítra zkoušku.')
    expect(await dialogue.reply('Chci jít do profilu.')).toBe('Akce je hotová.')
    expect(execute).toHaveBeenCalledOnce()
    expect(await dialogue.reply('Chci si povídat o úkolech.')).toContain('O čem')
    expect(execute).toHaveBeenCalledOnce()
  })

  it('nepoužije obsah poznámky jako pokyn k povídání', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    const text = 'Vytvoř poznámku: Chci si povídat.'
    expect(await dialogue.reply(text)).toBe('Akce je hotová.')
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      intent: 'create_note', text,
    }))
    expect(await dialogue.reply('Co jsme řešili?')).toContain('nemám žádné')
  })

  it('při doplňování poznámky neukládá její obsah do paměti předmětu', async () => {
    const execute = vi.fn((request: BuddyActionRequest): BuddyActionResult => request.pending
      ? { status: 'done', text: 'Poznámka je uložená.' }
      : {
          status: 'question', text: 'Co mám uložit?',
          pending: { intent: 'create_note', field: 'content' },
        })
    const dialogue = createBuddyDialogue(model, execute)
    await dialogue.reply('Mám zítra zkoušku.')
    expect(await dialogue.reply('Vytvoř poznámku.')).toBe('Co mám uložit?')
    expect(await dialogue.reply('Z biologie.')).toBe('Poznámka je uložená.')
    expect(execute.mock.calls[1][0]).toMatchObject({
      text: 'Z biologie.', pending: { intent: 'create_note', field: 'content' },
    })
    expect(await dialogue.reply('Jaký předmět řešíme?')).toContain('ještě neřekl')
  })

  it('nový rozhovor i reset odstraní paměť', async () => {
    const dialogue = createBuddyDialogue(model)
    await dialogue.reply('Mám zítra test z biologie.')
    expect(await dialogue.reply('Buddy, nový rozhovor prosím.')).toContain('nový rozhovor')
    expect(await dialogue.reply('Jaký předmět řešíme?')).toContain('ještě neřekl')
    await dialogue.reply('Mám zítra test z chemie.')
    dialogue.reset()
    expect(await dialogue.reply('Co jsme řešili?')).toContain('nemám žádné')
  })

  it('nesdílí paměť mezi dvěma relacemi', async () => {
    const first = createBuddyDialogue(model)
    const second = createBuddyDialogue(model)
    await first.reply('Mám zítra test z biologie.')
    expect(await second.reply('Jaký předmět řešíme?')).toContain('ještě neřekl')
    expect(await first.reply('Jaký předmět řešíme?')).toContain('biologie')
  })

  it('reset přeruší rozpracovanou akci a vymaže paměť', async () => {
    let finish: ((value: BuddyActionResult) => void) | undefined
    const execute = vi.fn((_request: BuddyActionRequest) => new Promise<BuddyActionResult>(
      (resolve) => { finish = resolve },
    ))
    const dialogue = createBuddyDialogue(model, execute)
    await dialogue.reply('Mám zítra test z biologie.')
    const pending = dialogue.reply('Otevři chat.')
    expect(execute).toHaveBeenCalledOnce()
    dialogue.reset()
    finish?.({ status: 'done', text: 'Hotovo.' })
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(await dialogue.reply('Jaký předmět řešíme?')).toContain('ještě neřekl')
  })

  it('dlouhé zprávy nemění paměť a hodnoty jsou omezené', async () => {
    const dialogue = createBuddyDialogue(model)
    await dialogue.reply('Mám zítra zkoušku.')
    expect(await dialogue.reply('A'.repeat(501))).toContain('500')
    await dialogue.reply('A'.repeat(100))
    const summary = await dialogue.reply('Jaký předmět řešíme?')
    expect(summary).toContain('A'.repeat(80))
    expect(summary).not.toContain('A'.repeat(81))
  })
})
