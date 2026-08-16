import React, { useState, useEffect } from 'react'
import { useExamPrepStore, ExamTopic } from '../useExamPrepStore'
import { useGamificationStore } from '@/core/store/useGamificationStore'

export const SimulatorTab: React.FC = () => {
  const { subjects, topics } = useExamPrepStore()
  const { addXp } = useGamificationStore()

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')
  const [drawnTopic, setDrawnTopic] = useState<ExamTopic | null>(null)
  
  // Časovač potítka (standardně 15 minut = 900 sekund)
  const [prepTimeLeft, setPrepTimeLeft] = useState<number>(900)
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false)
  const [examFinished, setExamFinished] = useState<boolean>(false)

  // Odpočet časovače
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isTimerRunning && prepTimeLeft > 0) {
      interval = setInterval(() => {
        setPrepTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (prepTimeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerRunning, prepTimeLeft])

  const availableTopics = topics.filter((t) =>
    selectedSubjectId === 'all' ? true : t.subjectId === selectedSubjectId
  )

  const handleDrawTopic = () => {
    if (availableTopics.length === 0) return
    const randomIndex = Math.floor(Math.random() * availableTopics.length)
    setDrawnTopic(availableTopics[randomIndex])
    setPrepTimeLeft(900) // Reset na 15 minut
    setIsTimerRunning(false)
    setExamFinished(false)
  }

  const handleFinishExam = () => {
    setIsTimerRunning(false)
    setExamFinished(true)
    addXp(100) // Odměna 100 XP za absolvování simulace
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const drawnSubject = subjects.find((s) => s.id === drawnTopic?.subjectId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
      {/* Výběr Předmětu */}
      <div style={{ width: '100%', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>Zkouška z:</label>
        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '8px',
            border: '1px solid #334155',
            backgroundColor: '#0f172a',
            color: '#fff',
            fontSize: '0.85rem',
          }}
        >
          <option value="all">Všechny předměty</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tlačítko Tahu Otázky */}
      {!drawnTopic && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
          <button
            onClick={handleDrawTopic}
            disabled={availableTopics.length === 0}
            style={{
              padding: '0.8rem 1.8rem',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: availableTopics.length > 0 ? '#38bdf8' : '#334155',
              color: availableTopics.length > 0 ? '#000' : '#94a3b8',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: availableTopics.length > 0 ? 'pointer' : 'not-allowed',
              boxShadow: availableTopics.length > 0 ? '0 0 15px rgba(56, 189, 248, 0.4)' : 'none',
            }}
          >
            {availableTopics.length > 0 ? '🎲 Táhnout náhodnou otázku' : 'Žádné otázky k dispozici'}
          </button>
        </div>
      )}

      {/* Vytažená otázka & Potítko */}
      {drawnTopic && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              border: `1px solid ${drawnSubject?.color || '#38bdf8'}`,
              borderRadius: '16px',
              padding: '1.25rem',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                color: '#fff',
                backgroundColor: drawnSubject?.color || '#38bdf8',
                padding: '0.2rem 0.6rem',
                borderRadius: '10px',
                fontWeight: 700,
              }}
            >
              {drawnSubject?.name}
            </span>
            <h3 style={{ margin: '0.75rem 0 0.25rem 0', fontSize: '1.2rem', color: '#f8fafc' }}>
              Otázka č. {drawnTopic.topicNumber}
            </h3>
            <p style={{ margin: 0, fontSize: '1rem', color: '#38bdf8', fontWeight: 600 }}>{drawnTopic.title}</p>
          </div>

          {/* Časovač Potítka */}
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1rem',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>ČAS NA POTÍTKU</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f59e0b', margin: '0.2rem 0' }}>
              {formatTime(prepTimeLeft)}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isTimerRunning ? '#ef4444' : '#22c55e',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {isTimerRunning ? '⏸ Pozastavit' : '▶ Spustit čas'}
              </button>
              <button
                onClick={handleDrawTopic}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                🔄 Jiná otázka
              </button>
            </div>
          </div>

          {/* Dokončení zkoušky */}
          {!examFinished ? (
            <button
              onClick={handleFinishExam}
              style={{
                width: '100%',
                padding: '0.8rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#a855f7',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              🎓 Dokončit odpověď & Odzkoušet se
            </button>
          ) : (
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid #22c55e',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center',
                color: '#4ade80',
              }}
            >
              🎉 Skvělá práce! Simulace dokončena. <strong>+100 XP</strong> připsáno.
            </div>
          )}
        </div>
      )}
    </div>
  )
              }
            
