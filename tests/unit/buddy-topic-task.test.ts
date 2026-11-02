import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createBuddyDialogue } from '../../src/buddy/local/dialogue'
import type { BuddyActionRequest } from '../../src/buddy/local/dialogue'
import type { IntentModel } from '../../src/buddy/local/intentModel'
import { createBuddyActions } from '../../src/buddy/local/actions'
import { getRawStudyPlannerState } from '../../src/miniapps/study-planner/useStudyPlanner'

vi.mock('../../src/core/utils/notify', () => ({
  requestNotificationPermission: vi.fn(),
  showAppNotification: vi.fn(),
}))

const model = JSON.parse(readFileSync('public/buddy-ai/model-v1.json', 'utf8')) as IntentModel
const now = () => new Date(2026, 10, 1, 12)
const command = 'Přidej úkol z posledního tématu.'
let previousIds = new Set<string>()

const created = () => getRawStudyPlannerState().tasks.filter(
  (task) => !previousIds.has(task.id) && task.deletedAt === null,
)

beforeEach(() => {
  previousIds = new Set(getRawStudyPlannerState().tasks.map((task) => task.id))
})

afterEach(() => {
  created().forEach((task) => getRawStudyPlannerState().deleteTask(task.id))
})

const setup = () => {
  const navigate = vi.fn()
  const execute = vi.fn(createBuddyActions(navigate, now))
  return { dialogue: createBuddyDialogue(model, execute), execute, navigate }
}

const lesson = async (dialogue: ReturnType<typeof createBuddyDialogue>, topic = 'Lidské srdce.') => {
  await dialogue.reply('Mám zítra test z biologie.')
  await dialogue.reply(topic)
}

describe('Úkol z tématu rozhovoru', () => {
  it.each([
    command,
    'Vytvoř úkol z posledního tématu.',
    'Přidej úkol k tématu rozhovoru.',
    'Vytvoř úkol k tématu rozhovoru.',
    'Přidej úkol k tomu tématu.',
    'Vytvoř úkol k tomu tématu.',
    'Přidej k tomu úkol.',
    'Vytvoř k tomu úkol.',
  ])('připraví název, doptá se a uloží do skutečného plánovače: %s', async (text) => {
    const { dialogue, execute } = setup()
    await lesson(dialogue)
    const question = await dialogue.reply(text)
    expect(question).toContain('Zopakovat Lidské srdce (biologie)')
    expect(question).toContain('Na kdy')
    expect(created()).toHaveLength(0)
    expect(execute.mock.calls[0][0]).toMatchObject({
      intent: 'create_task', taskTitle: 'Zopakovat Lidské srdce (biologie)',
    })
    expect(await dialogue.reply('Zítra.')).toContain('2026-11-02')
    expect(created()).toHaveLength(1)
    expect(created()[0]).toMatchObject({
      topic: 'Zopakovat Lidské srdce (biologie)',
      dueDate: '2026-11-02', priority: 'Střední',
    })
  })

  it('přijme termín a prioritu uvedené ve stejném příkazu', async () => {
    const { dialogue } = setup()
    await lesson(dialogue)
    const answer = await dialogue.reply('Přidej úkol z posledního tématu na zítra s vysokou prioritou.')
    expect(answer).toContain('2026-11-02')
    expect(created()).toHaveLength(1)
    expect(created()[0]).toMatchObject({
      topic: 'Zopakovat Lidské srdce (biologie)',
      dueDate: '2026-11-02', priority: 'Vysoká',
    })
  })

  it('bez tématu nevytváří ani nerozpracuje úkol', async () => {
    const { dialogue, execute } = setup()
    expect(await dialogue.reply(command)).toContain('upřesni téma')
    expect(execute).not.toHaveBeenCalled()
    expect(created()).toHaveLength(0)
    await dialogue.reply('Mám zítra test z biologie.')
    expect(await dialogue.reply(command)).toContain('upřesni téma')
    expect(execute).not.toHaveBeenCalled()
  })

  it('pro projekt použije poslední upřesněnou část práce', async () => {
    const { dialogue } = setup()
    await dialogue.reply('Chci dokončit prezentaci.')
    await dialogue.reply('Chybí mi závěr.')
    expect(await dialogue.reply(command)).toContain('Dokončit část práce: závěr')
    await dialogue.reply('Pozítří.')
    expect(created()[0]).toMatchObject({
      topic: 'Dokončit část práce: závěr', dueDate: '2026-11-03',
    })
  })

  it('po opravě předmětu vyžaduje nové téma', async () => {
    const { dialogue, execute } = setup()
    await lesson(dialogue)
    await dialogue.reply('Vlastně z chemie.')
    expect(await dialogue.reply(command)).toContain('upřesni téma')
    expect(execute).not.toHaveBeenCalled()
    await dialogue.reply('Organické látky.')
    await dialogue.reply('Přidej úkol z posledního tématu na zítra.')
    expect(created()[0].topic).toBe('Zopakovat Organické látky (chemie)')
  })

  it('slova o datu a prioritě v tématu zůstanou součástí názvu', async () => {
    const { dialogue } = setup()
    await lesson(dialogue, 'Zítra s vysokou prioritou.')
    expect(await dialogue.reply(command)).toContain('Na kdy')
    expect(created()).toHaveLength(0)
    await dialogue.reply('Pozítří.')
    expect(created()[0]).toMatchObject({
      topic: 'Zopakovat Zítra s vysokou prioritou (biologie)',
      dueDate: '2026-11-03', priority: 'Střední',
    })
  })

  it('příkaz uložený jako téma neprovede jako navigaci', async () => {
    const { dialogue, navigate } = setup()
    await dialogue.reply('Mám zítra test z biologie.')
    await dialogue.reply('Téma je Otevři chat.')
    await dialogue.reply('Přidej úkol z posledního tématu na zítra.')
    expect(created()[0].topic).toBe('Zopakovat Otevři chat (biologie)')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('záporný příkaz ani vysvětlující dotaz nevytvoří úkol', async () => {
    const { dialogue, execute } = setup()
    await lesson(dialogue)
    await dialogue.reply('Nechci přidat úkol z posledního tématu.')
    await dialogue.reply('Co znamená přidej úkol z posledního tématu?')
    expect(execute).not.toHaveBeenCalled()
    expect(created()).toHaveLength(0)
  })

  it('zruší rozpracovaný úkol a zahodí jeho kontext', async () => {
    const { dialogue } = setup()
    await lesson(dialogue)
    await dialogue.reply(command)
    await dialogue.reply('Zruš to.')
    await dialogue.reply('Zítra.')
    expect(created()).toHaveLength(0)
    expect(await dialogue.reply(command)).toContain('upřesni téma')
  })

  it('nepovažuje neplatný nebo dvojznačný den za potvrzený termín', async () => {
    const { dialogue } = setup()
    await lesson(dialogue)
    await dialogue.reply(command)
    await dialogue.reply('Zítra nebo pozítří.')
    expect(created()).toHaveLength(0)
    await dialogue.reply('2026-02-30')
    expect(created()).toHaveLength(0)
    await dialogue.reply('2026-11-15')
    expect(created()[0].dueDate).toBe('2026-11-15')
  })

  it('při doplňování poznámky chápe tento příkaz jako její obsah', async () => {
    const execute = vi.fn((request: BuddyActionRequest) => request.pending
      ? { status: 'done' as const, text: 'Uloženo.' }
      : {
          status: 'question' as const, text: 'Co mám uložit?',
          pending: { intent: 'create_note' as const, field: 'content' as const },
        })
    const dialogue = createBuddyDialogue(model, execute)
    await lesson(dialogue)
    await dialogue.reply('Vytvoř poznámku.')
    await dialogue.reply(command)
    expect(execute.mock.calls[1][0]).toMatchObject({
      intent: 'create_note', text: command,
      pending: { intent: 'create_note', field: 'content' },
    })
    expect(execute.mock.calls[1][0].taskTitle).toBeUndefined()
  })

  it.each(['', ' '.repeat(5), 'A'.repeat(501), 123, null])(
    'odmítne neplatný předaný název: %s', async (value) => {
      const execute = createBuddyActions(vi.fn(), now)
      const result = await execute({
        intent: 'create_task', text: 'Přidej úkol na zítra.',
        pending: null, signal: new AbortController().signal,
        taskTitle: value as unknown as string,
      })
      expect(result.status).toBe('error')
      expect(created()).toHaveLength(0)
    },
  )

  it('běžný příkaz na vytvoření úkolu ponechá funkční', async () => {
    const { dialogue } = setup()
    await dialogue.reply('Přidej úkol: Dokončit prezentaci na zítra s nízkou prioritou.')
    expect(created()[0]).toMatchObject({
      topic: 'Dokončit prezentaci', dueDate: '2026-11-02', priority: 'Nízká',
    })
  })
})
