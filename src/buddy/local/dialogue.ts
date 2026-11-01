import { normalizeIntentText, predictIntent } from './intentModel'
import type { IntentModel } from './intentModel'
import type { BuddyTaskDraft } from './taskParser'

export type BuddyActionIntent =
  | 'open_module' | 'create_note' | 'create_task'
  | 'start_pomodoro' | 'change_theme'

export type BuddyPendingAction =
  | { intent: 'open_module'; field: 'target' }
  | { intent: 'create_note'; field: 'content' }
  | { intent: 'create_task'; field: 'title'; draft?: BuddyTaskDraft }
  | {
      intent: 'create_task'
      field: 'due_date'
      title: string
      draft?: BuddyTaskDraft
    }
  | {
      intent: 'create_task'
      field: 'priority'
      title: string
      draft: BuddyTaskDraft
    }
  | { intent: 'start_pomodoro'; field: 'minutes' }
  | { intent: 'change_theme'; field: 'theme' }

export interface BuddyActionRequest {
  intent: BuddyActionIntent
  text: string
  pending: BuddyPendingAction | null
  signal: AbortSignal
}

export type BuddyActionResult =
  | { status: 'done'; text: string }
  | { status: 'error'; text: string }
  | { status: 'question'; text: string; pending: BuddyPendingAction }

export type BuddyActionExecutor = (
  request: BuddyActionRequest,
) => BuddyActionResult | Promise<BuddyActionResult>

export interface BuddyDialogue {
  reply: (text: string) => Promise<string>
  reset: () => void
}

const ACTIONS: readonly string[] = [
  'open_module', 'create_note', 'create_task',
  'start_pomodoro', 'change_theme',
]

const isActionIntent = (value: string | null): value is BuddyActionIntent =>
  value !== null && ACTIONS.includes(value)

const CANCEL_PHRASES = new Set([
  'zrus to', 'zrusit', 'storno', 'nech to byt', 'nic nedelej',
  'rozmyslel jsem si to', 'uz to nechci', 'prestan s tim',
  'zrus rozpracovany pozadavek', 'zrus zadavani', 'vratme se zp atky',
  'ted to nechame', 'zrus rozpracovane zadani',
  'uz v tom nechci pokracovat', 'cele to stornuj',
  'zrus aktualni pozadavek', 'stornuj zadani', 'nechme to byt',
  'rozmyslela jsem si to', 'zrus celou akci', 'uz nechci pokracovat',
  'ukonci zadavani', 'zahod rozpracovane zadani', 'radeji to zrus',
  'odvolej muj pozadavek', 'prerus tento pozadavek', 'zrus posledni zadani',
  'zrus aktualni zadani', 'prerus muj pozadavek', 'stornuj to',
  'vratme se zpatky',
])

const FALLBACK =
  'Tomuhle zatím nerozumím dost jistě. Zkus to prosím kratší větou nebo napiš co umíš.'

const isBlockedCommand = (text: string): boolean => {
  // Text za dvojtečkou může být obsah poznámky, nikoli další pokyn.
  const head = normalizeIntentText(text.split(':', 1)[0])
  const negative =
    /\b(nechci|neotevir\w*|neotvir\w*|nespoust\w*|neuklad\w*|nepridav\w*|nemen|nevytvar\w*|nepis|nepouziv\w*)\b/
  const explanation =
    /^(co znamena|jak funguje prikaz|kdyz reknu|jen vysvetli|vysvetli mi)\b/
  const multiple =
    /\b(a pak|a potom|potom|pak) (otevri|spust|zapis|pridej|smaz|zmen)\b/

  return negative.test(head) || explanation.test(head) || multiple.test(head)
}

/** Každý rozhovor má vlastní krátkodobý stav. */
export const createBuddyDialogue = (
  model: IntentModel,
  executeAction?: BuddyActionExecutor,
): BuddyDialogue => {
  let pending: BuddyPendingAction | null = null
  let inFlight: AbortController | null = null

  const reset = () => {
    inFlight?.abort()
    inFlight = null
    pending = null
  }

  const reply = async (text: string): Promise<string> => {
    const raw = text.trim()

    if (!raw) return 'Napiš mi prosím zprávu nebo použij mikrofon.'
    if (raw.length > 500) return 'Zkus prosím zprávu do 500 znaků.'

    const normalized = normalizeIntentText(raw)
    const control = normalized
      .replace(/\bprosim\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(?:buddy\s+)+|(?:\s+buddy)+$/g, '')
      .trim()

    if (CANCEL_PHRASES.has(control)) {
      const hadRequest = pending !== null || inFlight !== null
      reset()

      return hadRequest
        ? 'Rozpracované zadání jsem zrušil.'
        : 'Dobře. Žádné rozpracované zadání tu není.'
    }

    if (inFlight) {
      return 'Ještě zpracovávám předchozí požadavek. Chvilku prosím.'
    }

    if (['co umis', 'napoveda', 'pomoc'].includes(control)) {
      return executeAction
        ? 'Pomůžu ti otevřít moduly, zapsat poznámku nebo úkol, spustit Pomodoro a změnit motiv. Rozpracované zadání zrušíš slovy zruš to.'
        : 'Můžeme si krátce popovídat. Rozpoznávám také příkazy pro poznámky, úkoly, Pomodoro a vzhled; jejich provedení závisí na dostupném ovládání aplikace.'
    }

    // Při doplňování jsou další zprávy údaji k původnímu požadavku.
    let intent: string | null = pending?.intent ?? null

    if (!pending) {
      if (isBlockedCommand(raw)) {
        return 'Rozumím. Podle této zprávy nebudu spouštět žádnou akci.'
      }

      intent = predictIntent(model, raw).intent

      switch (intent) {
        case 'greeting':
          return 'Ahoj, jsem tady. Co spolu dnes vyřídíme?'

        case 'identity':
          return 'Jsem Buddy, tvůj pomocník v aplikaci. Mým úkolem je usnadnit ti její používání.'

        case 'help':
          return 'Zkus třeba vytvoř poznámku nebo otevři chat. Když budou chybět údaje, zeptám se. Rozpracované zadání zrušíš slovy zruš to.'

        case 'thanks':
          return 'Rádo se stalo. S čím dalším ti pomůžu?'

        case 'goodbye':
          reset()
          return 'Měj se hezky. Až budeš něco potřebovat, zase se ozvi.'

        case 'small_talk':
          if (/unaven|povzbud/.test(normalized)) {
            return 'Můžeme to vzít po malých krocích. Jakou jednu věc chceš teď vyřešit?'
          }

          if (/mam se dobre|dobrou naladu|zvladl/.test(normalized)) {
            return 'To rád slyším. Chceš na něco navázat, nebo si jen chvíli psát?'
          }

          return 'Jsem připravený pomoct a můžeme si i krátce popovídat. Jak se dnes daří tobě?'

        case 'cancel':
          reset()
          return 'Dobře, začneme od začátku. Co potřebuješ?'
      }
    }

    if (!isActionIntent(intent)) return FALLBACK

    if (!executeAction) {
      return 'Tuto akci teď nemám dostupnou. Můžeme si zatím psát.'
    }

    const controller = new AbortController()
    inFlight = controller

    try {
      const result = await executeAction({
        intent,
        text: raw,
        pending,
        signal: controller.signal,
      })

      if (controller.signal.aborted) {
        throw new DOMException('Požadavek byl zastaven.', 'AbortError')
      }

      if (!result.text.trim()) {
        throw new Error('Chybí odpověď po zpracování požadavku.')
      }

      if (result.status === 'question' && result.pending.intent !== intent) {
        throw new Error('Doplňující otázka patří k jinému požadavku.')
      }

      pending = result.status === 'question' ? result.pending : null

      return result.text
    } catch {
      if (controller.signal.aborted) {
        throw new DOMException('Požadavek byl zastaven.', 'AbortError')
      }

      pending = null
      return 'Požadavek se nepodařilo dokončit. Zkus to prosím znovu.'
    } finally {
      if (inFlight === controller) inFlight = null
    }
  }

  return { reply, reset }
        }
