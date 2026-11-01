import { normalizeIntentText } from './intentModel'

type Phase = 'subject' | 'study_topic' | 'project_part' | 'chat_topic' | null
type Focus = 'study' | 'project' | 'chat' | null
type Field = 'subject' | 'topic' | 'part'
type Edit = { field: Field; text: string; chat: boolean }

export interface BuddyConversationMemory {
  reply: (text: string, intent?: string | null) => string | null
  interrupt: () => void
  reset: () => void
}

const SOCIAL = new Set(['greeting', 'identity', 'help', 'thanks', 'goodbye', 'cancel'])
const ACK = /^(ano|jo|jasne|dobre|ok|ne|nevim|asi|mozna|tohle|tamto|to prvni|to druhe|to treti)$/
const label = (text: string): string =>
  text.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/u, '').slice(0, 80)
const unaddress = (text: string): string =>
  text.normalize('NFC').trim().replace(/^(?:(?:buddy|prosím|prosim)[,\s]+)*/iu, '').replace(/[.!?]+$/u, '').trim()
const normalized = (text: string): string => normalizeIntentText(unaddress(text))

const subjectFrom = (text: string): string | null => {
  const subjects: Array<[RegExp, string]> = [
    [/\bbiolog\w*\b/, 'biologie'],
    [/\bmatematik\w*\b|\bmatik[auy]?\b/, 'matematika'],
    [/\bchem\w*\b/, 'chemie'],
    [/\bfyzik\w*\b/, 'fyzika'],
    [/\bdejepis\w*\b/, 'dějepis'],
    [/\banglict\w*\b/, 'angličtina'],
    [/\bcestin\w*\b/, 'čeština'],
  ]
  return subjects.find(([pattern]) => pattern.test(normalized(text)))?.[1] ?? null
}

export const wantsFreeConversation = (text: string): boolean => {
  const value = normalized(text.split(':', 1)[0])
  if (/\bnechci (?:si )?(?:povidat|popovidat|pokecat)\b/.test(value)) return false
  return /\b(chci|muzeme|muzu|pojd|jen|radeji|radsi)\b.{0,50}\b(povidat|popovidat|pokecat)\b/.test(value)
}

const isStudyStart = (value: string): boolean =>
  /\b(zkousk\w*|pisemk\w*|test\w*|ucit|uceni|ucim)\b/.test(value)
  && /^(mam|ceka|zitra|dnes|chci|potrebuji|potrebuju|pripravuji|ucim)\b/.test(value)

const isProjectStart = (value: string): boolean =>
  /\b(prezentac\w*|projekt\w*|seminark\w*|seminarni praci)\b/.test(value)
  && /\b(dokoncit|dodelat|chybi|pisu|pripravuji|pripravit|rozepsan\w*)\b/.test(value)

const FIELD = /^(?:(změň|zmen|oprav|přepni|prepni)\s+)?(předmět|predmet|téma rozhovoru|tema rozhovoru|téma|tema|část práce|cast prace|část|cast)(?=\s|[:,]|$)(?:\s+(je|na))?\s*([:,])?\s*(.*)$/iu
const SWITCH = /^(?:(?:teď|ted|nyní|nyni)\s+)?(?:řešme|resme|proberme|pojďme probrat|pojdme probrat|chci řešit|chci resit|chci probrat)(?:\s+|[:,]\s*|$)(.*)$/iu
const CORRECTION = /^(?:vlastně|vlastne|oprava|myslel jsem|myslela jsem|raději|radeji|radši|radsi)(?:\s*[:,]\s*|\s+|$)/iu
const OTHER_TOPIC = /^(?:(?:ted|nyni) )?(?:neco jineho|jine tema|zmenme tema)$/
const NEGATIVE_CORRECTION = /^(?:ne|nemyslel jsem|nemyslela jsem)\b.+\bale\b/

const fieldChange = (text: string): Edit | null => {
  const match = FIELD.exec(unaddress(text))
  if (!match) return null
  if (!match[1] && match[3]?.toLowerCase() !== 'je' && match[4] !== ':') return null
  const field = normalized(match[2])
  return {
    field: field.startsWith('predmet') ? 'subject' : field.startsWith('cast') ? 'part' : 'topic',
    text: match[5],
    chat: field.includes('rozhovoru'),
  }
}

const partChoice = (text: string): string | null => {
  const choice = /^(?:to )?(prvni|druhe|treti)$/.exec(normalized(text))
  return choice ? ['úvod', 'závěr', 'zdroje'][['prvni', 'druhe', 'treti'].indexOf(choice[1])] : null
}

/** Tyto ovládací věty mění pouze kontext rozhovoru. */
export const isConversationControl = (text: string): boolean => {
  const raw = unaddress(text)
  const value = normalized(raw)
  return fieldChange(raw) !== null || SWITCH.test(raw) || CORRECTION.test(raw)
    || OTHER_TOPIC.test(value) || NEGATIVE_CORRECTION.test(value)
}

export const startsBuddyConversation = (text: string): boolean => {
  const value = normalized(text)
  return isConversationControl(text) || wantsFreeConversation(text)
    || isStudyStart(value) || isProjectStart(value)
}

/** Omezený stav v RAM jedné relace; žádné ukládání ani síť. */
export const createBuddyConversationMemory = (): BuddyConversationMemory => {
  let phase: Phase = null
  let focus: Focus = null
  let subject: string | null = null
  let studyTopic: string | null = null
  let workPart: string | null = null
  let chatTopic: string | null = null

  const reset = () => {
    phase = null
    focus = null
    subject = null
    studyTopic = null
    workPart = null
    chatTopic = null
  }

  const beginStudy = (nextSubject: string | null): string => {
    reset()
    focus = 'study'
    subject = nextSubject
    phase = subject ? 'study_topic' : 'subject'
    return subject ? 'Co si z předmětu „' + subject + '“ potřebuješ zopakovat?'
      : 'Z jakého předmětu se připravuješ?'
  }

  const beginProject = (): string => {
    reset()
    focus = 'project'
    phase = 'project_part'
    return 'Která část ti ještě chybí? Třeba úvod, závěr nebo zdroje.'
  }

  const beginChat = (topic: string | null = null): string => {
    reset()
    focus = 'chat'
    chatTopic = topic
    phase = topic ? null : 'chat_topic'
    return topic ? 'Co bys chtěl ohledně tématu „' + topic + '“ probrat?'
      : 'Jasně. O čem by sis chtěl povídat?'
  }

  const validLabel = (text: string): string | null => {
    const result = label(text)
    const value = normalized(result)
    return value && !ACK.test(value) ? result : null
  }

  const setSubject = (text: string): string => {
    const next = validLabel(text.replace(/^z(?:e)?\s+/iu, ''))
    if (!next) {
      phase = 'subject'
      return 'Napiš mi prosím název předmětu, třeba biologie.'
    }
    return beginStudy(subjectFrom(next) ?? next)
  }

  const setStudyTopic = (text: string): string => {
    const next = validLabel(text)
    if (!next) {
      phase = 'study_topic'
      return 'Které konkrétní téma si potřebuješ zopakovat?'
    }
    studyTopic = next
    phase = null
    return 'Začni tématem „' + studyTopic + '“: napiš vlastními slovy, co už víš. Potom vyber jednu věc, kterou potřebuješ doplnit.'
  }

  const setPart = (text: string): string => {
    const next = partChoice(text) ?? validLabel(text)
    if (!next) {
      phase = 'project_part'
      return 'Kterou část práce potřebuješ dodělat?'
    }
    workPart = next
    phase = null
    const part = normalized(next)
    if (/\b(zaver\w*|zakonceni|posledni odstavec)\b/.test(part)) {
      return 'Shrň hlavní myšlenku práce a napiš, k čemu jsi došel. Zkus nejdřív jeden krátký závěrečný odstavec.'
    }
    if (/\buvod\w*\b/.test(part)) return 'Napiš, co práce řeší a jaký má cíl. Začni dvěma nebo třemi větami.'
    if (/\b(zdroj\w*|literatur\w*)\b/.test(part)) return 'Projdeš použité zdroje a sjednotíš jejich zápis. Začni těmi, které už v práci cituješ.'
    return 'Zaměř se nejdřív na část „' + workPart + '“. Co má čtenáři sdělit?'
  }

  const applyEdit = (edit: Edit): string => {
    if (edit.field === 'subject') return setSubject(edit.text)
    if (edit.field === 'part') {
      if (focus !== 'project') beginProject()
      return setPart(edit.text)
    }
    if (focus === 'study' && !edit.chat) return setStudyTopic(edit.text)
    return beginChat(validLabel(edit.text))
  }

  const reply = (text: string, intent: string | null = null): string | null => {
    const raw = unaddress(text)
    const value = normalized(raw)
    if (!value || text.length > 500) return null

    if (/^(co jsme resili|o cem jsme mluvili|o cem se bavime|co ted resime)$/.test(value)) {
      if (focus === 'study') {
        if (!subject) {
          phase = 'subject'
          return 'Řešíme přípravu na učení. Z jakého předmětu?'
        }
        return studyTopic
          ? 'Řešíme učení. Předmět: „' + subject + '“, téma: „' + studyTopic + '“.'
          : 'Řešíme přípravu na předmět „' + subject + '“.'
      }
      if (focus === 'project') {
        if (!workPart) phase = 'project_part'
        return workPart ? 'Řešíme práci nebo prezentaci, konkrétně část „' + workPart + '“.'
          : 'Řešíme dokončení práce nebo prezentace. Která část ti ještě chybí?'
      }
      if (focus === 'chat' && chatTopic) return 'Mluvili jsme o tématu „' + chatTopic + '“.'
      return 'V tomto rozhovoru zatím nemám žádné upřesněné téma.'
    }

    if (/^(jaky predmet resime|z ceho se ucim|jaky predmet jsem zminil)$/.test(value)) {
      return subject ? 'Zmínil jsi předmět „' + subject + '“.'
        : 'Předmět jsi mi v tomto rozhovoru ještě neřekl.'
    }

    const edit = fieldChange(raw)
    if (edit) return applyEdit(edit)

    const change = SWITCH.exec(raw)
    if (change || OTHER_TOPIC.test(value)) {
      const target = validLabel(change?.[1] ?? '')
      const targetValue = normalized(target ?? '')
      if (!target || OTHER_TOPIC.test(targetValue)) return beginChat()
      const nextSubject = subjectFrom(target)
      if (nextSubject || /\b(uceni|ucit|zkousk\w*|test\w*)\b/.test(targetValue)) return beginStudy(nextSubject)
      if (/\b(prezentac\w*|projekt\w*|seminark\w*|praci)\b/.test(targetValue)) return beginProject()
      return beginChat(target)
    }

    if (CORRECTION.test(raw) || NEGATIVE_CORRECTION.test(value)) {
      const tail = NEGATIVE_CORRECTION.test(value)
        ? raw.split(/\bale\b/iu).at(-1) ?? ''
        : raw.replace(CORRECTION, '').trim()
      if (focus === 'project' && partChoice(tail)) return setPart(tail)
      const target = validLabel(tail)
      const targetValue = normalized(tail)
      if (!target || /^(nechci|otevri|vytvor|pridej|spust|smaz|odesli|posli)\b/.test(targetValue)) {
        return 'Co chceš opravit? Napiš třeba „Předmět je chemie“ nebo „Téma je buňka“.'
      }
      const named = fieldChange(tail)
      if (named) return applyEdit(named)
      if (focus === 'study') {
        if (subjectFrom(target) || /^z(?:e)?\s+/iu.test(tail) || phase === 'subject') return setSubject(tail)
        if (subject) return setStudyTopic(target)
      }
      if (focus === 'project') return setPart(target)
      if (focus === 'chat') return beginChat(target)
      return 'Který údaj chceš opravit? Napiš třeba „Předmět je chemie“.'
    }

    if (wantsFreeConversation(raw)) return beginChat()
    if (isStudyStart(value)) return beginStudy(subjectFrom(raw))
    if (isProjectStart(value)) return beginProject()
    if (phase === 'project_part' && partChoice(raw)) return setPart(raw)
    if (SOCIAL.has(intent ?? '')) return null

    if (phase === 'subject') return setSubject(raw)
    if (phase === 'study_topic') return setStudyTopic(raw)
    if (phase === 'project_part') return setPart(raw)
    if (phase === 'chat_topic') return beginChat(validLabel(raw))

    if (focus === 'study' && studyTopic && /^(a co dal|jak dal|co potom|jaky je dalsi krok)$/.test(value)) {
      return 'U tématu „' + studyTopic + '“ si teď zkus jednu otázku nebo příklad bez nápovědy. Pak porovnej odpověď se svými materiály.'
    }
    return null
  }

  return { reply, reset, interrupt: () => { phase = null } }
          }
