import { normalizeIntentText } from './intentModel'
import { parseBuddyDate, parseBuddyTask } from './taskParser'
import type { BuddyTaskDraft } from './taskParser'

type TaskDraftEdit =
  | { status: 'changed'; draft: BuddyTaskDraft; text: string }
  | { status: 'invalid'; text: string }

const TITLE = /^(?:(?:změň|zmen|oprav)\s+(?:název|nazev)(?:\s+[uú]kolu)?\s+na(?:\s+|$)|(?:přejmenuj|prejmenuj)(?:\s+[uú]kol)?\s+na(?:\s+|$)|(?:název|nazev)(?:\s+[uú]kolu)?(?:\s+je(?:\s+|$)|\s*:\s*))(.*)$/isu
const DATE = /^(?:(?:změň|zmen|oprav|posuň|posun)\s+(?:termín|termin)(?:\s+[uú]kolu)?\s+na(?:\s+|$)|(?:termín|termin)(?:\s+[uú]kolu)?(?:\s+je(?:\s+|$)|\s*:\s*))(.*)$/isu
const PRIORITY = /^(?:(?:změň|zmen|nastav|oprav)\s+prioritu(?:\s+[uú]kolu)?\s+na(?:\s+|$)|dej\s+(?:tomu|[uú]kolu)\s+|priorita(?:\s+[uú]kolu)?(?:\s+je(?:\s+|$)|\s*:\s*))(.*)$/isu

/** Opraví pouze rozpracovaný úkol; nic neukládá ani nespouští. */
export const editBuddyTaskDraft = (
  text: string,
  draft: BuddyTaskDraft,
  now = new Date(),
): TaskDraftEdit | null => {
  const raw = text.normalize('NFC').trim()
    .replace(/^(?:(?:buddy|prosím|prosim)[,\s]+)+/iu, '')

  const title = TITLE.exec(raw)
  if (title) {
    // Název je doslovný text, včetně případných slov o datu či prioritě.
    const value = title[1].trim()
    if (!value || value.length > 500) {
      return {
        status: 'invalid',
        text: 'Napiš nový název, například Změň název na Příprava na test.',
      }
    }
    return {
      status: 'changed',
      draft: { ...draft, title: value },
      text: 'Název jsem změnil na „' + value + '“.',
    }
  }

  const priority = PRIORITY.exec(raw)
  if (priority) {
    const value = priority[1].trim()
      .replace(/[.!?]+$/u, '')
      .replace(/\s*,?\s*(?:pros[ií]m|buddy)$/iu, '')
      .replace(/\s+priorit[au]\s*[.!?]*$/iu, '')

    const parsed = parseBuddyTask(value, now, 'priority')
    if (!parsed.priority || parsed.hasDate) {
      return {
        status: 'invalid',
        text: 'Zadej jednu prioritu: vysoká, střední, nebo nízká.',
      }
    }
    return {
      status: 'changed',
      draft: { ...draft, priority: parsed.priority },
      text: 'Prioritu jsem změnil na ' + parsed.priority.toLowerCase() + '.',
    }
  }

  const date = DATE.exec(raw)
  const correction = /^(?:vlastně|vlastne)(?:\s*[:,]\s*|\s+)(.*)$/isu.exec(raw)
  const correctionIsDate = correction && /^(na|do|v|ve|za|dnes|dnesek|zitra|zitrek|pozitri|pozitrek|pristi|pondeli|utery|streda|stredu|stredy|ctvrtek|ctvrtka|patek|patku|sobota|sobotu|soboty|nedele|nedeli|\d{4})\b/.test(normalizeIntentText(correction[1]))
  const dateText = date ? date[1] : correctionIsDate ? correction[1] : null

  if (dateText !== null) {
    const dueDate = parseBuddyDate(dateText, now)
    if (!dueDate) {
      return {
        status: 'invalid',
        text: 'Termín jsem nezměnil. Uveď jeden den, třeba Změň termín na pátek nebo Termín: 2026-11-15.',
      }
    }
    return {
      status: 'changed',
      draft: { ...draft, dueDate },
      text: 'Termín jsem změnil na ' + dueDate + '.',
    }
  }

  return null
      }
