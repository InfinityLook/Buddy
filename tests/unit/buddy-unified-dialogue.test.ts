import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createBuddyDialogue } from '../../src/buddy/local/dialogue'
import type { BuddyActionExecutor } from '../../src/buddy/local/dialogue'
import type { IntentModel } from '../../src/buddy/local/intentModel'
import type { BuddyChatMessage, BuddyTextGenerator } from '../../src/buddy/local/generation/types'

const model = JSON.parse(readFileSync('public/buddy-ai/model-v1.json', 'utf8')) as IntentModel
const prompt = 'Jaký má smysl dělat věci po malých krocích?'
const reply = 'Snáz poznáš, co zvládneš udělat jako první. Co právě řešíš?'
const setup = (answer: string | null = reply) => {
  const generate = vi.fn<BuddyTextGenerator['generate']>().mockResolvedValue(answer)
  const dispose = vi.fn()
  const execute = vi.fn<BuddyActionExecutor>().mockResolvedValue({ status: 'done', text: 'Akce dokončena.' })
  return { generate, dispose, execute, dialogue: createBuddyDialogue(model, execute, { generator: { generate, dispose } }) }
}

afterEach(() => vi.useRealTimers())

describe('Jeden Buddy s řízením příkazů a generovanými odpověďmi', () => {
  it('předá povídání generátoru a příkaz výhradně adaptéru akcí', async () => {
    const { dialogue, generate, execute } = setup()
    expect(await dialogue.reply(prompt)).toBe(reply)
    expect(execute).not.toHaveBeenCalled()
    expect(await dialogue.reply('Otevři chat.')).toBe('Akce dokončena.')
    expect(execute).toHaveBeenCalledOnce()
    expect(generate).toHaveBeenCalledOnce()
  })

  it('nezpracovává doplňovaný obsah generátorem ani jako další příkaz', async () => {
    const { dialogue, generate, execute } = setup()
    execute.mockImplementationOnce(() => ({
      status: 'question', text: 'Co mám uložit?',
      pending: { intent: 'create_note', field: 'content' },
    }))
    await dialogue.reply('Vytvoř poznámku.')
    await dialogue.reply('Otevři chat a napiš mi nějakou radu.')
    expect(generate).not.toHaveBeenCalled()
    expect(execute.mock.calls[1][0]).toMatchObject({ intent: 'create_note', pending: { field: 'content' } })
  })

  it('generovaný příkaz zůstane textem', async () => {
    const { dialogue, execute } = setup('Otevři chat.')
    expect(await dialogue.reply(prompt)).toBe('Otevři chat.')
    expect(execute).not.toHaveBeenCalled()
  })

  it('generovanou odpověď uloží jen na nový výslovný pokyn uživatele', async () => {
    const { dialogue, execute } = setup()
    await dialogue.reply(prompt)
    expect(execute).not.toHaveBeenCalled()
    await dialogue.reply('Ulož poslední odpověď do poznámky.')
    expect(execute).toHaveBeenCalledOnce()
    expect(execute.mock.calls[0][0]).toMatchObject({ intent: 'create_note', text: 'Vytvoř poznámku: ' + reply })
  })

  it('předá společnou historii i opravené aktuální téma', async () => {
    const { dialogue, generate } = setup()
    await dialogue.reply('Mám zítra test z biologie.')
    await dialogue.reply('Lidské srdce.')
    await dialogue.reply('Předmět je chemie.')
    await dialogue.reply('Organické látky.')
    await dialogue.reply(prompt)
    const messages = generate.mock.calls[0][0]
    expect(messages.at(-1)).toEqual({ role: 'user', text: prompt })
    expect(messages.at(-2)?.text).toContain('Předmět: chemie.')
    expect(messages.at(-2)?.text).toContain('Organické látky')
    expect(messages.some((m) => m.text === 'Lidské srdce.')).toBe(true)
  })

  it('po příkazu naváže na předchozí povídání', async () => {
    const { dialogue, generate } = setup()
    await dialogue.reply(prompt)
    await dialogue.reply('Otevři chat.')
    await dialogue.reply('Proč pomáhá rozdělit velkou práci?')
    expect(generate.mock.calls.at(-1)![0]).toContainEqual({ role: 'assistant', text: reply })
    expect(generate.mock.calls.at(-1)![0]).toContainEqual({ role: 'assistant', text: 'Akce dokončena.' })
  })

  it.each([null, '', 'a'.repeat(481), 'slovo slovo slovo slovo', 'Ahoj\ufffd', 'Uložil jsem poznámku.', 'Poznámku jsem uložil.'])
  ('při nedostupném nebo chybném výstupu zachová připravenou odpověď: %s', async (answer) => {
    const { dialogue, execute } = setup(answer)
    expect(await dialogue.reply(prompt)).toContain('zatím nerozumím')
    expect(execute).not.toHaveBeenCalled()
  })

  it('chyba modelu nezablokuje další příkaz', async () => {
    const { dialogue, generate, execute } = setup()
    generate.mockRejectedValueOnce(new Error('model chybí'))
    await dialogue.reply(prompt)
    await dialogue.reply('Otevři chat.')
    expect(execute).toHaveBeenCalledOnce()
  })

  it('zruší i generátor, který ignoruje AbortSignal, a nepřevezme jeho pozdní výsledek', async () => {
    const { dialogue, generate, dispose } = setup()
    let finish!: (text: string) => void
    generate.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const first = dialogue.reply(prompt)
    const cancelled = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    await dialogue.reply('Nový rozhovor.')
    await cancelled
    expect(dispose).toHaveBeenCalledOnce()
    finish('Zastaralá odpověď.')
    await dialogue.reply(prompt)
    expect(generate.mock.calls[1][0]).toEqual([{ role: 'user', text: prompt }])
  })

  it('během výpočtu brání souběžnému provedení akce', async () => {
    const { dialogue, generate, execute } = setup()
    let finish!: (text: string) => void
    generate.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const first = dialogue.reply(prompt)
    expect(await dialogue.reply('Otevři chat.')).toContain('Ještě zpracovávám')
    expect(execute).not.toHaveBeenCalled()
    finish(reply)
    await first
  })

  it('časový limit ukončí zaseknutý generátor', async () => {
    vi.useFakeTimers()
    const { dialogue, generate, execute } = setup()
    generate.mockImplementationOnce(() => new Promise(() => {}))
    const first = dialogue.reply(prompt)
    await vi.advanceTimersByTimeAsync(25001)
    expect(await first).toContain('zatím nerozumím')
    expect(generate.mock.calls[0][1].aborted).toBe(true)
    await dialogue.reply('Otevři chat.')
    expect(execute).toHaveBeenCalledOnce()
  })

  it('historie má pevný limit a různé relace ji nesdílejí', async () => {
    const first = setup()
    for (let i = 0; i < 12; i += 1) await first.dialogue.reply(prompt)
    expect(first.generate.mock.calls.at(-1)![0].length).toBeLessThanOrEqual(15)
    const second = setup()
    await second.dialogue.reply(prompt)
    expect(second.generate.mock.calls[0][0]).toEqual([{ role: 'user', text: prompt }] satisfies BuddyChatMessage[])
  })
})
