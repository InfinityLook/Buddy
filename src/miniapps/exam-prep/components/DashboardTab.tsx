import React from 'react'
import { useExamPrepStore } from '../useExamPrepStore'
import { useGamificationStore } from '@/core/store/useGamificationStore'

export const DashboardTab: React.FC = () => {
  const { subjects, topics, getOverallReadiness, getSubjectReadiness } = useExamPrepStore()
  const { xp } = useGamificationStore()

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Celková Připravenost */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(168, 85, 247, 0.15))',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>INDEX PŘIPRAVENOSTI</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>{overallReadiness}%</span>
        </div>

        <div
          style={{
            height: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            marginTop: '0.75rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${overallReadiness}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #38bdf8, #a855f7)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Countdown k nejbližší zkoušce */}
      {closestExam && (
        <div
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>NEJBLIŽŠÍ ZKOUŠKA</span>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>{closestExam.name}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
              {getDaysUntil(closestExam.examDate)} dní
            </span>
          </div>
        </div>
      )}

      {/* Fronta k dnešnímu opakování */}
      <div
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>⚡ Dnes k opakování</h3>
          <span
            style={{
              backgroundColor: dueTopics.length > 0 ? '#ef4444' : '#22c55e',
              color: '#fff',
              fontSize: '0.75rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              fontWeight: 700,
            }}
          >
            {dueTopics.length} okruhů
          </span>
        </div>

        {dueTopics.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
            🎉 Skvělá práce! Pro dnešek máš všechno opakování splněno.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {dueTopics.slice(0, 3).map((topic) => (
              <li
                key={topic.id}
                style={{
                  padding: '0.6rem 0.8rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  <strong>#{topic.topicNumber}</strong> {topic.title}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>+15 XP</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Přehled podle předmětů */}
      <div>
        <h3 style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '0.75rem' }}>📚 Připravenost předmětů</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {subjects.map((sub) => {
            const readiness = getSubjectReadiness(sub.id)
            return (
              <div
                key={sub.id}
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '0.8rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: sub.color }}
                  />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{sub.name}</span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: sub.color }}>{readiness}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
              }
              
