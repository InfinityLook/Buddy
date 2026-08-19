import React, { useState, useEffect, useRef } from 'react'
import { useExamPrepStore, ExamTopic } from '../useExamPrepStore'

// Standardní čas na potítku u maturity je 15 minut
const PREP_SECONDS = 900

interface SimulatorTabProps {
  onGoToSubjects: () => void
}

export const SimulatorTab: React.FC<SimulatorTabProps> = ({ onGoToSubjects }) => {
  const { subjects, topics, completeSimulation } = useExamPrepStore()

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')
  const [drawnTopic, setDrawnTopic] = useState<ExamTopic | null>(null)
  const [prepTimeLeft, setPrepTimeLeft] = useState<number>(PREP_SECONDS)
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false)
  const [examFinished, setExamFinished] = useState<boolean>(false)
  // Byla tahle otázka odměněná už dřív? Rozhoduje o textu po dokončení.
  const [alreadyRewarded, setAlreadyRewarded] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Odpočet časovače. Zastaví se sám na nule, ať neběží do záporných čísel.
  useEffect(() => {
    if (!isTimerRunning) return

    intervalRef.current = setInterval(() => {
      setPrepTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isTimerRunning])

  const availableTopics = topics.filter((t) =>
    selectedSubjectId === 'all' ? true : t.subjectId === selectedSubjectId
  )

  const handleDrawTopic = () => {
    if (availableTopics.length === 0) return
    const randomIndex = Math.floor(Math.random() * availableTopics.length)
    setDrawnTopic(availableTopics[randomIndex])
    setPrepTimeLeft(PREP_SECONDS)
    setIsTimerRunning(false)
    setExamFinished(false)
    setAlreadyRewarded(false)
  }

  const handleFinishExam = () => {
    if (!drawnTopic) return
    setIsTimerRunning(false)
    // XP dá store, a to jen za otázku, kterou uživatel ještě neodsimuloval.
    // Dřív se +100 XP připisovalo při každém klepnutí, takže stačilo
    // střídat "Dokončit" a "Jiná otázka" a XP rostlo bez omezení.
    setAlreadyRewarded(Boolean(drawnTopic.simulatedAt))
    completeSimulation(drawnTopic.id)
    setExamFinished(true)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const drawnSubject = subjects.find((s) => s.id === drawnTopic?.subjectId)

  if (topics.length === 0) {
    return (
      <div className="ep-empty">
        <span className="ep-empty-icon">🎓</span>
        <h3>Není z čeho losovat</h3>
        <p>
          Simulátor tahá otázky z tvých okruhů. Nejdřív si nějaké přidej v záložce
          Okruhy.
        </p>
        <button className="ep-btn ep-btn-primary" onClick={onGoToSubjects}>
          Přejít na Okruhy
        </button>
      </div>
    )
  }

  return (
    <div className="ep-sim">
      <div className="ep-sim-picker">
        <label htmlFor="ep-sim-subject">Zkouška z:</label>
        <select
          id="ep-sim-subject"
          className="ep-input"
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
        >
          <option value="all">Všechny předměty</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {!drawnTopic && (
        <div className="ep-sim-draw">
          <div className="ep-sim-draw-icon">🎓</div>
          <button
            className="ep-btn-draw"
            onClick={handleDrawTopic}
            disabled={availableTopics.length === 0}
          >
            {availableTopics.length > 0
              ? '🎲 Táhnout náhodnou otázku'
              : 'Žádné otázky k dispozici'}
          </button>
        </div>
      )}

      {drawnTopic && (
        <div className="ep-sim-body">
          <div
            className="ep-sim-question"
            style={{ border: `1px solid ${drawnSubject?.color || '#38bdf8'}` }}
          >
            <span
              className="ep-chip"
              style={{ backgroundColor: drawnSubject?.color || '#38bdf8' }}
            >
              {drawnSubject?.name}
            </span>
            <h3>Otázka č. {drawnTopic.topicNumber}</h3>
            <p className="ep-sim-question-title">{drawnTopic.title}</p>
          </div>

          <div className="ep-timer">
            <span className="ep-timer-label">ČAS NA POTÍTKU</span>
            <div className={`ep-timer-value ${prepTimeLeft === 0 ? 'is-up' : ''}`}>
              {formatTime(prepTimeLeft)}
            </div>

            <div className="ep-timer-actions">
              <button
                className={`ep-btn-timer ${isTimerRunning ? 'is-running' : 'is-paused'}`}
                onClick={() => setIsTimerRunning((running) => !running)}
                disabled={prepTimeLeft === 0}
              >
                {isTimerRunning ? '⏸ Pozastavit' : '▶ Spustit čas'}
              </button>
              <button className="ep-btn-outline" onClick={handleDrawTopic}>
                🔄 Jiná otázka
              </button>
            </div>
          </div>

          {!examFinished ? (
            <button className="ep-btn ep-btn-violet" onClick={handleFinishExam}>
              🎓 Dokončit odpověď &amp; Odzkoušet se
            </button>
          ) : (
            <div className="ep-sim-done">
              {alreadyRewarded ? (
                <>
                  🎉 Hotovo! Tuhle otázku už jsi jednou odsimuloval, takže XP se
                  nepřipisuje znovu — procvičit si ji ale můžeš, kolikrát chceš.
                </>
              ) : (
                <>
                  🎉 Skvělá práce! Simulace dokončena. <strong>+100 XP</strong> připsáno.
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
