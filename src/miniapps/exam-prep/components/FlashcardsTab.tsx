import React, { useEffect, useState } from 'react'
import { isDue as topicIsDue, useExamPrepStore, ConfidenceLevel } from '../useExamPrepStore'

const RATE_COLORS: Record<ConfidenceLevel, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#84cc16',
  5: '#22c55e',
}

interface FlashcardsTabProps {
  onGoToSubjects: () => void
  // Lifted do ExamPrepApp.tsx, aby šlo zapnout tenhle filtr i
  // tlačítkem "▶ Spustit opakování" z Dashboardu, ne jen přepínačem
  // tady — přepínač samotný ale zůstává i dál funkční bez něj.
  onlyDueToday: boolean
  onToggleOnlyDueToday: () => void
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({
  onGoToSubjects,
  onlyDueToday,
  onToggleOnlyDueToday,
}) => {
  const { topics, subjects, rateTopic } = useExamPrepStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const studyTopics = onlyDueToday ? topics.filter(topicIsDue) : topics

  // Přepnutí filtru mění délku seznamu — beze zdejšího resetu by
  // currentIndex ukazoval na jinou (nebo neexistující) kartičku, než
  // která je zrovna vidět.
  useEffect(() => {
    setCurrentIndex(0)
    setIsFlipped(false)
  }, [onlyDueToday])

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

  const filterToggle = (
    <button
      className={`ep-due-toggle-btn ${onlyDueToday ? 'active' : ''}`}
      onClick={onToggleOnlyDueToday}
    >
      {onlyDueToday ? '✓ Jen k opakování dnes' : '📅 Jen k opakování dnes'}
    </button>
  )

  if (studyTopics.length === 0) {
    return (
      <div className="ep-study">
        {filterToggle}
        <div className="ep-empty">
          <span className="ep-empty-icon">🎉</span>
          <h3>Hotovo!</h3>
          <p>Pro dnešek máš všechno opakování splněno. Zbytek přijde na řadu později.</p>
        </div>
      </div>
    )
  }

  const currentTopic = studyTopics[currentIndex % studyTopics.length]
  const currentSubject = subjects.find((s) => s.id === currentTopic.subjectId)

  // Otázka mimo termín opakování se dá projít znovu, ale XP už za ni
  // nepřibude — jinak by stačilo mačkat hodnocení dokola.
  const isDue = topicIsDue(currentTopic)

  const handleRate = (confidence: ConfidenceLevel) => {
    // XP i posun termínu řeší store — dřív se XP přičítalo tady zvlášť,
    // takže šlo hodnotit tutéž otázku pořád dokola a sbírat po 50 XP.
    rateTopic(currentTopic.id, confidence)
    setIsFlipped(false)

    // rateTopic vždycky posune nextRevisionAt do budoucna (i confidence
    // 1 dá +1 den) — ve filtru "jen k opakování dnes" tak hodnocená
    // otázka ze seznamu zmizí sama. Na stejném indexu se objeví rovnou
    // další a ruční posun by jednu otázku přeskočil.
    if (onlyDueToday) return
    setCurrentIndex((prev) => (prev + 1) % studyTopics.length)
  }

  return (
    <div className="ep-study">
      {filterToggle}
      <div className="ep-study-head">
        <span
          className="ep-chip"
          style={{ backgroundColor: currentSubject?.color || '#38bdf8' }}
        >
          {currentSubject?.name || 'Předmět'}
        </span>
        <span className="ep-study-counter">
          Kartička {(currentIndex % studyTopics.length) + 1} z {studyTopics.length}
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
