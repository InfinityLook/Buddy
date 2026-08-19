import React, { useState } from 'react'
import { useExamPrepStore, ConfidenceLevel } from '../useExamPrepStore'

const RATE_COLORS: Record<ConfidenceLevel, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#84cc16',
  5: '#22c55e',
}

interface FlashcardsTabProps {
  onGoToSubjects: () => void
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({ onGoToSubjects }) => {
  const { topics, subjects, rateTopic } = useExamPrepStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  if (topics.length === 0) {
    return (
      <div className="ep-empty">
        <span className="ep-empty-icon">🧠</span>
        <h3>Není co opakovat</h3>
        <p>Zatím nemáš přidané žádné okruhy. Nejdřív je zadej v záložce Okruhy.</p>
        <button className="ep-btn ep-btn-primary" onClick={onGoToSubjects}>
          Přejít na Okruhy
        </button>
      </div>
    )
  }

  const currentTopic = topics[currentIndex % topics.length]
  const currentSubject = subjects.find((s) => s.id === currentTopic.subjectId)

  // Otázka mimo termín opakování se dá projít znovu, ale XP už za ni
  // nepřibude — jinak by stačilo mačkat hodnocení dokola.
  const isDue =
    !currentTopic.nextRevisionAt || new Date(currentTopic.nextRevisionAt) <= new Date()

  const handleRate = (confidence: ConfidenceLevel) => {
    // XP i posun termínu řeší store — dřív se XP přičítalo tady zvlášť,
    // takže šlo hodnotit tutéž otázku pořád dokola a sbírat po 50 XP.
    rateTopic(currentTopic.id, confidence)

    setIsFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % topics.length)
  }

  return (
    <div className="ep-study">
      <div className="ep-study-head">
        <span
          className="ep-chip"
          style={{ backgroundColor: currentSubject?.color || '#38bdf8' }}
        >
          {currentSubject?.name || 'Předmět'}
        </span>
        <span className="ep-study-counter">
          Kartička {(currentIndex % topics.length) + 1} z {topics.length}
        </span>
      </div>

      <button
        type="button"
        className={`ep-flashcard ${isFlipped ? 'is-flipped' : ''}`}
        onClick={() => setIsFlipped((flipped) => !flipped)}
      >
        {!isFlipped ? (
          <div>
            <span className="ep-flashcard-label">OTÁZKA #{currentTopic.topicNumber}</span>
            <h3>{currentTopic.title}</h3>
            <span className="ep-flashcard-hint">
              👆 Klikni pro zobrazení odpovědi / výpisků
            </span>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            <span className="ep-flashcard-label is-answer">VÝPISKY &amp; POZNÁMKY</span>
            <p className="ep-flashcard-notes">
              {currentTopic.notes || 'K této otázce zatím nemáš žádné výpisky.'}
            </p>
          </div>
        )}
      </button>

      {isFlipped && (
        <div className="ep-rate">
          <span className="ep-rate-label">
            {isDue
              ? 'Jak dobře jsi otázku věděl/a?'
              : 'Tuhle otázku máš čerstvě opakovanou — XP se teď nepřipisuje.'}
          </span>
          <div className="ep-rate-grid">
            {([1, 2, 3, 4, 5] as ConfidenceLevel[]).map((level) => (
              <button
                key={level}
                className="ep-rate-btn"
                style={{ backgroundColor: RATE_COLORS[level] }}
                onClick={() => handleRate(level)}
              >
                <span>{level}</span>
                <small>{isDue ? `+${level * 10}XP` : '—'}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
