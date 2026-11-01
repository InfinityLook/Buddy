import { normalizeIntentText } from './intentModel'
import type { BuddyActionExecutor, BuddyActionResult } from './dialogue'
import type { BuddyThemeId } from '@/features/appearance/themeCatalog'

const DESTINATIONS = [
  { match: /\b(hub|domu|hlavni obrazovk\w*)\b/, name: 'hlavní obrazovku', path: '/hub' },
  { match: /\b(chat\w*|zprav\w*|komunit\w*)\b/, name: 'chat', path: '/social' },
  { match: /\bprofil\w*\b/, name: 'profil', path: '/profil' },
  { match: /\b(aplikac\w*|apps)\b/, name: 'aplikace', path: '/apps' },
  { match: /\bnastaveni\b/, name: 'nastavení', path: '/nastaveni' },
  { match: /\b(poznamk\w*|poznamek)\b/, name: 'poznámky', path: '/apps', app: 'quick-notes' },
  { match: /\b(ukol\w*|planovac\w*|planer)\b/, name: 'plánovač', path: '/apps', app: 'study-planner' },
  { match: /\b(pomodoro|casovac\w*)\b/, name: 'Pomodoro', path: '/apps', app: 'pomodoro' },
  { match: /\b(skol\w*|school)\b/, name: 'School Room', path: '/skola' },
  { match: /\bfitness\b/, name: 'Fitness Room', path: '/fitness' },
  { match: /\b(economy|ekonom\w*)\b/, name: 'Economy Room', path: '/economy' },
  { match: /\b(growth|rozvoj\w*)\b/, name: 'Growth Room', path: '/growth' },
  { match: /\b(music|hudebn\w*)\b/, name: 'Music Room', path: '/music' },
  { match: /\b(spisovatel\w*|writer)\b/, name: 'Writer’s Room', path: '/spisovatel' },
  { match: /\bfeed\w*\b/, name: 'feed', path: '/feed' },
] as const

const THEMES: Array<{ id: BuddyThemeId; name: string; match: RegExp }> = [
  { id: 'zlaty-soumrak', name: 'Zlatý soumrak', match: /\bzlat\w* soumrak\w*\b/ },
  { id: 'neonova-noc', name: 'Neonová noc', match: /\bneonov\w* noc\w*\b/ },
  { id: 'polarni-zare', name: 'Polární záře', match: /\bpolarni zar\w*\b/ },
  { id: 'lesni-klid', name: 'Lesní klid', match: /\blesni klid\w*\b/ },
  { id: 'cisty-den', name: 'Čistý den', match: /\bcist\w* den\b/ },
]

const done = (text: string): BuddyActionResult => ({ status: 'done', text })
const error = (text: string): BuddyActionResult => ({ status: 'error', text })

const payloadAfter = (text: string, keyword: RegExp): string => {
  const colon = text.indexOf(':')
  if (colon >= 0) return text.slice(colon + 1).trim()
  const match = keyword.exec(text)
  return match ? text.slice(match.index + match[0].length).replace(/^\s*(?:že|ze)\s+/iu, '').trim() : ''
}

export const parseBuddyMinutes = (text: string): number | null => {
  if (/[-−]\s*\d/u.test(text)) return null
  let value = normalizeIntentText(text)
  if (/\b(sekund\w*|minus|a|nebo)\b/.test(value)) return null
  value = value.replace(/\bdvacet pet\b/g, '25').replace(/\bctyricet pet\b/g, '45')
  const numbers = value.match(/\b\d+\b/g) ?? []
  let minutes: number | null = null
  if (numbers.length === 1) {
    minutes = Number(numbers[0]) * (/\bhodin\w*\b/.test(value) ? 60 : 1)
  } else if (numbers.length === 0) {
    if (/\bpul hodiny\b/.test(value)) minutes = 30
    else {
      const words: Record<string, number> = {
        jedna: 1, jednu: 1, dva: 2, dve: 2, tri: 3, ctyri: 4,
        pet: 5, deset: 10, patnact: 15, dvacet: 20, petadvacet: 25,
        tricet: 30, ctyricet: 40, petactyricet: 45, sedesat: 60, devadesat: 90,
      }
      const matches = value.split(' ').filter((word) => Object.prototype.hasOwnProperty.call(words, word))
      if (matches.length === 1) minutes = words[matches[0]] * (/\bhodin\w*\b/.test(value) ? 60 : 1)
      else if (matches.length === 0 && /\bhodinu\b/.test(value)) minutes = 60
    }
  }
  return minutes !== null && Number.isInteger(minutes) && minutes >= 5 && minutes <= 90
    ? minutes : null
}

export const parseBuddyDate = (text: string, now = new Date()): string | null => {
  const value = normalizeIntentText(text)
  const offsets: Record<string, number> = { dnes: 0, zitra: 1, pozitri: 2 }
  const date = new Date(now)
  date.setHours(12, 0, 0, 0)
  if (Object.prototype.hasOwnProperty.call(offsets, value)) {
    date.setDate(date.getDate() + offsets[value])
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim())
    if (!match) return null
    const [, year, month, day] = match.map(Number)
    date.setFullYear(year, month - 1, day)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  }
  if (!Number.isFinite(date.getTime())) return null
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Jeden adaptér na jeden rozhovor. Navigaci dodá stávající React Router. */
export const createBuddyActions = (
  navigate: (path: string) => void,
  now: () => Date = () => new Date(),
): BuddyActionExecutor => {
  let lastNoteId: string | null = null

  return async (request) => {
    const { intent, pending, signal } = request
    const raw = request.text.trim()
    const normalized = normalizeIntentText(raw)
    const check = () => {
      if (signal.aborted) throw new DOMException('Požadavek byl zastaven.', 'AbortError')
    }
    check()
    if (!raw || raw.length > 500) return error('Zadej prosím zprávu od 1 do 500 znaků.')
    if (pending && pending.intent !== intent) return error('Zadání patří k jinému požadavku. Začni prosím znovu.')

    if (!pending && !/^(?:(?:buddy|prosim)\s+)*(otevri|ukaz|zobraz|jdi|prejdi|prepni|vrat|vytvor|zapis|uloz|napis|poznamenej|pridej|naplanuj|zaloz|spust|zapni|nastartuj|zacni|nastav|pust|zmen|vyber|pouzij|chci|potrebuji|potrebuju)\b/.test(normalized)) {
      return error('Zkus prosím přímý požadavek, například vytvoř poznámku nebo otevři chat.')
    }

    switch (intent) {
      case 'create_note': {
        const content = pending ? raw : payloadAfter(raw, /\bpozn[aá]m(?:ku|ek)\b/iu)
        if (!content) return {
          status: 'question', text: 'Co mám uložit do poznámky?',
          pending: { intent, field: 'content' },
        }
        const { getQuickNotesState } = await import('@/miniapps/quick-notes/useQuickNotes')
        check()
        const previous = new Set(getQuickNotesState().notes.map((note) => note.id))
        const title = content.split('\n')[0].slice(0, 80)
        getQuickNotesState().addNote(title, content, 'Osobní')
        const created = getQuickNotesState().notes.find((note) => !previous.has(note.id) && note.content === content)
        if (!created) return error('Poznámku se nepodařilo uložit.')
        lastNoteId = created.id
        return done('Poznámku jsem uložil do Quick Notes.')
      }

      case 'create_task': {
        if (pending?.field === 'due_date') {
          const date = parseBuddyDate(raw, now())
          if (!date) return { status: 'question', text: 'Zadej dnes, zítra, pozítří nebo datum ve tvaru rok-měsíc-den.', pending }
          const { getRawStudyPlannerState } = await import('@/miniapps/study-planner/useStudyPlanner')
          check()
          const previous = new Set(getRawStudyPlannerState().tasks.map((task) => task.id))
          getRawStudyPlannerState().addTask('Obecné', pending.title, date, 'Střední')
          const created = getRawStudyPlannerState().tasks.find((task) => !previous.has(task.id) && task.topic === pending.title && task.dueDate === date)
          return created ? done(`Úkol jsem přidal do plánovače s termínem ${date}.`) : error('Úkol se nepodařilo uložit.')
        }
        const title = pending ? raw : payloadAfter(raw, /(?:^|\s)[uú]kol\b/iu)
        return title
          ? { status: 'question', text: 'Na kdy má úkol být? Napiš dnes, zítra, pozítří nebo datum jako 2026-11-15.', pending: { intent, field: 'due_date', title } }
          : { status: 'question', text: 'Jaký úkol mám přidat?', pending: { intent, field: 'title' } }
      }

      case 'start_pomodoro': {
        const minutes = parseBuddyMinutes(raw)
        if (minutes === null) return {
          status: 'question', text: 'Na kolik minut? Zadej celé číslo od 5 do 90.',
          pending: { intent, field: 'minutes' },
        }
        const { getPomodoroState } = await import('@/miniapps/pomodoro/usePomodoro')
        check()
        if (getPomodoroState().isRunning) return error('Pomodoro už běží. Nejdřív ho můžeš pozastavit v jeho aplikaci.')
        getPomodoroState().updateSettings({ work: minutes })
        getPomodoroState().switchMode('work')
        getPomodoroState().start()
        return getPomodoroState().isRunning
          ? done(`Spustil jsem soustředění na ${minutes} minut.`)
          : error('Pomodoro se nepodařilo spustit.')
      }

      case 'change_theme': {
        const matches = THEMES.filter((theme) => theme.match.test(normalized))
        if (matches.length !== 1) return {
          status: 'question', text: 'Který motiv chceš? Zlatý soumrak, Neonová noc, Polární záře, Lesní klid, nebo Čistý den?',
          pending: { intent, field: 'theme' },
        }
        const { useAppearanceStore } = await import('@/features/appearance/useAppearanceStore')
        check()
        const theme = matches[0]
        useAppearanceStore.getState().setGlobalTheme(theme.id)
        return useAppearanceStore.getState().globalThemeId === theme.id
          ? done(`Společný motiv je nyní ${theme.name}.`)
          : error('Motiv se nepodařilo změnit.')
      }

      case 'open_module': {
        let targetText = normalized
        if (/^(otevri|ukaz|zobraz) (ji|tu poznamku|posledni poznamku)$/.test(normalized)) {
          if (!lastNoteId) return {
            status: 'question', text: 'V tomto rozhovoru jsem zatím žádnou poznámku nevytvořil. Kterou aplikaci chceš otevřít?',
            pending: { intent, field: 'target' },
          }
          const { getQuickNotesState } = await import('@/miniapps/quick-notes/useQuickNotes')
          check()
          if (!getQuickNotesState().notes.some((note) => note.id === lastNoteId)) return error('Tato poznámka už není dostupná.')
          targetText = 'poznamky'
        }
        const matches = DESTINATIONS.filter((target) => target.match.test(targetText))
        if (matches.length !== 1) return {
          status: 'question', text: 'Co mám otevřít? Třeba chat, poznámky, plánovač, Pomodoro, profil nebo nastavení.',
          pending: { intent, field: 'target' },
        }
        const target = matches[0]
        const { useAppStore } = await import('@/core/store/useAppStore')
        check()
        useAppStore.getState().setActiveAppId('app' in target ? target.app : null, '/hub')
        navigate(target.path)
        return done(`Otevírám ${target.name}.`)
      }
    }
  }
    }
