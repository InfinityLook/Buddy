import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createBuddyDialogue } from '../../src/buddy/local/dialogue'
import type { BuddyActionRequest, BuddyActionResult } from '../../src/buddy/local/dialogue'
import type { IntentModel } from '../../src/buddy/local/intentModel'

const model = JSON.parse(readFileSync('public/buddy-ai/model-v1.json', 'utf8')) as IntentModel
const executor = () => vi.fn((_request: BuddyActionRequest): BuddyActionResult => ({
  status: 'done', text: 'Akce je hotová.',
}))

const lesson = async (dialogue: ReturnType<typeof createBuddyDialogue>) => {
  await dialogue.reply('Mám zítra test z biologie.')
  await dialogue.reply('Lidské srdce.')
}

describe('Opravy a přepínání kontextu Buddyho', () => {
  it.each([
    ['Vlastně z chemie.', 'chemie'],
    ['Myslel jsem matematiku.', 'matematika'],
    ['Myslela jsem fyziku.', 'fyzika'],
    ['Ne biologii, ale chemii.', 'chemie'],
    ['Nemyslel jsem biologii, ale matematiku.', 'matematika'],
    ['Předmět je chemie.', 'chemie'],
    ['Změň předmět na chemii.', 'chemie'],
    ['Oprav předmět: z práva.', 'práva'],
  ])('opraví předmět: %s', async (text, subject) => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    await lesson(dialogue)
    expect(await dialogue.reply(text)).toContain(subject)
    const summary = await dialogue.reply('Co jsme řešili?')
    expect(summary).toContain(subject)
    expect(summary).not.toMatch(/biologie|Lidské srdce/)
    await dialogue.reply('Nové téma.')
    expect(await dialogue.reply('Co jsme řešili?')).toContain('Nové téma')
    expect(execute).not.toHaveBeenCalled()
  })

  it.each(['Vlastně buňku.', 'Téma je buňku.', 'Změň téma na buňku.'])(
    'opraví téma a zachová předmět: %s', async (text) => {
      const dialogue = createBuddyDialogue(model)
      await lesson(dialogue)
      await dialogue.reply(text)
      const summary = await dialogue.reply('Co jsme řešili?')
      expect(summary).toContain('biologie')
      expect(summary).toContain('buňku')
      expect(summary).not.toContain('Lidské srdce')
    },
  )

  it('prázdnou a nejasnou opravou nepřepíše údaje', async () => {
    const dialogue = createBuddyDialogue(model)
    await lesson(dialogue)
    expect(await dialogue.reply('Vlastně.')).toContain('Co chceš opravit')
    expect(await dialogue.reply('Vlastně nevím.')).toContain('Co chceš opravit')
    const summary = await dialogue.reply('Co jsme řešili?')
    expect(summary).toContain('biologie')
    expect(summary).toContain('Lidské srdce')
  })

  it('přepne z učení k projektu a opraví jeho část', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    await lesson(dialogue)
    expect(await dialogue.reply('Teď řešme projekt.')).toContain('Která část')
    expect(await dialogue.reply('To druhé.')).toContain('závěrečný odstavec')
    expect(await dialogue.reply('Vlastně úvod.')).toContain('jaký má cíl')
    const summary = await dialogue.reply('Co jsme řešili?')
    expect(summary).toContain('úvod')
    expect(summary).not.toMatch(/biologie|srdce|závěr/)
    expect(await dialogue.reply('Jaký předmět řešíme?')).toContain('ještě neřekl')
    expect(execute).not.toHaveBeenCalled()
  })

  it('změnu tématu rozhovoru oddělí od změny motivu', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    await lesson(dialogue)
    expect(await dialogue.reply('Změň téma rozhovoru na fotbal.')).toContain('fotbal')
    expect(await dialogue.reply('Co jsme řešili?')).not.toContain('biologie')
    expect(execute).not.toHaveBeenCalled()
    expect(await dialogue.reply('Změň motiv.')).toBe('Akce je hotová.')
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ intent: 'change_theme' }))
  })

  it('u nespecifikované změny požádá o nové téma', async () => {
    const dialogue = createBuddyDialogue(model)
    await lesson(dialogue)
    expect(await dialogue.reply('Teď něco jiného.')).toContain('O čem')
    expect(await dialogue.reply('Hudba.')).toContain('Hudba')
    const summary = await dialogue.reply('Co jsme řešili?')
    expect(summary).toContain('Hudba')
    expect(summary).not.toMatch(/biologie|srdce/)
  })

  it('podporuje nové učení i neúplný požadavek na opravu', async () => {
    const dialogue = createBuddyDialogue(model)
    expect(await dialogue.reply('Učím se biologii.')).toContain('biologie')
    expect(await dialogue.reply('Změň předmět.')).toContain('název předmětu')
    expect(await dialogue.reply('Chemie.')).toContain('chemie')
  })

  it('opravu obsahující příkaz neprovede jako akci', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    await lesson(dialogue)
    expect(await dialogue.reply('Vlastně otevři chat.')).toContain('Co chceš opravit')
    expect(execute).not.toHaveBeenCalled()
    expect(await dialogue.reply('Co jsme řešili?')).toContain('biologie')
  })

  it('obsah rozpracované poznámky nevyužije jako opravu kontextu', async () => {
    const execute = vi.fn((request: BuddyActionRequest): BuddyActionResult => request.pending
      ? { status: 'done', text: 'Poznámka je uložená.' }
      : {
          status: 'question', text: 'Co mám uložit?',
          pending: { intent: 'create_note', field: 'content' },
        })
    const dialogue = createBuddyDialogue(model, execute)
    await lesson(dialogue)
    await dialogue.reply('Vytvoř poznámku.')
    expect(await dialogue.reply('Vlastně z chemie.')).toBe('Poznámka je uložená.')
    expect(execute.mock.calls[1][0]).toMatchObject({
      intent: 'create_note', text: 'Vlastně z chemie.',
      pending: { intent: 'create_note', field: 'content' },
    })
    expect(await dialogue.reply('Jaký předmět řešíme?')).toContain('biologie')
  })

  it('řídicí větu za dvojtečkou ponechá jako obsah poznámky', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    const text = 'Vytvoř poznámku: Změň téma na chemii.'
    expect(await dialogue.reply(text)).toBe('Akce je hotová.')
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ intent: 'create_note', text }))
  })

  it('nový rozhovor vymaže i opravené údaje', async () => {
    const dialogue = createBuddyDialogue(model)
    await lesson(dialogue)
    await dialogue.reply('Vlastně z chemie.')
    await dialogue.reply('Nový rozhovor.')
    expect(await dialogue.reply('Jaký předmět řešíme?')).toContain('ještě neřekl')
  })

  it('přijme opravu i s rozloženými českými znaky', async () => {
    const execute = executor()
    const dialogue = createBuddyDialogue(model, execute)
    await lesson(dialogue)
    expect(await dialogue.reply('Vlastně z chemie.'.normalize('NFD'))).toContain('chemie')
    expect(await dialogue.reply('Co jsme řešili?')).not.toContain('Lidské srdce')
    expect(execute).not.toHaveBeenCalled()
  })
})
