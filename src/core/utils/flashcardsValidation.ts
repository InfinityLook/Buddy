import * as v from 'valibot'
import { DEFAULT_DECK, Flashcard, MAX_KRABICE, MIN_KRABICE } from '@/miniapps/flashcards/types'

// ==========================================
// Ověření uložených kartiček Flashcards — appka dřív spoléhala jen na
// ruční normalizeCard() bez jakékoli kontroly typů (card.deck?.trim()
// by na poškozeném/netextovém poli spadlo a strhlo by s sebou celý
// seznam kartiček). Stejný "poškozená položka se tiše vyřadí, ne celý
// seznam" vzor jako Kalendář/Rozvrh/Known.
// ==========================================

export const FlashcardSchema = v.object({
  id: v.string(),
  question: v.string(),
  answer: v.string(),
  deck: v.optional(v.string(), DEFAULT_DECK),
  known: v.optional(v.boolean(), false),
  learnedAt: v.optional(v.nullable(v.string()), null),
  // Bez pipe na rozsah — poškozené/mimo rozsah číslo appka ořízne sama
  // (stejně jako vypocitejDalsiTermin), ne že by to zahodilo celou
  // kartičku jen pro špatnou krabici.
  box: v.optional(v.number(), MIN_KRABICE),
  dueAt: v.optional(v.nullable(v.string()), null),
})

export const FlashcardsDataSchema = v.object({
  cards: v.optional(v.array(v.unknown()), []),
})

const sanitizujKartu = (raw: unknown): Flashcard | null => {
  const jedna = v.safeParse(FlashcardSchema, raw)
  if (!jedna.success) return null
  const { id, question, answer, deck, known, learnedAt, dueAt, box } = jedna.output

  // Prázdná otázka/odpověď znamená poškozenou kartičku bez obsahu —
  // appka ji tiše vyřadí, ne že by ukázala prázdnou kartu k učení.
  if (!question.trim() || !answer.trim()) return null

  return {
    id,
    question,
    answer,
    deck: deck.trim() || DEFAULT_DECK,
    known,
    learnedAt,
    box: Math.min(Math.max(Math.round(box), MIN_KRABICE), MAX_KRABICE),
    dueAt,
  }
}

export const validateFlashcardsData = (data: unknown) => {
  const result = v.safeParse(FlashcardsDataSchema, data)
  if (!result.success) {
    console.warn('Data Flashcards neodpovídají schématu:', result.issues)
    return { success: false as const, issues: result.issues }
  }

  const cards = result.output.cards
    .map(sanitizujKartu)
    .filter((c): c is Flashcard => c !== null)

  return { success: true as const, data: { cards } }
}
