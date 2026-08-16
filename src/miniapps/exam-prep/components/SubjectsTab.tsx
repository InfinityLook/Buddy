import React, { useState } from 'react'
import { useExamPrepStore, ExamTopic } from '../useExamPrepStore'

export const SubjectsTab: React.FC = () => {
  const { subjects, topics, addSubject, addTopic, updateNotes, removeSubject } = useExamPrepStore()

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '')
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [topicNotes, setTopicNotes] = useState<string>('')

  // Formuláře pro nový předmět a okruh
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [newSubName, setNewSubName] = useState('')
  const [newSubColor, setNewSubColor] = useState('#a855f7')
  const [newSubDate, setNewSubDate] = useState('2027-05-20')

  const [showAddTopic, setShowAddTopic] = useState(false)
  const [newTopicNum, setNewTopicNum] = useState<number>(1)
  const [newTopicTitle, setNewTopicTitle] = useState('')

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId)
  const filteredTopics = topics.filter((t) => t.subjectId === selectedSubjectId)

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubName.trim()) return
    addSubject({
      name: newSubName.trim(),
      color: newSubColor,
      examDate: newSubDate,
      targetGrade: 1,
    })
    setNewSubName('')
    setShowAddSubject(false)
  }

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTopicTitle.trim() || !selectedSubjectId) return
    addTopic({
      subjectId: selectedSubjectId,
      topicNumber: Number(newTopicNum),
      title: newTopicTitle.trim(),
      notes: '',
    })
    setNewTopicTitle('')
    setNewTopicNum(filteredTopics.length + 2)
    setShowAddTopic(false)
  }

  const handleOpenNotes = (topic: ExamTopic) => {
    setEditingTopicId(topic.id)
    setTopicNotes(topic.notes)
  }

  const handleSaveNotes = () => {
    if (editingTopicId) {
      updateNotes(editingTopicId, topicNotes)
      setEditingTopicId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Výběr Předmětu (Horizontal Scroll Bar) */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubjectId(sub.id)}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: selectedSubjectId === sub.id ? sub.color : 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {sub.name}
          </button>
        ))}
        <button
          onClick={() => setShowAddSubject(true)}
          style={{
            padding: '0.5rem 0.8rem',
            borderRadius: '20px',
            border: '1px dashed rgba(255, 255, 255, 0.2)',
            backgroundColor: 'transparent',
            color: '#94a3b8',
            fontSize: '0.8rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + Přidat předmět
        </button>
      </div>

      {/* Formulář pro nový předmět */}
      {showAddSubject && (
        <form
          onSubmit={handleCreateSubject}
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            padding: '1rem',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <h4 style={{ margin: 0, color: '#f8fafc' }}>Nový Předmět</h4>
          <input
            type="text"
            placeholder="Název (např. Biologie)"
            value={newSubName}
            onChange={(e) => setNewSubName(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #334155',
              backgroundColor: '#0f172a',
              color: '#fff',
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="color"
              value={newSubColor}
              onChange={(e) => setNewSubColor(e.target.value)}
              style={{ width: '40px', height: '35px', border: 'none', cursor: 'pointer' }}
            />
            <input
              type="date"
              value={newSubDate}
              onChange={(e) => setNewSubDate(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: '#fff',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '6px',
                backgroundColor: '#38bdf8',
                color: '#000',
                fontWeight: 700,
                border: 'none',
              }}
            >
              Uložit
            </button>
            <button
              type="button"
              onClick={() => setShowAddSubject(false)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                backgroundColor: '#334155',
                color: '#fff',
                border: 'none',
              }}
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {/* Seznam okruhů vybraného předmětu */}
      {activeSubject ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Okruhy ({filteredTopics.length})</h3>
            <button
              onClick={() => {
                setNewTopicNum(filteredTopics.length + 1)
                setShowAddTopic(true)
              }}
              style={{
                backgroundColor: activeSubject.color,
                color: '#fff',
                border: 'none',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              + Nový okruh
            </button>
          </div>

          {/* Formulář pro nový okruh */}
          {showAddTopic && (
            <form
              onSubmit={handleCreateTopic}
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                padding: '1rem',
                borderRadius: '12px',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  placeholder="Číslo"
                  value={newTopicNum}
                  onChange={(e) => setNewTopicNum(Number(e.target.value))}
                  style={{
                    width: '60px',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: '#0f172a',
                    color: '#fff',
                  }}
                />
                <input
                  type="text"
                  placeholder="Název otázky/okruhu"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: '#0f172a',
                    color: '#fff',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    borderRadius: '6px',
                    backgroundColor: '#22c55e',
                    color: '#fff',
                    fontWeight: 700,
                    border: 'none',
                  }}
                >
                  Přidat okruh
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTopic(false)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    backgroundColor: '#334155',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  Zrušit
                </button>
              </div>
            </form>
          )}

          {/* Karty s okruhy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {filteredTopics.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Zatím jste nepřidali žádné okruhy.</p>
            ) : (
              filteredTopics.map((topic) => (
                <div
                  key={topic.id}
                  style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '0.8rem 1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      #{topic.topicNumber} {topic.title}
                    </span>
                    <button
                      onClick={() => handleOpenNotes(topic)}
                      style={{
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      📝 Výpisky
                    </button>
                  </div>
                  {topic.notes && (
                    <p
                      style={{
                        margin: '0.5rem 0 0 0',
                        fontSize: '0.8rem',
                        color: '#94a3b8',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '60px',
                        overflow: 'hidden',
                      }}
                    >
                      {topic.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <p style={{ color: '#94a3b8' }}>Vyberte nebo přidejte předmět.</p>
      )}

      {/* Modal / Editor Výpisků */}
      {editingTopicId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              width: '100%',
              maxWidth: '440px',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <h3 style={{ margin: 0, color: '#f8fafc' }}>Editor Výpisků</h3>
            <textarea
              rows={8}
              value={topicNotes}
              onChange={(e) => setTopicNotes(e.target.value)}
              placeholder="Sem napište své poznámky, body k maturita, definice..."
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: '#fff',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleSaveNotes}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '8px',
                  backgroundColor: '#38bdf8',
                  color: '#000',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Uložit výpisky
              </button>
              <button
                onClick={() => setEditingTopicId(null)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#334155',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
      }
            
