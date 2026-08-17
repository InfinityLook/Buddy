import { useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { Flashcard, INITIAL_CARDS } from './types'

interface FlashcardsState {
  cards: Flashcard[]
  addCard: (question: string, answer: string) => void
}

const useFlashcardsStore = create<FlashcardsState>()(
  persist(
    (set) => ({
      cards: INITIAL_CARDS,

      addCard: (question, answer) => {
        if (!question.trim() || !answer.trim()) return
        const newCard: Flashcard = { id: Date.now().toString(), question, answer }
        set((state) => ({ cards: [...state.cards, newCard] }))
      },
    }),
    {
      name: 'schoolbuddy-flashcards-storage',
      storage: createJSONStorage(() => secureStorage),
    }
  )
)

export const useFlashcards = () => {
  const { cards, addCard } = useFlashcardsStore()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const handleFlip = () => setIsFlipped(!isFlipped)

  const handleNext = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % cards.length)
  }

  const handlePrev = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)
  }

  return {
    currentCard: cards[currentIndex],
    currentIndex,
    totalCards: cards.length,
    isFlipped,
    handleFlip,
    handleNext,
    handlePrev,
    addCard,
  }
}
