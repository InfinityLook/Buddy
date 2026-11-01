import { normalizeIntentText } from './intentModel'

type Phase = 'subject' | 'study_topic' | 'project_part' | 'chat_topic' | null
type Focus = 'study' | 'project' | 'chat' | null

export interface BuddyConversationMemory {
  reply: (text: string, intent?: string | null) => string | null
  interrupt: () => void
  reset: () => void
}

const SOCIAL = new Set(['greeting', 'identity', 'help', 'thanks', 'goodbye', 'cancel'])
const ACK = /^(ano|jo|jasne|dobre|ok|ne|nevim|asi|mozna)$/
const label = (text: string): string =>
  text.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/u, '').slice(0, 80)

const subjectFrom = (text: string): string | null => {
  const subjects: Array<[RegExp, string]> = [
    [/\bbiolog\w*\b/, 'biologie'],
    [/\bmatematik\w*|\bmatik[auy]?\b/, 'matematika'],
    [/\bchem\w*\b/, 'chemie'],
    [/\bfyzik\w*\b/, 'fyzika'],
    [/\bdejepis\w*\b/, 'dějepis'],
    [/\banglict\w*\b/, 'angličtina'],
    [/\bcestin\w*\b/, 'čeština'],
  ]
  return subjects.find(([pattern]) => pattern.test(normalizeIntentText(text)))?.[1] ?? null
}

/** Výslovný zájem o povídání sám o sobě nespouští žádnou akci. */
export const wantsFreeConversation = (text: string): boolean => {
  const value = normalizeIntentText(text.split(':', 1)[0])
  if (/\bnechci (?:si )?(?:povidat|popovidat|pokecat)\b/.test(value)) return false
  return /\b(chci|muzeme|muzu|pojd|jen|radeji|radsi)\b.{0,50}\b(povidat|popovidat|pokecat)\b/.test(value)
}

const isStudyStart = (value: string): boolean =>
  /\b(zkousk\w*|pisemk\w*|test\w*|ucit|uceni)\b/.test(value)
  && /^(mam|ceka|zitra|dnes|chci|potrebuji|potrebuju|pripravuji|ucim)/.test(value)

const isProjectStart = (value: string): boolean =>
  /\b(prezentac\w*|projekt\w*|seminark\w*|seminarni praci)\b/.test(value)
  && /\b(dokoncit|dodelat|chybi|pisu|pripravuji|pripravit|rozepsan\w*)\b/.test(value)

export const startsBuddyConversation = (text: string): boolean => {
  const value = normalizeIntentText(text).replace(/^(?:(?:buddy|prosim)\s+)*/, '')
  return wantsFreeConversation(text) || isStudyStart(value) || isProjectStart(value)
}

/** Jen několik krátkých údajů v RAM jedné relace; žádné ukládání ani síť. */
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

  const reply = (text: string, intent: string | null = null): string | null => {
    const value = normalizeIntentText(text).replace(/^(?:(?:buddy|prosim)\s+)*/, '')
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

    if (wantsFreeConversation(text)) {
      focus = 'chat'
      chatTopic = null
      phase = 'chat_topic'
      return 'Jasně. O čem by sis chtěl povídat?'
    }

    if (isStudyStart(value)) {
      focus = 'study'
      subject = subjectFrom(text)
      studyTopic = null
      phase = subject ? 'study_topic' : 'subject'
      return subject ? 'Co si z předmětu „' + subject + '“ potřebuješ zopakovat?'
        : 'Z jakého předmětu se připravuješ?'
    }

    if (isProjectStart(value)) {
      focus = 'project'
      workPart = null
      phase = 'project_part'
      return 'Která část ti ještě chybí? Třeba úvod, závěr nebo zdroje.'
    }

    if (SOCIAL.has(intent ?? '')) return null

    if (phase === 'subject') {
      if (ACK.test(value)) return 'Napiš mi prosím název předmětu, třeba biologie.'
      subject = subjectFrom(text) ?? label(text.replace(/^z(?:e)?\s+/iu, ''))
      phase = 'study_topic'
      return 'Dobře, předmět „' + subject + '“. Jaká témata si potřebuješ zopakovat?'
    }

    if (phase === 'study_topic') {
      if (ACK.test(value)) return 'Které konkrétní téma si potřebuješ zopakovat?'
      studyTopic = label(text)
      phase = null
      return 'Začni tématem „' + studyTopic + '“: napiš vlastními slovy, co už víš. Potom vyber jednu věc, kterou potřebuješ doplnit.'
    }

    if (phase === 'project_part') {
      if (ACK.test(value)) return 'Kterou část práce potřebuješ dodělat?'
      workPart = label(text)
      phase = null
      if (/\b(zaver\w*|zakonceni|posledni odstavec)\b/.test(value)) {
        return 'Shrň hlavní myšlenku práce a napiš, k čemu jsi došel. Zkus nejdřív jeden krátký závěrečný odstavec.'
      }
      if (/\buvod\w*\b/.test(value)) return 'Napiš, co práce řeší a jaký má cíl. Začni dvěma nebo třemi větami.'
      if (/\b(zdroj\w*|literatur\w*)\b/.test(value)) return 'Projdeš použité zdroje a sjednotíš jejich zápis. Začni těmi, které už v práci cituješ.'
      return 'Zaměř se nejdřív na část „' + workPart + '“. Co má čtenáři sdělit?'
    }

    if (phase === 'chat_topic') {
      if (ACK.test(value)) return 'Co máš teď na mysli? Třeba školu, práci nebo svůj den.'
      chatTopic = label(text)
      phase = null
      return 'Co bys chtěl ohledně tématu „' + chatTopic + '“ probrat?'
    }

    if (focus === 'study' && studyTopic && /^(a co dal|jak dal|co potom|jaky je dalsi krok)$/.test(value)) {
      return 'U tématu „' + studyTopic + '“ si teď zkus jednu otázku nebo příklad bez nápovědy. Pak porovnej odpověď se svými materiály.'
    }

    return null
  }

  return { reply, reset, interrupt: () => { phase = null } }
}
