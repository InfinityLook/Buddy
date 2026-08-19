import React, { useState } from 'react'
import { useFlashcards } from './useFlashcards'
import { ALL_DECKS, DEFAULT_DECK } from './types'
import './Flashcards.css'

type FormMode = { kind: 'closed' } | { kind: 'add' } | { kind: 'edit' }

export const Flashcards: React.FC = () => {
  const {
    currentCard,
    currentIndex,
    totalCards,
    deckTotal,
    knownCount,
    progressPercent,
    decks,
    activeDeck,
    onlyUnknown,
    isFlipped,
    isShuffled,
    hasAnyCard,
    handleFlip,
    handleNext,
    handlePrev,
    rateCurrent,
    shuffle,
    clearShuffle,
    changeDeck,
    toggleOnlyUnknown,
    addCard,
    updateCard,
    removeCurrent,
    resetDeckProgress,
  } = useFlashcards()

  const [form, setForm] = useState<FormMode>({ kind: 'closed' })
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [deck, setDeck] = useState(DEFAULT_DECK)

  const openAdd = () => {
    setQuestion('')
    setAnswer('')
    setDeck(activeDeck === ALL_DECKS ? DEFAULT_DECK : activeDeck)
    setForm({ kind: 'add' })
  }

  const openEdit = () => {
    if (!currentCard) return
    setQuestion(currentCard.question)
    setAnswer(currentCard.answer)
    setDeck(currentCard.deck)
    setForm({ kind: 'edit' })
  }

  const closeForm = () => setForm({ kind: 'closed' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (form.kind === 'edit' && currentCard) {
      updateCard(currentCard.id, question, answer, deck)
    } else {
      addCard(question, answer, deck)
    }

    closeForm()
  }

  const handleDelete = () => {
    if (!currentCard) return
    if (window.confirm(`Smazat kartičku „${currentCard.question}“?`)) {
      removeCurrent()
    }
  }

  return (
    <div className="flashcards-app">
      <div className="fc-header">
        <h2>Flashcards</h2>
        <button className="fc-add-btn" onClick={openAdd}>
          + Přidat
        </button>
      </div>

      {/* Balíčky — zobrazí se, až když je z čeho vybírat */}
      {decks.length > 1 && (
        <div className="fc-decks">
          <button
            className={`fc-deck-pill ${activeDeck === ALL_DECKS ? 'active' : ''}`}
            onClick={() => changeDeck(ALL_DECKS)}
          >
            {ALL_DECKS}
          </button>
          {decks.map((d) => (
            <button
              key={d}
              className={`fc-deck-pill ${activeDeck === d ? 'active' : ''}`}
              onClick={() => changeDeck(d)}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {/* Pokrok v balíčku */}
      {deckTotal > 0 && (
        <div className="fc-progress">
          <div className="fc-progress-head">
            <span>
              Umíš {knownCount} z {deckTotal}
            </span>
            <span className="fc-progress-percent">{progressPercent} %</span>
          </div>
          <div className="fc-progress-bg">
            <div className="fc-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* Nástroje studia */}
      {deckTotal > 0 && (
        <div className="fc-tools">
          <button
            className={`fc-tool-btn ${onlyUnknown ? 'active' : ''}`}
            onClick={toggleOnlyUnknown}
          >
            {onlyUnknown ? '✓ Jen neznámé' : 'Jen neznámé'}
          </button>
          <button
            className={`fc-tool-btn ${isShuffled ? 'active' : ''}`}
            onClick={isShuffled ? clearShuffle : shuffle}
          >
            {isShuffled ? '↺ Původní pořadí' : '🔀 Zamíchat'}
          </button>
          {knownCount > 0 && (
            <button
              className="fc-tool-btn"
              onClick={() => resetDeckProgress(activeDeck)}
              title="Označit všechny v balíčku zpátky jako neznámé"
            >
              ⟳ Projít znovu
            </button>
          )}
        </div>
      )}

      {/* Studijní plocha */}
      {currentCard ? (
        <>
          <div className="fc-counter-row">
            <span className="fc-counter">
              {currentIndex + 1} / {totalCards}
            </span>
            {currentCard.known && <span className="fc-known-tag">✓ Umím</span>}
          </div>

          <div className={`fc-card ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
            <div className="fc-card-inner">
              <div className="fc-card-front">
                <span className="fc-badge">Otázka</span>
                <p>{currentCard.question}</p>
                <span className="fc-hint">Klikni pro otočení 🔄</span>
              </div>
              <div className="fc-card-back">
                <span className="fc-badge answer">Odpověď</span>
                <p>{currentCard.answer}</p>
                <span className="fc-hint">Klikni pro otočení zpět</span>
              </div>
            </div>
          </div>

          {/* Hodnocení dává smysl až po otočení — do té doby uživatel
              odpověď neviděl a nemá co hodnotit. */}
          {isFlipped && (
            <div className="fc-rate-row">
              <button className="fc-rate-btn again" onClick={() => rateCurrent(false)}>
                Ještě ne
              </button>
              <button className="fc-rate-btn known" onClick={() => rateCurrent(true)}>
                Umím ✓
              </button>
            </div>
          )}

          <div className="fc-controls">
            <button className="fc-btn" onClick={handlePrev} disabled={totalCards < 2}>
              ◀ Předchozí
            </button>
            <button className="fc-btn main" onClick={handleFlip}>
              Otočit
            </button>
            <button className="fc-btn" onClick={handleNext} disabled={totalCards < 2}>
              Další ▶
            </button>
          </div>

          <div className="fc-card-actions">
            <button className="fc-link-btn" onClick={openEdit}>
              ✏️ Upravit
            </button>
            <button className="fc-link-btn danger" onClick={handleDelete}>
              🗑 Smazat
            </button>
          </div>
        </>
      ) : (
        <div className="fc-empty">
          {!hasAnyCard ? (
            <>
              <span className="fc-empty-icon">🃏</span>
              <h3>Zatím tu nemáš žádnou kartičku</h3>
              <p>
                Založ si první — otázka na jednu stranu, odpověď na druhou. Kartičky si
                můžeš rozdělit do balíčků podle předmětu.
              </p>
              <button className="fc-btn main" onClick={openAdd}>
                + Vytvořit kartičku
              </button>
            </>
          ) : onlyUnknown ? (
            <>
              <span className="fc-empty-icon">🎉</span>
              <h3>Hotovo!</h3>
              <p>V tomhle balíčku už umíš všechno. Můžeš si ho projít znovu.</p>
              <button className="fc-btn main" onClick={() => resetDeckProgress(activeDeck)}>
                ⟳ Projít znovu
              </button>
            </>
          ) : (
            <>
              <span className="fc-empty-icon">🔍</span>
              <h3>Prázdný balíček</h3>
              <p>V tomhle balíčku zatím žádná kartička není.</p>
              <button className="fc-btn main" onClick={openAdd}>
                + Přidat kartičku
              </button>
            </>
          )}
        </div>
      )}

      {/* Formulář slouží pro přidání i úpravu — liší se jen popisky */}
      {form.kind !== 'closed' && (
        <form className="fc-add-form" onSubmit={handleSubmit}>
          <span className="fc-form-title">
            {form.kind === 'edit' ? 'Upravit kartičku' : 'Nová kartička'}
          </span>

          <input
            type="text"
            placeholder="Otázka..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            autoFocus
          />
          <input
            type="text"
            placeholder="Odpověď..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder={`Balíček (např. Dějepis) — výchozí ${DEFAULT_DECK}`}
            value={deck}
            onChange={(e) => setDeck(e.target.value)}
            list="fc-deck-list"
          />
          <datalist id="fc-deck-list">
            {decks.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>

          <div className="fc-form-actions">
            <button type="submit" className="fc-btn main">
              {form.kind === 'edit' ? 'Uložit změny' : 'Uložit'}
            </button>
            <button type="button" className="fc-btn" onClick={closeForm}>
              Zrušit
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
