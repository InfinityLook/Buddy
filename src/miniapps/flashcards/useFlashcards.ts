import { useState } from 'react'
import { Flashcard, INITIAL_CARDS } from './types'

export const useFlashcards = () => {
  const [cards, setCards] = useState<Flashcard[]>(INITIAL_CARDS)
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

  const addCard = (question: string, answer: string) => {
    if (!question.trim() || !answer.trim()) return
    const newCard: Flashcard = { id: Date.now().toString(), question, answer }
    setCards((prev) => [...prev, newCard])
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
