import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBuddyDialogue } from '../../src/buddy/local/dialogue'
import type { BuddyActionRequest, BuddyActionResult } from '../../src/buddy/local/dialogue'
import type { IntentModel } from '../../src/buddy/local/intentModel'
import * as conversation from '../../src/buddy/local/conversationMemory'

const model = JSON.parse(readFileSync('public/buddy-ai/model-v1.json', 'utf8')) as IntentModel
const prefix = 'Vytvoř poznámku: '
const command = 'Ulož poslední odpověď do poznámky.'
const executor = () => vi.fn((_request: BuddyActionRequest): BuddyActionResult => ({
  status: 'done', text: 'Poznámka je uložená.',
}))

const lesson = async (dialogue: ReturnType<typeof createBuddyDialogue>) => {
  await dialogue.reply('Mám zítra test z biologie.')
  return dialogue.reply('Lidské srdce.')
}

const fakeAnswer = (answer: string) => {
  vi.spyOn(conversation, 'createBuddyConversationMemory').mockReturnValue({
    reply: () => answer,
    reset: vi.fn(),
    interrupt: vi.fn(),
  })
}

afterEach(() => vi.restoreAllMocks())

describe('Uložení poslední konverzační odpovědi Buddyho', () => {
  it.each([
    command,
    'Zapiš poslední odpověď do poznámky.',
    'Vytvoř poznámku z poslední odpovědi.',
    'Ulož poslední odpověď jako poznámku.',
    'Ulož tvoji poslední odpověď do poznámky.',
    'Ulož tvou poslední odpověď do poznámky.',
    'Vytvoř poznámku z tvé poslední odpovědi.',
    'Buddy, ulož poslední odpověď do poznámky prosím.',
  ])('předá odpověď běžnému adaptéru: %s', async (text) => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    const answer = await lesson(dialogue)
    expect(await dialogue.reply(text)).toBe('Poznámka je uložená.')
    expect(execute).toHaveBeenCalledOnce()
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      intent: 'create_note', text: prefix + answer, pending: null,
    }))
    expect(execute.mock.calls[0][0].signal.aborted).toBe(false)
  })

  it('bez odpovědi nevytvoří poznámku ani při opakování příkazu', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    expect(await dialogue.reply(command)).toContain('nemám konverzační odpověď')
    expect(await dialogue.reply(command)).toContain('nemám konverzační odpověď')
    expect(execute).not.toHaveBeenCalled()
  })

  it('potvrzením jiné akce nepřepíše konverzační obsah', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    const answer = await lesson(dialogue)
    await dialogue.reply('Otevři chat.')
    await dialogue.reply(command)
    expect(execute.mock.calls[1][0]).toMatchObject({
      intent: 'create_note', text: prefix + answer,
    })
  })

  it('po chybě umožní zopakovat uložení stejného obsahu', async () => {
    const execute = vi.fn((_request: BuddyActionRequest): BuddyActionResult => {
      if (execute.mock.calls.length === 1) throw new Error('Dočasná chyba')
      return { status: 'done', text: 'Uloženo.' }
    })
    const dialogue = createBuddyDialogue(model, execute)
    const answer = await lesson(dialogue)
    expect(await dialogue.reply(command)).toContain('nepodařilo dokončit')
    expect(await dialogue.reply(command)).toBe('Uloženo.')
    expect(execute.mock.calls[1][0].text).toBe(prefix + answer)
  })

  it('nový rozhovor a reset odstraní i odpověď k uložení', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    await lesson(dialogue)
    await dialogue.reply('Nový rozhovor.')
    expect(await dialogue.reply(command)).toContain('nemám konverzační odpověď')
    await lesson(dialogue)
    dialogue.reset()
    expect(await dialogue.reply(command)).toContain('nemám konverzační odpověď')
    expect(execute).not.toHaveBeenCalled()
  })

  it('nesdílí odpověď mezi dvěma relacemi', async () => {
    const firstExecute = executor()
    const secondExecute = executor()
    const first = createBuddyDialogue(model, firstExecute)
    const second = createBuddyDialogue(model, secondExecute)
    await lesson(first)
    expect(await second.reply(command)).toContain('nemám konverzační odpověď')
    await first.reply(command)
    expect(firstExecute).toHaveBeenCalledOnce()
    expect(secondExecute).not.toHaveBeenCalled()
  })

  it('zápornou větu ani dotaz na význam neprovede jako uložení', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    await lesson(dialogue)
    expect(await dialogue.reply('Neukládej poslední odpověď do poznámky.')).toContain('nebudu spouštět')
    expect(await dialogue.reply('Co znamená ulož poslední odpověď do poznámky?')).toContain('nebudu spouštět')
    expect(execute).not.toHaveBeenCalled()
  })

  it('při doplňování poznámky ponechá příkaz jako doslovný obsah', async () => {
    const execute = vi.fn((request: BuddyActionRequest): BuddyActionResult => request.pending
      ? { status: 'done', text: 'Uloženo.' }
      : {
          status: 'question', text: 'Co mám uložit?',
          pending: { intent: 'create_note', field: 'content' },
        })
    const dialogue = createBuddyDialogue(model, execute)
    await lesson(dialogue)
    await dialogue.reply('Vytvoř poznámku.')
    expect(await dialogue.reply(command)).toBe('Uloženo.')
    expect(execute.mock.calls[1][0]).toMatchObject({
      text: command, pending: { intent: 'create_note', field: 'content' },
    })
  })

  it('dvojtečky a pokyny uvnitř odpovědi uloží jako text', async () => {
    const answer = 'První bod:\nOtevři chat. Nezapomeň: dokončit projekt.'
    fakeAnswer(answer)
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    expect(await dialogue.reply('Ukázka.')).toBe(answer)
    await dialogue.reply(command)
    expect(execute).toHaveBeenCalledOnce()
    expect(execute.mock.calls[0][0]).toMatchObject({
      intent: 'create_note', text: prefix + answer,
    })
  })

  it('příliš dlouhou odpověď nekrátí ani neuloží', async () => {
    fakeAnswer('A'.repeat(500))
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    await dialogue.reply('Ukázka.')
    expect(await dialogue.reply(command)).toContain('příliš dlouhá')
    expect(await dialogue.reply(command)).toContain('příliš dlouhá')
    expect(execute).not.toHaveBeenCalled()
    dialogue.reset()
    expect(await dialogue.reply(command)).toContain('nemám konverzační odpověď')
  })

  it('povolí odpověď přesně do limitu požadavku', async () => {
    const answer = 'A'.repeat(500 - prefix.length)
    fakeAnswer(answer)
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    await dialogue.reply('Ukázka.')
    await dialogue.reply(command)
    expect(execute.mock.calls[0][0].text).toHaveLength(500)
  })

  it('bez adaptéru oznámí nedostupnost akce', async () => {
    const dialogue = createBuddyDialogue(model)
    await lesson(dialogue)
    expect(await dialogue.reply(command)).toContain('nemám dostupnou')
  })

  it('po resetu nedovolí opožděné akci obnovit odpověď', async () => {
    let finish: ((value: BuddyActionResult) => void) | undefined
    const execute = vi.fn((_request: BuddyActionRequest) => new Promise<BuddyActionResult>(
      (resolve) => { finish = resolve },
    ))
    const dialogue = createBuddyDialogue(model, execute)
    await lesson(dialogue)
    const saving = dialogue.reply(command)
    expect(execute).toHaveBeenCalledOnce()
    dialogue.reset()
    expect(execute.mock.calls[0][0].signal.aborted).toBe(true)
    finish?.({ status: 'done', text: 'Uloženo.' })
    await expect(saving).rejects.toMatchObject({ name: 'AbortError' })
    expect(await dialogue.reply(command)).toContain('nemám konverzační odpověď')
    expect(execute).toHaveBeenCalledOnce()
  })
})
