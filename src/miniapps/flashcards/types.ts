export interface Flashcard {
  id: string
  question: string
  answer: string
  // Balíček, do kterého kartička patří (předmět, okruh…). Umožňuje učit
  // se jen část sady místo všeho najednou.
  deck: string
  // Označení "tuhle umím". Dá se kdykoli vzít zpět.
  known: boolean
  // Nastaví se, když uživatel kartičku poprvé označí za naučenou, a už
  // se nikdy nemaže. Díky tomu se XP za jednu kartičku připíše jen
  // jednou a nejde ho farmit přepínáním tam a zpět.
  learnedAt: string | null
}

export const DEFAULT_DECK = 'Obecné'

// Pseudobalíček pro přepínač — neodpovídá žádné hodnotě v datech
export const ALL_DECKS = 'Vše'

// Nové kartičky se zakládají prázdné; ukázkový obsah tu nikdy nebyl
// k ničemu — viz DEMO_CARD_IDS níž.
export const INITIAL_CARDS: Flashcard[] = []

// Ukázkové kartičky o Reactu a JavaScriptu ležely v úložišti i studentům,
// kterým programování nic neříká, a nešly smazat (mazání chybělo).
// Poznáme je podle id i otázky zároveň, ať omylem nezahodíme vlastní
// kartičku, která se náhodou trefí do stejného id.
export const DEMO_CARD_IDS = ['1', '2', '3']
export const DEMO_CARD_QUESTIONS = [
  'Co je to React Hook?',
  'Jaký je rozdíl mezi LET a CONST?',
  'Co znamená zkratka DOM?',
]
