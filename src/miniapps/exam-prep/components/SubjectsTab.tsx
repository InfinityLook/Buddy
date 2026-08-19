import React, { useEffect, useState } from 'react'
import { useExamPrepStore, ExamTopic } from '../useExamPrepStore'

export const SubjectsTab: React.FC = () => {
  const {
    subjects,
    topics,
    addSubject,
    updateSubject,
    removeSubject,
    addTopic,
    updateTopic,
    removeTopic,
    updateNotes,
  } = useExamPrepStore()

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '')
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [topicNotes, setTopicNotes] = useState<string>('')

  // Formulář předmětu slouží pro nový i pro úpravu ('' = nový)
  const [subjectFormId, setSubjectFormId] = useState<string | null>(null)
  const [subName, setSubName] = useState('')
  const [subColor, setSubColor] = useState('#a855f7')
  const [subDate, setSubDate] = useState('')

  // Totéž pro okruh
  const [topicFormId, setTopicFormId] = useState<string | null>(null)
  const [topicNum, setTopicNum] = useState<number>(1)
  const [topicTitle, setTopicTitle] = useState('')

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId)
  const filteredTopics = topics
    .filter((t) => t.subjectId === selectedSubjectId)
    .sort((a, b) => a.topicNumber - b.topicNumber)

  // Po smazání předmětu ukazoval seznam okruhy neexistujícího předmětu,
  // dokud uživatel ručně neklikl na jiný.
  useEffect(() => {
    if (subjects.length === 0) {
      if (selectedSubjectId !== '') setSelectedSubjectId('')
      return
    }
    if (!subjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(subjects[0].id)
    }
  }, [subjects, selectedSubjectId])

  const openNewSubject = () => {
    setSubName('')
    setSubColor('#a855f7')
    setSubDate('')
    setSubjectFormId('')
  }

  const openEditSubject = () => {
    if (!activeSubject) return
    setSubName(activeSubject.name)
    setSubColor(activeSubject.color)
    setSubDate(activeSubject.examDate)
    setSubjectFormId(activeSubject.id)
  }

  const handleSubmitSubject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subName.trim()) return

    if (subjectFormId) {
      updateSubject(subjectFormId, {
        name: subName.trim(),
        color: subColor,
        examDate: subDate,
      })
    } else {
      addSubject({ name: subName.trim(), color: subColor, examDate: subDate, targetGrade: 1 })
    }

    setSubjectFormId(null)
  }

  const handleDeleteSubject = () => {
    if (!activeSubject) return
    const count = topics.filter((t) => t.subjectId === activeSubject.id).length
    const message = count
      ? `Smazat předmět „${activeSubject.name}“ i s ${count} okruhy?`
      : `Smazat předmět „${activeSubject.name}“?`
    if (window.confirm(message)) removeSubject(activeSubject.id)
  }

  const openNewTopic = () => {
    setTopicNum(filteredTopics.length + 1)
    setTopicTitle('')
    setTopicFormId('')
  }

  const openEditTopic = (topic: ExamTopic) => {
    setTopicNum(topic.topicNumber)
    setTopicTitle(topic.title)
    setTopicFormId(topic.id)
  }

  const handleSubmitTopic = (e: React.FormEvent) => {
    e.preventDefault()
    if (!topicTitle.trim() || !selectedSubjectId) return

    if (topicFormId) {
      updateTopic(topicFormId, Number(topicNum), topicTitle)
    } else {
      addTopic({
        subjectId: selectedSubjectId,
        topicNumber: Number(topicNum),
        title: topicTitle.trim(),
        notes: '',
      })
    }

    setTopicFormId(null)
    setTopicTitle('')
  }

  const handleDeleteTopic = (topic: ExamTopic) => {
    if (window.confirm(`Smazat okruh „#${topic.topicNumber} ${topic.title}“?`)) {
      removeTopic(topic.id)
    }
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
    <div className="ep-tab">
      {/* Výběr předmětu */}
      <div className="ep-subject-bar">
        {subjects.map((sub) => (
          <button
            key={sub.id}
            className="ep-subject-pill"
            onClick={() => setSelectedSubjectId(sub.id)}
            style={
              selectedSubjectId === sub.id ? { backgroundColor: sub.color } : undefined
            }
          >
            {sub.name}
          </button>
        ))}
        <button className="ep-subject-pill-add" onClick={openNewSubject}>
          + Přidat předmět
        </button>
      </div>

      {/* Formulář předmětu */}
      {subjectFormId !== null && (
        <form className="ep-form" onSubmit={handleSubmitSubject}>
          <h4>{subjectFormId ? 'Upravit předmět' : 'Nový předmět'}</h4>
          <input
            type="text"
            className="ep-input"
            placeholder="Název (např. Biologie)"
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            required
            autoFocus
          />
          <div className="ep-row">
            <input
              type="color"
              className="ep-input-color"
              value={subColor}
              onChange={(e) => setSubColor(e.target.value)}
              aria-label="Barva předmětu"
            />
            <input
              type="date"
              className="ep-input"
              value={subDate}
              onChange={(e) => setSubDate(e.target.value)}
              aria-label="Datum zkoušky"
            />
          </div>
          <div className="ep-row">
            <button type="submit" className="ep-btn ep-btn-primary">
              {subjectFormId ? 'Uložit změny' : 'Uložit'}
            </button>
            <button
              type="button"
              className="ep-btn ep-btn-ghost"
              onClick={() => setSubjectFormId(null)}
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {/* Okruhy vybraného předmětu */}
      {activeSubject ? (
        <div>
          {/* Tužka a křížek patří PŘEDMĚTU, proto sedí u jeho názvu.
              Vedle tlačítka "Nový okruh" vypadaly, jako by mazaly okruh. */}
          <div className="ep-topics-head">
            <div className="ep-topics-head-left">
              <h3>{activeSubject.name}</h3>
              <button
                className="ep-icon-btn"
                onClick={openEditSubject}
                aria-label="Upravit předmět"
              >
                ✏️
              </button>
              <button
                className="ep-icon-btn danger"
                onClick={handleDeleteSubject}
                aria-label="Smazat předmět"
              >
                ✕
              </button>
            </div>
            <button
              className="ep-btn"
              style={{ backgroundColor: activeSubject.color, color: '#fff' }}
              onClick={openNewTopic}
            >
              + Nový okruh
            </button>
          </div>

          <p className="ep-muted ep-topics-count">
            {filteredTopics.length === 1 ? '1 okruh' : `Okruhů: ${filteredTopics.length}`}
          </p>

          {/* Formulář okruhu */}
          {topicFormId !== null && (
            <form className="ep-form" onSubmit={handleSubmitTopic} style={{ marginBottom: '1rem' }}>
              <h4>{topicFormId ? 'Upravit okruh' : 'Nový okruh'}</h4>
              <div className="ep-row">
                <input
                  type="number"
                  min={1}
                  className="ep-input ep-input-num"
                  placeholder="Číslo"
                  value={topicNum}
                  onChange={(e) => setTopicNum(Number(e.target.value))}
                />
                <input
                  type="text"
                  className="ep-input"
                  placeholder="Název otázky/okruhu"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="ep-row">
                <button type="submit" className="ep-btn ep-btn-success">
                  {topicFormId ? 'Uložit změny' : 'Přidat okruh'}
                </button>
                <button
                  type="button"
                  className="ep-btn ep-btn-ghost"
                  onClick={() => setTopicFormId(null)}
                >
                  Zrušit
                </button>
              </div>
            </form>
          )}

          <div className="ep-topic-list">
            {filteredTopics.length === 0 ? (
              <p className="ep-muted">
                K tomuhle předmětu zatím žádné okruhy nemáš. Přidej první tlačítkem výš.
              </p>
            ) : (
              filteredTopics.map((topic) => (
                <div key={topic.id} className="ep-topic-card">
                  <div className="ep-topic-head">
                    <span className="ep-topic-title">
                      #{topic.topicNumber} {topic.title}
                    </span>
                    <div className="ep-topic-actions">
                      <button className="ep-notes-btn" onClick={() => handleOpenNotes(topic)}>
                        📝 Výpisky
                      </button>
                      <button
                        className="ep-icon-btn"
                        onClick={() => openEditTopic(topic)}
                        aria-label={`Upravit okruh ${topic.title}`}
                      >
                        ✏️
                      </button>
                      <button
                        className="ep-icon-btn danger"
                        onClick={() => handleDeleteTopic(topic)}
                        aria-label={`Smazat okruh ${topic.title}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {topic.notes && <p className="ep-topic-notes">{topic.notes}</p>}

                  <div className="ep-topic-meta">
                    <span>Jistota {topic.confidenceLevel}/5</span>
                    {topic.revisionCount > 0 && <span>Opakováno {topic.revisionCount}×</span>}
                    {topic.simulatedAt && <span>🎓 Odsimulováno</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="ep-empty">
          <span className="ep-empty-icon">📚</span>
          <h3>Zatím žádný předmět</h3>
          <p>
            Přidej si předmět, ze kterého maturuješ — třeba Český jazyk. K němu pak
            zadáš jednotlivé maturitní okruhy.
          </p>
          <button className="ep-btn ep-btn-primary" onClick={openNewSubject}>
            + Přidat předmět
          </button>
        </div>
      )}

      {/* Editor výpisků */}
      {editingTopicId && (
        <div className="ep-modal-backdrop" onClick={() => setEditingTopicId(null)}>
          <div className="ep-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Editor výpisků</h3>
            <textarea
              rows={8}
              className="ep-textarea"
              value={topicNotes}
              onChange={(e) => setTopicNotes(e.target.value)}
              placeholder="Sem si napiš výpisky, body k maturitě, definice…"
            />
            <div className="ep-row">
              <button className="ep-btn ep-btn-primary" onClick={handleSaveNotes}>
                Uložit výpisky
              </button>
              <button
                className="ep-btn ep-btn-ghost"
                onClick={() => setEditingTopicId(null)}
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
