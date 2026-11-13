import { BuddyDialog } from '@/components/buddy-ui/BuddyDialog'
import React, { useState } from 'react'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { useFlashcards } from './useFlashcards'
import { ALL_DECKS, DEFAULT_DECK, MAX_KRABICE } from './types'
import './Flashcards.css'

type FormMode = { kind: 'closed' } | { kind: 'add' } | { kind: 'edit' }

export const Flashcards: React.FC = () => {
  const { rootAttributes } = useSurfaceAppearance('flashcards')

  const {
    currentCard,
    currentIndex,
    totalCards,
    deckTotal,
    knownCount,
    dueTodayCount,
    progressPercent,
    decks,
    deckCounts,
    activeDeck,
    onlyUnknown,
    onlyDueToday,
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
    toggleOnlyDueToday,
    addCard,
    updateCard,
    removeCurrent,
    resetDeckProgress,
    renameDeck,
    deleteDeck,
  } = useFlashcards()

  const [form, setForm] = useState<FormMode>({ kind: 'closed' })
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [deck, setDeck] = useState(DEFAULT_DECK)

  const [deckManagerOpen, setDeckManagerOpen] = useState(false)
  // Jméno balíčku, který se zrovna přejmenovává — ne globální boolean,
  // stejný vzor jako Known's upravovanyPredmetId: nejvýš jeden
  // rozbalený formulář najednou.
  const [renamingDeck, setRenamingDeck] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const openRenameDeck = (d: string) => {
    setRenameValue(d)
    setRenamingDeck(d)
  }

  const submitRenameDeck = (e: React.FormEvent, oldDeck: string) => {
    e.preventDefault()
    renameDeck(oldDeck, renameValue)
    setRenamingDeck(null)
  }

  const handleDeleteDeck = (d: string) => {
    const count = deckCounts[d] ?? 0
    if (window.confirm(`Smazat balíček „${d}“ a všech ${count} kartiček uvnitř?`)) {
      if (renamingDeck === d) setRenamingDeck(null)
      deleteDeck(d)
    }
  }

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
    <div className="buddy-miniapp flashcards-app buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId="flashcards" />
      <div className="fc-header">
        <div className="fc-header-actions">
          {hasAnyCard && (
            <button
              aria-expanded={deckManagerOpen}
              className={`buddy-ui-button fc-manage-btn ${deckManagerOpen ? 'active' : ''}`}
              onClick={() => {
                setDeckManagerOpen((open) => !open)
                setRenamingDeck(null)
              }}
            >
              📚 Balíčky
            </button>
          )}
          <button className="buddy-ui-button buddy-ui-button--primary fc-add-btn" onClick={openAdd}>
            + Přidat
          </button>
        </div>
      </div>

      {/* Správa balíčků — přejmenování/smazání celého balíčku najednou,
          ne kartičku po kartičce. Nezávislé na filtru pills níž, aby šel
          přejmenovat i jediný balíček, co se tam ještě nezobrazí. */}
      {deckManagerOpen && (
        <div className="buddy-ui-card fc-deck-manager">
          {decks.length === 0 ? (
            <p className="buddy-ui-status fc-deck-manager-empty">Zatím žádný balíček.</p>
          ) : (
            <ul className="fc-deck-manager-list">
              {decks.map((d) => (
                <li key={d} className="fc-deck-manager-row">
                  {renamingDeck === d ? (
                    <form
                      className="fc-deck-rename-form"
                      onSubmit={(e) => submitRenameDeck(e, d)}
                    >
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        autoFocus
                        required
                      />
                      <button type="submit" className="fc-deck-rename-save">
                        Uložit
                      </button>
                      <button
                        type="button"
                        className="fc-deck-rename-cancel"
                        onClick={() => setRenamingDeck(null)}
                      >
                        Zrušit
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="fc-deck-manager-name">
                        {d} <span className="fc-deck-manager-count">({deckCounts[d] ?? 0})</span>
                      </span>
                      <button
                        className="fc-deck-manager-icon"
                        aria-label={`Přejmenovat balíček ${d}`}
                        onClick={() => openRenameDeck(d)}
                      >
                        ✎
                      </button>
                      <button
                        className="fc-deck-manager-icon danger"
                        aria-label={`Smazat balíček ${d}`}
                        onClick={() => handleDeleteDeck(d)}
                      >
                        🗑
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Balíčky — zobrazí se, až když je z čeho vybírat */}
      {decks.length > 1 && (
        <div className="fc-decks">
          <button
            aria-pressed={activeDeck === ALL_DECKS}
            className={`buddy-ui-button fc-deck-pill ${activeDeck === ALL_DECKS ? 'active' : ''}`}
            onClick={() => changeDeck(ALL_DECKS)}
          >
            {ALL_DECKS}
          </button>
          {decks.map((d) => (
            <button
              key={d}
              aria-pressed={activeDeck === d}
              className={`buddy-ui-button fc-deck-pill ${activeDeck === d ? 'active' : ''}`}
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
          {/* Opakování s rozestupy (Leitnerovy krabice) — kolik kartiček
              appka podle rozvrhu opakování chce ukázat právě dnes,
              nezávisle na tom, jestli je uživatel dřív označil jako
              "umím". */}
          <p className="fc-due-today">📅 K opakování dnes: {dueTodayCount}</p>
        </div>
      )}

      {/* Nástroje studia */}
      {deckTotal > 0 && (
        <div className="fc-tools">
          <button
            className={`buddy-ui-button fc-tool-btn ${onlyUnknown ? 'active' : ''}`}
            onClick={toggleOnlyUnknown}
          >
            {onlyUnknown ? '✓ Jen neznámé' : 'Jen neznámé'}
          </button>
          <button
            className={`buddy-ui-button fc-tool-btn ${onlyDueToday ? 'active' : ''}`}
            onClick={toggleOnlyDueToday}
            title="Ukáže jen kartičky, co má appka podle rozestupu opakování nabídnout právě dnes"
          >
            {onlyDueToday ? '✓ K opakování dnes' : 'K opakování dnes'}
          </button>
          <button
            className={`buddy-ui-button fc-tool-btn ${isShuffled ? 'active' : ''}`}
            onClick={isShuffled ? clearShuffle : shuffle}
          >
            {isShuffled ? '↺ Původní pořadí' : '🔀 Zamíchat'}
          </button>
          {knownCount > 0 && (
            <button
              className="buddy-ui-button fc-tool-btn"
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
            <span className="fc-box-tag" title="Leitnerova krabice — čím výš, tím delší interval do dalšího opakování">
              📦 {currentCard.box}/{MAX_KRABICE}
            </span>
            {currentCard.known && <span className="fc-known-tag">✓ Umím</span>}
          </div>

          <div className={`fc-card ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
            <div className="fc-card-inner">
              <div className="buddy-ui-card fc-card-front">
                <span className="fc-badge">Otázka</span>
                <p>{currentCard.question}</p>
                <span className="fc-hint">Klikni pro otočení 🔄</span>
              </div>
              <div className="buddy-ui-card fc-card-back">
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
              <button className="buddy-ui-button fc-rate-btn again" onClick={() => rateCurrent(false)}>
                Ještě ne
              </button>
              <button className="buddy-ui-button fc-rate-btn known" onClick={() => rateCurrent(true)}>
                Umím ✓
              </button>
            </div>
          )}

          <div className="fc-controls">
            <button className="buddy-ui-button fc-btn" onClick={handlePrev} disabled={totalCards < 2}>
              ◀ Předchozí
            </button>
            <button className="buddy-ui-button buddy-ui-button--primary fc-btn main" onClick={handleFlip}>
              Otočit
            </button>
            <button className="buddy-ui-button fc-btn" onClick={handleNext} disabled={totalCards < 2}>
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
        <div className="buddy-ui-status fc-empty">
          {!hasAnyCard ? (
            <>
              <span className="fc-empty-icon">🃏</span>
              <h3>Zatím tu nemáš žádnou kartičku</h3>
              <p>
                Založ si první — otázka na jednu stranu, odpověď na druhou. Kartičky si
                můžeš rozdělit do balíčků podle předmětu.
              </p>
              <button className="buddy-ui-button buddy-ui-button--primary fc-btn main" onClick={openAdd}>
                + Vytvořit kartičku
              </button>
            </>
          ) : onlyUnknown ? (
            <>
              <span className="fc-empty-icon">🎉</span>
              <h3>Hotovo!</h3>
              <p>V tomhle balíčku už umíš všechno. Můžeš si ho projít znovu.</p>
              <button className="buddy-ui-button buddy-ui-button--primary fc-btn main" onClick={() => resetDeckProgress(activeDeck)}>
                ⟳ Projít znovu
              </button>
            </>
          ) : onlyDueToday ? (
            <>
              <span className="fc-empty-icon">📅</span>
              <h3>Na dnešek nic nezbylo</h3>
              <p>
                Podle rozestupu opakování nemá appka pro dnešek žádnou kartičku připravenou —
                zbytek přijde na řadu později.
              </p>
              <button className="buddy-ui-button buddy-ui-button--primary fc-btn main" onClick={toggleOnlyDueToday}>
                Zobrazit všechny
              </button>
            </>
          ) : (
            <>
              <span className="fc-empty-icon">🔍</span>
              <h3>Prázdný balíček</h3>
              <p>V tomhle balíčku zatím žádná kartička není.</p>
              <button className="buddy-ui-button buddy-ui-button--primary fc-btn main" onClick={openAdd}>
                + Přidat kartičku
              </button>
            </>
          )}
        </div>
      )}

      {/* Formulář slouží pro přidání i úpravu — liší se jen popisky */}
      {form.kind !== 'closed' && (
        <BuddyDialog
          surfaceId="flashcards"
          title={form.kind === 'edit' ? 'Upravit kartičku' : 'Nová kartička'}
          onClose={closeForm}
          contentClassName="buddy-miniapp"
        >
          <form className="fc-add-form" onSubmit={handleSubmit}>
            <input
              type="text"
              aria-label="Otázka"
              placeholder="Otázka..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              autoFocus
            />
            <input
              type="text"
              aria-label="Odpověď"
              placeholder="Odpověď..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
            />
            <input
              type="text"
              aria-label="Balíček"
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
              <button type="submit" className="buddy-ui-button buddy-ui-button--primary fc-btn main">
                {form.kind === 'edit' ? 'Uložit změny' : 'Uložit'}
              </button>
              <button type="button" className="buddy-ui-button fc-btn" onClick={closeForm}>
                Zrušit
              </button>
            </div>
          </form>
        </BuddyDialog>
      )}
    </div>
  )
}
