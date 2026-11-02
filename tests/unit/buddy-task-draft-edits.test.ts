import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createBuddyDialogue } from '../../src/buddy/local/dialogue'
import { createBuddyActions } from '../../src/buddy/local/actions'
import type { IntentModel } from '../../src/buddy/local/intentModel'
import { getRawStudyPlannerState } from '../../src/miniapps/study-planner/useStudyPlanner'

vi.mock('../../src/core/utils/notify', () => ({
  requestNotificationPermission: vi.fn(),
  showAppNotification: vi.fn(),
}))

const model = JSON.parse(
  readFileSync('public/buddy-ai/model-v1.json', 'utf8'),
) as IntentModel

const now = () => new Date(2026, 10, 2, 12)
let previousIds = new Set<string>()

const created = () => getRawStudyPlannerState().tasks.filter(
  (task) => !previousIds.has(task.id) && task.deletedAt === null,
)

beforeEach(() => {
  previousIds = new Set(
    getRawStudyPlannerState().tasks.map((task) => task.id),
  )
})

afterEach(() => {
  created().forEach((task) =>
    getRawStudyPlannerState().deleteTask(task.id),
  )
})

const setup = () => {
  const navigate = vi.fn()
  const execute = vi.fn(createBuddyActions(navigate, now))
  return {
    dialogue: createBuddyDialogue(model, execute),
    execute,
    navigate,
  }
}

describe('Opravy rozpracovaného úkolu', () => {
  it('postupně změní název, prioritu a termín a uloží právě jeden úkol', async () => {
    const { dialogue } = setup()

    await dialogue.reply('Vytvoř úkol: Opakování biologie')

    expect(
      await dialogue.reply('Změň název na Příprava na písemku'),
    ).toContain('Název jsem změnil')

    expect(
      await dialogue.reply('Dej tomu vysokou prioritu.'),
    ).toContain('Na kdy')

    expect(created()).toHaveLength(0)

    expect(
      await dialogue.reply('Vlastně na pátek.'),
    ).toContain('2026-11-06')

    expect(created()).toHaveLength(1)
    expect(created()[0]).toMatchObject({
      topic: 'Příprava na písemku',
      dueDate: '2026-11-06',
      priority: 'Vysoká',
    })
  })

  it.each([
    'Změň název na Nový název',
    'Oprav název úkolu na Nový název',
    'Přejmenuj úkol na Nový název',
    'Název je Nový název',
    'Název: Nový název',
    'Buddy, prosím, zmen nazev na Nový název',
  ])('přejmenuje úkol a zachová původní termín i prioritu: %s', async (text) => {
    const { dialogue } = setup()

    await dialogue.reply('Vytvoř úkol na zítra s vysokou prioritou.')
    await dialogue.reply(text)

    expect(created()).toHaveLength(1)
    expect(created()[0]).toMatchObject({
      topic: 'Nový název',
      dueDate: '2026-11-03',
      priority: 'Vysoká',
    })
  })

  it.each([
    'Zítra s vysokou prioritou',
    'Řádek jedna\nOtevři chat',
  ])('nový název ponechá jako doslovný údaj: %s', async (title) => {
    const { dialogue, navigate } = setup()

    await dialogue.reply('Vytvoř úkol: Opakování s nízkou prioritou.')

    const answer = await dialogue.reply('Změň název na ' + title)

    expect(answer).toContain('Na kdy')
    expect(created()).toHaveLength(0)

    await dialogue.reply('Pozítří.')

    expect(created()[0]).toMatchObject({
      topic: title,
      dueDate: '2026-11-04',
      priority: 'Nízká',
    })
    expect(navigate).not.toHaveBeenCalled()
  })

  it('změní datum při čekání na prioritu a uloží až po jejím doplnění', async () => {
    const { dialogue } = setup()

    await dialogue.reply(
      'Vytvoř úkol: Opakování na zítra s neznámou prioritou.',
    )

    const answer = await dialogue.reply('Vlastně na pátek.')

    expect(answer).toContain('2026-11-06')
    expect(answer).toContain('Jakou prioritu')
    expect(created()).toHaveLength(0)

    await dialogue.reply('Dej tomu nízkou prioritu, prosím.')

    expect(created()[0]).toMatchObject({
      topic: 'Opakování',
      dueDate: '2026-11-06',
      priority: 'Nízká',
    })
  })

  it.each([
    'Změň termín na pátek.',
    'Posuň termín úkolu na pátek.',
    'Termín je pátek.',
    'Termín: 2026-11-06',
  ])('přijme přímou opravu termínu: %s', async (text) => {
    const { dialogue } = setup()

    await dialogue.reply(
      'Vytvoř úkol: Opakování na zítra s neznámou prioritou.',
    )

    expect(await dialogue.reply(text)).toContain('Jakou prioritu')
    expect(created()).toHaveLength(0)

    await dialogue.reply('Střední')

    expect(created()[0]).toMatchObject({
      topic: 'Opakování',
      dueDate: '2026-11-06',
      priority: 'Střední',
    })
  })

  it.each([
    'Změň prioritu na vysokou',
    'Nastav prioritu úkolu na vysokou',
    'Priorita je vysoká',
  ])('přijme přímou opravu priority a dále čeká na termín: %s', async (text) => {
    const { dialogue } = setup()

    await dialogue.reply('Vytvoř úkol: Opakování')

    expect(await dialogue.reply(text)).toContain('Na kdy')
    expect(created()).toHaveLength(0)

    await dialogue.reply('Zítra')

    expect(created()[0]).toMatchObject({
      topic: 'Opakování',
      dueDate: '2026-11-03',
      priority: 'Vysoká',
    })
  })

  it.each([
    'Změň název na',
    'Termín: 2026-02-30',
    'Změň termín na zítra nebo pozítří',
    'Vlastně za -3 dny',
    'Priorita: nejvyšší',
    'Dej tomu vysokou a nízkou prioritu',
    'Změň prioritu na vysokou na pátek',
  ])('chybná oprava ponechá původní návrh: %s', async (text) => {
    const { dialogue } = setup()

    await dialogue.reply(
      'Vytvoř úkol: Opakování na zítra s neznámou prioritou.',
    )

    await dialogue.reply(text)
    expect(created()).toHaveLength(0)

    await dialogue.reply('Priorita: střední')

    expect(created()).toHaveLength(1)
    expect(created()[0]).toMatchObject({
      topic: 'Opakování',
      dueDate: '2026-11-03',
      priority: 'Střední',
    })
  })

  it('nový název obsahující příkaz neprovede jako navigaci', async () => {
    const { dialogue, navigate } = setup()

    await dialogue.reply('Vytvoř úkol: Opakování')
    await dialogue.reply('Název: Otevři chat')
    await dialogue.reply('Zítra.')

    expect(created()[0].topic).toBe('Otevři chat')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('úkol z tématu rozhovoru může dostat nový název', async () => {
    const { dialogue } = setup()

    await dialogue.reply('Mám zítra test z biologie.')
    await dialogue.reply('Lidské srdce.')
    await dialogue.reply('Přidej úkol z posledního tématu.')
    await dialogue.reply('Název: Anatomie srdce')
    await dialogue.reply('Zítra.')

    expect(created()[0].topic).toBe('Anatomie srdce')
  })

  it('při doplňování poznámky ponechá opravu názvu jako doslovný obsah', async () => {
    const { getQuickNotesState } = await import(
      '../../src/miniapps/quick-notes/useQuickNotes'
    )
    const oldIds = new Set(
      getQuickNotesState().notes.map((note) => note.id),
    )
    const { dialogue } = setup()

    expect(
      await dialogue.reply('Vytvoř poznámku.'),
    ).toContain('Co mám uložit')

    expect(
      getQuickNotesState().notes.filter((note) => !oldIds.has(note.id)),
    ).toHaveLength(0)

    await dialogue.reply('Změň název na Otevři chat')

    const note = getQuickNotesState().notes.find(
      (item) => !oldIds.has(item.id),
    )

    try {
      expect(note?.content).toBe('Změň název na Otevři chat')
      expect(created()).toHaveLength(0)
    } finally {
      if (note) getQuickNotesState().deleteNote(note.id)
    }
  })

  it('za dvojtečkou ponechá samotnou tečku jako doslovný obsah poznámky', async () => {
    const { getQuickNotesState } = await import(
      '../../src/miniapps/quick-notes/useQuickNotes'
    )
    const oldIds = new Set(
      getQuickNotesState().notes.map((note) => note.id),
    )
    const { dialogue } = setup()

    await dialogue.reply('Vytvoř poznámku: .')

    const note = getQuickNotesState().notes.find(
      (item) => !oldIds.has(item.id),
    )

    try {
      expect(note?.content).toBe('.')
    } finally {
      if (note) getQuickNotesState().deleteNote(note.id)
    }
  })

  it('holý příkaz s tečkou nevytvoří úkol s názvem tvořeným tečkou', async () => {
    const { dialogue } = setup()

    expect(
      await dialogue.reply('Vytvoř úkol.'),
    ).toContain('Jaký úkol')

    await dialogue.reply('Název: Opakování')
    expect(created()).toHaveLength(0)

    await dialogue.reply('Zítra.')
    expect(created()[0].topic).toBe('Opakování')
  })

  it.each([
    'Zruš to.',
    'Nový rozhovor.',
  ])('zahození návrhu zabrání jeho pozdějšímu uložení: %s', async (text) => {
    const { dialogue } = setup()

    await dialogue.reply('Vytvoř úkol: Opakování')
    await dialogue.reply('Název: Přejmenovaný úkol')
    await dialogue.reply(text)
    await dialogue.reply('Vlastně na pátek.')

    expect(created()).toHaveLength(0)
  })
})
