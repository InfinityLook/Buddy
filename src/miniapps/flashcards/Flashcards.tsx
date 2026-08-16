import React, { useState } from 'react'
import { useFlashcards } from './useFlashcards'
import './Flashcards.css'

export const Flashcards: React.FC = () => {
  const { currentCard, currentIndex, totalCards, isFlipped, handleFlip, handleNext, handlePrev, addCard } = useFlashcards()
  const [showAddModal, setShowAddModal] = useState(false)
  const [qInput, setQInput] = useState('')
  const [aInput, setAInput] = useState('')

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addCard(qInput, aInput)
    setQInput('')
    setAInput('')
    setShowAddModal(false)
  }

  return (
    <div className="flashcards-app">
      <div className="fc-header">
        <h2>Flashcards</h2>
        <span className="fc-counter">{currentIndex + 1} / {totalCards}</span>
      </div>

      <div className={`fc-card ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
        <div className="fc-card-inner">
          <div className="fc-card-front">
            <span className="fc-badge">Otázka</span>
            <p>{currentCard?.question}</p>
            <span className="fc-hint">Klikni pro otočení 🔄</span>
          </div>
          <div className="fc-card-back">
            <span className="fc-badge answer">Odpověď</span>
            <p>{currentCard?.answer}</p>
          </div>
        </div>
      </div>

      <div className="fc-controls">
        <button className="fc-btn" onClick={handlePrev}>◀ Předchozí</button>
        <button className="fc-btn main" onClick={() => setShowAddModal(true)}>+ Přidat</button>
        <button className="fc-btn" onClick={handleNext}>Další ▶</button>
      </div>

      {showAddModal && (
        <form className="fc-add-form" onSubmit={handleAddSubmit}>
          <input 
            type="text" 
            placeholder="Otázka..." 
            value={qInput} 
            onChange={(e) => setQInput(e.target.value)} 
            required 
          />
          <input 
            type="text" 
            placeholder="Odpověď..." 
            value={aInput} 
            onChange={(e) => setAInput(e.target.value)} 
            required 
          />
          <div className="fc-form-actions">
            <button type="submit" className="fc-btn main">Uložit</button>
            <button type="button" className="fc-btn" onClick={() => setShowAddModal(false)}>Zrušit</button>
          </div>
        </form>
      )}
    </div>
  )
}
