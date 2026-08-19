import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import {
  ALL_DECKS,
  DEFAULT_DECK,
  DEMO_CARD_IDS,
  DEMO_CARD_QUESTIONS,
  Flashcard,
  INITIAL_CARDS,
} from './types'

const XP_PER_NEW_CARD = 5
// Za naučení se dává míň než za vytvoření — je to jedno klepnutí,
// ne příprava obsahu.
const XP_PER_LEARNED_CARD = 3

interface FlashcardsState {
  cards: Flashcard[]
  addCard: (question: string, answer: string, deck: string) => void
  updateCard: (id: string, question: string, answer: string, deck: string) => void
  deleteCard: (id: string) => void
  setKnown: (id: string, known: boolean) => void
  resetDeckProgress: (deck: string) => void
}

// Doplní pole, která starší uložené kartičky ještě nemají. Bez toho by
// se po aktualizaci tvářily jako kartičky bez balíčku a filtr by je
// nikde nenašel.
const normalizeCard = (card: Flashcard): Flashcard => ({
  ...card,
  deck: card.deck?.trim() || DEFAULT_DECK,
  known: card.known ?? false,
  learnedAt: card.learnedAt ?? null,
})

const isDemoCard = (card: Flashcard) =>
  DEMO_CARD_IDS.includes(card.id) && DEMO_CARD_QUESTIONS.includes(card.question)

const useFlashcardsStore = create<FlashcardsState>()(
  persist(
    (set) => ({
      cards: INITIAL_CARDS,

      addCard: (question, answer, deck) => {
        if (!question.trim() || !answer.trim()) return

        const newCard: Flashcard = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          question: question.trim(),
          answer: answer.trim(),
          deck: deck.trim() || DEFAULT_DECK,
          known: false,
          learnedAt: null,
        }

        set((state) => ({ cards: [...state.cards, newCard] }))
        useGamificationStore.getState().recordAction('flashcard', XP_PER_NEW_CARD)
      },

      updateCard: (id, question, answer, deck) => {
        if (!question.trim() || !answer.trim()) return

        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === id
              ? {
                  ...card,
                  question: question.trim(),
                  answer: answer.trim(),
                  deck: deck.trim() || DEFAULT_DECK,
                }
              : card
          ),
        }))
      },

      deleteCard: (id) =>
        set((state) => ({ cards: state.cards.filter((card) => card.id !== id) })),

      setKnown: (id, known) => {
        let firstTime = false

        set((state) => ({
          cards: state.cards.map((card) => {
            if (card.id !== id) return card
            if (known && !card.learnedAt) firstTime = true

            return {
              ...card,
              known,
              // learnedAt se jednou nastaví a už zůstane
              learnedAt: card.learnedAt ?? (known ? new Date().toISOString() : null),
            }
          }),
        }))

        // Schválně holé addXp, ne recordAction: počítadlo 'flashcard' hlídá
        // odznak za VYTVOŘENÍ deseti kartiček. Kdyby ho zvyšovalo i učení,
        // odznak by šel získat bez jediné vlastní kartičky.
        if (firstTime) useGamificationStore.getState().addXp(XP_PER_LEARNED_CARD)
      },

      // Vrátí celý balíček zpátky mezi neznámé, ať se dá projít znovu.
      // learnedAt zůstává — XP se za druhé kolo znovu nedává.
      resetDeckProgress: (deck) =>
        set((state) => ({
          cards: state.cards.map((card) =>
            deck === ALL_DECKS || card.deck === deck ? { ...card, known: false } : card
          ),
        })),
    }),
    {
      name: 'schoolbuddy-flashcards-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const saved = persisted as Partial<FlashcardsState> | undefined
        const cards = (saved?.cards ?? [])
          .filter((card) => !isDemoCard(card))
          .map(normalizeCard)
        return { ...current, ...saved, cards }
      },
    }
  )
)

export const useFlashcards = () => {
  const { cards, addCard, updateCard, deleteCard, setKnown, resetDeckProgress } =
    useFlashcardsStore()

  const [activeDeck, setActiveDeck] = useState<string>(ALL_DECKS)
  const [onlyUnknown, setOnlyUnknown] = useState(false)
  const [index, setIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  // Zamíchané pořadí držíme jako seznam id. Kdybychom míchali rovnou pole
  // kartiček, každá úprava ve storu by pořadí přepsala zpátky.
  const [shuffledIds, setShuffledIds] = useState<string[] | null>(null)

  const decks = useMemo(
    () => [...new Set(cards.map((card) => card.deck))].sort((a, b) => a.localeCompare(b, 'cs')),
    [cards]
  )

  const deckCards = useMemo(
    () => cards.filter((card) => activeDeck === ALL_DECKS || card.deck === activeDeck),
    [cards, activeDeck]
  )

  const visibleCards = useMemo(() => {
    const filtered = onlyUnknown ? deckCards.filter((card) => !card.known) : deckCards
    if (!shuffledIds) return filtered

    // Kartičky, které v zamíchaném pořadí nejsou (přibyly později),
    // se zařadí na konec místo toho, aby zmizely.
    const position = new Map(shuffledIds.map((id, i) => [id, i]))
    return [...filtered].sort(
      (a, b) => (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (position.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    )
  }, [deckCards, onlyUnknown, shuffledIds])

  // Index se drží v mezích i po smazání kartičky nebo změně filtru
  const safeIndex = visibleCards.length === 0 ? 0 : Math.min(index, visibleCards.length - 1)
  const currentCard = visibleCards[safeIndex] ?? null

  const knownCount = deckCards.filter((card) => card.known).length
  const progressPercent =
    deckCards.length === 0 ? 0 : Math.round((knownCount / deckCards.length) * 100)

  const goTo = (nextIndex: number) => {
    if (visibleCards.length === 0) return
    setIsFlipped(false)
    setIndex(((nextIndex % visibleCards.length) + visibleCards.length) % visibleCards.length)
  }

  const handleNext = () => goTo(safeIndex + 1)
  const handlePrev = () => goTo(safeIndex - 1)
  const handleFlip = () => setIsFlipped((flipped) => !flipped)

  const shuffle = () => {
    const ids = visibleCards.map((card) => card.id)
    // Fisher–Yates
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }
    setShuffledIds(ids)
    setIndex(0)
    setIsFlipped(false)
  }

  const clearShuffle = () => {
    setShuffledIds(null)
    setIndex(0)
    setIsFlipped(false)
  }

  // Ohodnocení kartičky rovnou posune na další — jinak by uživatel musel
  // po každém klepnutí mačkat ještě "Další".
  const rateCurrent = (known: boolean) => {
    if (!currentCard) return
    setKnown(currentCard.id, known)

    // Při filtru "jen neznámé" kartička ze seznamu po označení zmizí,
    // takže se na stejném indexu objeví rovnou další.
    if (known && onlyUnknown) {
      setIsFlipped(false)
      return
    }
    handleNext()
  }

  const removeCurrent = () => {
    if (!currentCard) return
    deleteCard(currentCard.id)
    setIsFlipped(false)
  }

  const changeDeck = (deck: string) => {
    setActiveDeck(deck)
    setIndex(0)
    setIsFlipped(false)
  }

  const toggleOnlyUnknown = () => {
    setOnlyUnknown((value) => !value)
    setIndex(0)
    setIsFlipped(false)
  }

  return {
    // data
    currentCard,
    currentIndex: safeIndex,
    totalCards: visibleCards.length,
    deckTotal: deckCards.length,
    knownCount,
    progressPercent,
    decks,
    activeDeck,
    onlyUnknown,
    isFlipped,
    isShuffled: shuffledIds !== null,
    hasAnyCard: cards.length > 0,

    // ovládání studia
    handleFlip,
    handleNext,
    handlePrev,
    rateCurrent,
    shuffle,
    clearShuffle,
    changeDeck,
    toggleOnlyUnknown,

    // správa kartiček
    addCard,
    updateCard,
    removeCurrent,
    resetDeckProgress,
  }
}
