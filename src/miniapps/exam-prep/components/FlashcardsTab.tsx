import React, { useState } from 'react'
import { useExamPrepStore, ConfidenceLevel } from '../useExamPrepStore'
import { useGamificationStore } from '@/core/store/useGamificationStore'

export const FlashcardsTab: React.FC = () => {
  const { topics, subjects, rateTopic } = useExamPrepStore()
  const { addXp } = useGamificationStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  if (topics.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
        <p>Zatím nemáš přidané žádné okruhy k opakování.</p>
        <p style={{ fontSize: '0.85rem' }}>Nejprve přidej otázky v záložce Okruhy.</p>
      </div>
    )
  }

  const currentTopic = topics[currentIndex % topics.length]
  const currentSubject = subjects.find((s) => s.id === currentTopic.subjectId)

  const handleRate = (confidence: ConfidenceLevel) => {
    // Uložení hodnocení
    rateTopic(currentTopic.id, confidence)

    // Odměna v XP podle hodnocení (např. 10 až 50 XP)
    const earnedXp = confidence * 10
    addXp(earnedXp)

    // Přechod na další kartičku
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % topics.length)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
      {/* Informace o předmětu a pokroku */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '0.8rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '12px',
            backgroundColor: currentSubject?.color || '#38bdf8',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          {currentSubject?.name || 'Předmět'}
        </span>
        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Kartička {(currentIndex % topics.length) + 1} z {topics.length}
        </span>
      </div>

      {/* Kartička (3D flip efekt) */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        style={{
          width: '100%',
          minHeight: '220px',
          backgroundColor: isFlipped ? 'rgba(30, 41, 59, 0.9)' : 'rgba(30, 41, 59, 0.5)',
          border: `1px solid ${isFlipped ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: isFlipped ? '0 0 15px rgba(56, 189, 248, 0.2)' : 'none',
        }}
      >
        {!isFlipped ? (
          <div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>
              OTÁZKA #{currentTopic.topicNumber}
            </span>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>{currentTopic.title}</h3>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '1.5rem', display: 'block' }}>
              👆 Klikni pro zobrazení odpovědi / výpisků
            </span>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8', display: 'block', marginBottom: '0.5rem' }}>
              VÝPISKY & POZNÁMKY
            </span>
            <p
              style={{
                margin: 0,
                fontSize: '0.95rem',
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
                maxHeight: '180px',
                overflowY: 'auto',
              }}
            >
              {currentTopic.notes || 'K této otázce zatím nemáš žádné výpisky.'}
            </p>
          </div>
        )}
      </div>

      {/* Tlačítka hodnocení (1-5) */}
      {isFlipped && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.6rem' }}>
            Jak dobře jsi otázku věděl/a?
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
            {([1, 2, 3, 4, 5] as ConfidenceLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => handleRate(level)}
                style={{
                  padding: '0.6rem 0',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor:
                    level === 1 ? '#ef4444' : level === 2 ? '#f97316' : level === 3 ? '#eab308' : level === 4 ? '#84cc16' : '#22c55e',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <span>{level}</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>+{level * 10}XP</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
