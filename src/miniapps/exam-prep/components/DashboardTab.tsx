import React from 'react'
import { useExamPrepStore } from '../useExamPrepStore'

interface DashboardTabProps {
  onGoToSubjects: () => void
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onGoToSubjects }) => {
  const { subjects, topics, getOverallReadiness, getSubjectReadiness } = useExamPrepStore()

  const overallReadiness = getOverallReadiness()

  // Otázky připravené k dnešnímu opakování
  const dueTopics = topics.filter((t) => {
    if (!t.nextRevisionAt) return true
    return new Date(t.nextRevisionAt) <= new Date()
  })

  // Výpočet nejbližší zkoušky
  const closestExam = [...subjects].sort(
    (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
  )[0]

  const getDaysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)))
  }

  if (subjects.length === 0) {
    return (
      <div className="ep-empty">
        <span className="ep-empty-icon">🎓</span>
        <h3>Začni předmětem</h3>
        <p>
          Přidej si předmět, ze kterého maturuješ, a k němu okruhy. Podle nich pak
          spočítáme, jak jsi připravený, a co je dnes na řadě k opakování.
        </p>
        <button className="ep-btn ep-btn-primary" onClick={onGoToSubjects}>
          Přejít na Okruhy
        </button>
      </div>
    )
  }

  return (
    <div className="ep-tab">
      {/* Celková připravenost */}
      <div className="ep-readiness">
        <div className="ep-readiness-head">
          <span className="ep-readiness-label">INDEX PŘIPRAVENOSTI</span>
          <span className="ep-readiness-value">{overallReadiness}%</span>
        </div>
        <div className="ep-bar">
          <div className="ep-bar-fill" style={{ width: `${overallReadiness}%` }} />
        </div>
      </div>

      {/* Countdown k nejbližší zkoušce */}
      {closestExam && (
        <div className="ep-card ep-countdown">
          <div>
            <span className="ep-countdown-label">NEJBLIŽŠÍ ZKOUŠKA</span>
            <span className="ep-countdown-name">{closestExam.name}</span>
          </div>
          <span className="ep-countdown-days">{getDaysUntil(closestExam.examDate)} dní</span>
        </div>
      )}

      {/* Fronta k dnešnímu opakování */}
      <div className="ep-card">
        <div className="ep-due-head">
          <h3>⚡ Dnes k opakování</h3>
          <span className={`ep-pill ${dueTopics.length > 0 ? 'is-due' : 'is-clear'}`}>
            {dueTopics.length} okruhů
          </span>
        </div>

        {topics.length === 0 ? (
          <p className="ep-muted">
            K tomuhle předmětu zatím nemáš žádné okruhy. Přidej je v záložce Okruhy.
          </p>
        ) : dueTopics.length === 0 ? (
          <p className="ep-muted">🎉 Skvělá práce! Pro dnešek máš všechno opakování splněno.</p>
        ) : (
          <ul className="ep-due-list">
            {dueTopics.slice(0, 3).map((topic) => (
              <li key={topic.id} className="ep-due-item">
                <span>
                  <strong>#{topic.topicNumber}</strong> {topic.title}
                </span>
                <span className="ep-due-xp">až +50 XP</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Přehled podle předmětů */}
      <div>
        <h3 className="ep-section-title">📚 Připravenost předmětů</h3>
        <div className="ep-subject-rows">
          {subjects.map((sub) => {
            const readiness = getSubjectReadiness(sub.id)
            return (
              <div key={sub.id} className="ep-subject-row">
                <div className="ep-subject-row-left">
                  <div className="ep-dot" style={{ backgroundColor: sub.color }} />
                  <span className="ep-subject-row-name">{sub.name}</span>
                </div>
                <span className="ep-subject-row-value" style={{ color: sub.color }}>
                  {readiness}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
