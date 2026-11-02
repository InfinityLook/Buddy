import { normalizeIntentText, predictIntent } from './intentModel'
import type { IntentModel } from './intentModel'
import type { BuddyTaskDraft } from './taskParser'
import { createBuddyConversationMemory, isConversationControl, startsBuddyConversation, wantsFreeConversation } from './conversationMemory'

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
  taskTitle?: string
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

const NOTE_PREFIX = 'Vytvoř poznámku: '
const MAX_SAVED_REPLY_LENGTH = 500 - NOTE_PREFIX.length
const SAVE_LAST_REPLY = new Set([
  'uloz posledni odpoved do poznamky',
  'uloz tvoji posledni odpoved do poznamky',
  'uloz tvou posledni odpoved do poznamky',
  'uloz posledni odpoved jako poznamku',
  'zapis posledni odpoved do poznamky',
  'vytvor poznamku z posledni odpovedi',
  'vytvor poznamku z tve posledni odpovedi',
])

const TASK_FROM_TOPIC = [
  'pridej ukol z posledniho tematu',
  'vytvor ukol z posledniho tematu',
  'pridej ukol k tematu rozhovoru',
  'vytvor ukol k tematu rozhovoru',
  'pridej ukol k tomu tematu',
  'vytvor ukol k tomu tematu',
  'pridej k tomu ukol',
  'vytvor k tomu ukol',
] as const

const NEW_CONVERSATION = new Set([
  'novy rozhovor', 'zacni novy rozhovor',
  'zapomen tento rozhovor', 'zapomen nas rozhovor',
])

const isExplicitActionRequest = (text: string): boolean => {
  const rawHead = text.split(':', 1)[0]
  const head = normalizeIntentText(rawHead)
    .replace(/^(?:(?:buddy|prosim)\s+)*/, '')
  if (isConversationControl(rawHead)) return false
  if (/^(otevri|ukaz|zobraz|jdi|prejdi|prepni|vrat|vytvor|zapis|uloz|napis|poznamenej|pridej|naplanuj|zaloz|spust|zapni|nastartuj|zacni|nastav|pust|zmen|vyber|pouzij)\b/.test(head)) return true
  return /^(chci|potrebuji|potrebuju)\b/.test(head)
    && !startsBuddyConversation(rawHead)
}

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
  const memory = createBuddyConversationMemory()
  let lastReply: string | null = null
  let replyTooLong = false

  // Uchováváme jen konverzační odpověď, nejvýše do limitu jedné poznámky.
  const remember = (answer: string): string => {
    const content = answer.trim()
    replyTooLong = content.length > MAX_SAVED_REPLY_LENGTH
    lastReply = replyTooLong ? null : content || null
    return answer
  }

  const reset = () => {
    inFlight?.abort()
    inFlight = null
    pending = null
    memory.reset()
    lastReply = null
    replyTooLong = false
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

    if (NEW_CONVERSATION.has(control)) {
      reset()
      return 'Začínáme nový rozhovor. Co máš na mysli?'
    }

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
      return remember(executeAction
        ? 'Pomůžu ti otevřít moduly, zapsat poznámku nebo úkol, spustit Pomodoro a změnit motiv. Zkus také Přidej úkol z posledního tématu nebo Ulož poslední odpověď do poznámky. Rozpracované zadání zrušíš slovy zruš to.'
        : 'Můžeme si krátce popovídat. Rozpoznávám také příkazy pro poznámky, úkoly, Pomodoro a vzhled; jejich provedení závisí na dostupném ovládání aplikace.')
    }

    // Při doplňování jsou další zprávy údaji k původnímu požadavku.
    let intent: string | null = pending?.intent ?? null
    let actionText = raw
    let taskTitle: string | undefined

    if (!pending) {
      if (isBlockedCommand(raw)) {
        if (wantsFreeConversation(raw) || isConversationControl(raw)) {
          return remember(memory.reply(raw) ?? 'Jasně. O čem by sis chtěl povídat?')
        }
        return 'Rozumím. Podle této zprávy nebudu spouštět žádnou akci.'
      }

      if (SAVE_LAST_REPLY.has(control)) {
        if (!lastReply) {
          return replyTooLong
            ? 'Poslední odpověď je pro tento příkaz příliš dlouhá. Zkopíruj a zkrať ji prosím.'
            : 'Zatím nemám konverzační odpověď k uložení. Nejdřív si něco probereme.'
        }
        intent = 'create_note'
        actionText = NOTE_PREFIX + lastReply
      } else if (TASK_FROM_TOPIC.some((phrase) => control === phrase || control.startsWith(phrase + ' '))) {
        taskTitle = memory.getTaskTitle?.() ?? undefined
        if (!taskTitle) {
          return 'Nejdřív mi upřesni téma nebo část práce, ze které mám úkol vytvořit. Potom příkaz zopakuj.'
        }
        intent = 'create_task'
      } else {
        // Obsah za dvojtečkou nemění záměr přímého příkazu.
        const head = raw.split(':', 1)[0]
        const intentText = raw.includes(':') && isExplicitActionRequest(head) ? head : raw
        intent = predictIntent(model, intentText).intent

        if (!isExplicitActionRequest(raw)) {
          const answer = memory.reply(raw, intent)
          if (answer !== null) return remember(answer)
        }

        switch (intent) {
          case 'greeting':
            return remember('Ahoj, jsem tady. Co spolu dnes vyřídíme?')

          case 'identity':
            return remember('Jsem Buddy, tvůj pomocník v aplikaci. Mým úkolem je usnadnit ti její používání.')

          case 'help':
            return remember('Zkus třeba Vytvoř poznámku, Otevři chat nebo Přidej úkol z posledního tématu. Když budou chybět údaje, zeptám se. Konverzační odpověď uložíš příkazem Ulož poslední odpověď do poznámky. Rozpracované zadání zrušíš slovy zruš to.')

          case 'thanks':
            return remember('Rádo se stalo. S čím dalším ti pomůžu?')

          case 'goodbye':
            reset()
            return 'Měj se hezky. Až budeš něco potřebovat, zase se ozvi.'

          case 'small_talk':
            if (/unaven|povzbud/.test(normalized)) {
              return remember('Můžeme to vzít po malých krocích. Jakou jednu věc chceš teď vyřešit?')
            }

            if (/mam se dobre|dobrou naladu|zvladl/.test(normalized)) {
              return remember('To rád slyším. Chceš na něco navázat, nebo si jen chvíli psát?')
            }

            return remember('Jsem připravený pomoct a můžeme si i krátce popovídat. Jak se dnes daří tobě?')

          case 'cancel':
            reset()
            return 'Dobře, začneme od začátku. Co potřebuješ?'
        }
      }
    }

    if (!isActionIntent(intent)) return FALLBACK

    if (!executeAction) {
      return 'Tuto akci teď nemám dostupnou. Můžeme si zatím psát.'
    }

    memory.interrupt()
    const controller = new AbortController()
    inFlight = controller

    try {
      const result = await executeAction({
        intent,
        text: actionText,
        pending,
        signal: controller.signal,
        ...(taskTitle !== undefined ? { taskTitle } : {}),
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
