import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateFlashcardsData } from '@/core/utils/flashcardsValidation'
import {
  ALL_DECKS,
  DEFAULT_DECK,
  DEMO_CARD_IDS,
  DEMO_CARD_QUESTIONS,
  Flashcard,
  INITIAL_CARDS,
  MIN_KRABICE,
  dalsiKrabice,
  jeKOpakovaniDnes,
  vypocitejDalsiTermin,
} from './types'

const XP_PER_NEW_CARD = 5
// Za naučení se dává míň než za vytvoření — je to jedno klepnutí,
// ne příprava obsahu.
const XP_PER_LEARNED_CARD = 3

interface FlashcardsState {
  cards: Flashcard[]
  addCard: (question: string, answer: string, deck: string) => void
  updateCard: (id: string, question: string, answer: string, deck: string) => void
  deleteCard: (id: string) => void
  setKnown: (id: string, known: boolean) => void
  resetDeckProgress: (deck: string) => void
  // Přejmenuje celý balíček — přepíše pole deck na všech kartičkách, co
  // do něj patří, v jednom kroku, místo úpravy kartičky po kartičce.
  // Bez XP, stejná zdrženlivost jako Known's upravitPredmet: je to
  // strukturální úprava, ne nový studijní čin.
  renameDeck: (oldDeck: string, newDeck: string) => void
  // Smaže celý balíček se všemi kartičkami uvnitř. Komponenta volá
  // vždycky až po window.confirm, stejně jako smazání jedné kartičky.
  deleteDeck: (deck: string) => void
}

const isDemoCard = (card: Flashcard) =>
  DEMO_CARD_IDS.includes(card.id) && DEMO_CARD_QUESTIONS.includes(card.question)

export const useFlashcardsStore = create<FlashcardsState>()(
  persist(
    (set) => ({
      cards: INITIAL_CARDS,

      addCard: (question, answer, deck) => {
        if (!question.trim() || !answer.trim()) return

        const newCard: Flashcard = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          question: question.trim(),
          answer: answer.trim(),
          deck: deck.trim() || DEFAULT_DECK,
          known: false,
          learnedAt: null,
          box: MIN_KRABICE,
          dueAt: null,
        }

        set((state) => ({ cards: [...state.cards, newCard] }))
        useGamificationStore.getState().recordAction('flashcard', XP_PER_NEW_CARD)
      },

      updateCard: (id, question, answer, deck) => {
        if (!question.trim() || !answer.trim()) return

        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === id
              ? {
                  ...card,
                  question: question.trim(),
                  answer: answer.trim(),
                  deck: deck.trim() || DEFAULT_DECK,
                }
              : card
          ),
        }))
      },

      deleteCard: (id) =>
        set((state) => ({ cards: state.cards.filter((card) => card.id !== id) })),

      setKnown: (id, known) => {
        let firstTime = false
        const ted = new Date()

        set((state) => ({
          cards: state.cards.map((card) => {
            if (card.id !== id) return card
            if (known && !card.learnedAt) firstTime = true

            // Leitnerova krabice se posune podle stejného hodnocení, co
            // appka odesílá k tomuhle jedinému místu, co kartičky mění —
            // špatná odpověď spadne zpátky na začátek, dobrá o krabici
            // výš a s tím i další termín opakování dál do budoucna.
            const box = dalsiKrabice(card.box, known)

            return {
              ...card,
              known,
              // learnedAt se jednou nastaví a už zůstane
              learnedAt: card.learnedAt ?? (known ? ted.toISOString() : null),
              box,
              dueAt: vypocitejDalsiTermin(box, ted),
            }
          }),
        }))

        // Schválně holé addXp, ne recordAction: počítadlo 'flashcard' hlídá
        // odznak za VYTVOŘENÍ deseti kartiček. Kdyby ho zvyšovalo i učení,
        // odznak by šel získat bez jediné vlastní kartičky.
        if (firstTime) useGamificationStore.getState().addXp(XP_PER_LEARNED_CARD)
      },

      // Vrátí celý balíček zpátky mezi neznámé, ať se dá projít znovu.
      // learnedAt zůstává — XP se za druhé kolo znovu nedává. Krabice a
      // termín opakování se resetují spolu s known — jinak by appka
      // "znovu neznámou" kartičku dál nabízela až za měsíc podle
      // starého rozestupu.
      resetDeckProgress: (deck) =>
        set((state) => ({
          cards: state.cards.map((card) =>
            deck === ALL_DECKS || card.deck === deck
              ? { ...card, known: false, box: MIN_KRABICE, dueAt: null }
              : card
          ),
        })),

      renameDeck: (oldDeck, newDeck) => {
        const trimmed = newDeck.trim()
        if (!trimmed || trimmed === oldDeck) return
        set((state) => ({
          cards: state.cards.map((card) =>
            card.deck === oldDeck ? { ...card, deck: trimmed } : card
          ),
        }))
      },

      deleteDeck: (deck) =>
        set((state) => ({ cards: state.cards.filter((card) => card.deck !== deck) })),
    }),
    {
      name: 'schoolbuddy-flashcards-storage',
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateFlashcardsData(persisted)
        if (!validace.success) return current
        const cards = validace.data.cards.filter((card) => !isDemoCard(card))
        return { ...current, cards }
      },
    }
  )
)

export const useFlashcards = () => {
  const {
    cards,
    addCard,
    updateCard,
    deleteCard,
    setKnown,
    resetDeckProgress,
    renameDeck: renameDeckInStore,
    deleteDeck: deleteDeckInStore,
  } = useFlashcardsStore()

  const [activeDeck, setActiveDeck] = useState<string>(ALL_DECKS)
  const [onlyUnknown, setOnlyUnknown] = useState(false)
  // Nezávislý filtr na "Jen neznámé" — kartička může být "umím", a
  // přesto podle Leitnerovy krabice zrovna dnes na řadu, nebo naopak
  // "neumím" a čekat, protože se ukázala teprve před chvílí.
  const [onlyDueToday, setOnlyDueToday] = useState(false)
  const [index, setIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  // Zamíchané pořadí držíme jako seznam id. Kdybychom míchali rovnou pole
  // kartiček, každá úprava ve storu by pořadí přepsala zpátky.
  const [shuffledIds, setShuffledIds] = useState<string[] | null>(null)

  const decks = useMemo(
    () => [...new Set(cards.map((card) => card.deck))].sort((a, b) => a.localeCompare(b, 'cs')),
    [cards]
  )

  // Počet kartiček v každém balíčku — pro správu balíčků (přejmenování/
  // smazání), kde se musí zobrazit, kolik by přejmenování/smazání
  // doopravdy zasáhlo, ne jen název.
  const deckCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const card of cards) counts[card.deck] = (counts[card.deck] ?? 0) + 1
    return counts
  }, [cards])

  const deckCards = useMemo(
    () => cards.filter((card) => activeDeck === ALL_DECKS || card.deck === activeDeck),
    [cards, activeDeck]
  )

  const visibleCards = useMemo(() => {
    let filtered = onlyUnknown ? deckCards.filter((card) => !card.known) : deckCards
    // "ted" se spočítá jednou za renderu, ne uvnitř .filter — jinak by
    // hraniční kartička mezi dvěma voláními Date.now() mohla v jednom
    // průchodu vypadat jinak vpředu než na konci seznamu.
    if (onlyDueToday) {
      const ted = new Date()
      filtered = filtered.filter((card) => jeKOpakovaniDnes(card.dueAt, ted))
    }
    if (!shuffledIds) return filtered

    // Kartičky, které v zamíchaném pořadí nejsou (přibyly později),
    // se zařadí na konec místo toho, aby zmizely.
    const position = new Map(shuffledIds.map((id, i) => [id, i]))
    return [...filtered].sort(
      (a, b) => (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (position.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    )
  }, [deckCards, onlyUnknown, onlyDueToday, shuffledIds])

  // Index se drží v mezích i po smazání kartičky nebo změně filtru
  const safeIndex = visibleCards.length === 0 ? 0 : Math.min(index, visibleCards.length - 1)
  const currentCard = visibleCards[safeIndex] ?? null

  const knownCount = deckCards.filter((card) => card.known).length
  const progressPercent =
    deckCards.length === 0 ? 0 : Math.round((knownCount / deckCards.length) * 100)
  const dueTodayCount = useMemo(() => {
    const ted = new Date()
    return deckCards.filter((card) => jeKOpakovaniDnes(card.dueAt, ted)).length
  }, [deckCards])

  const goTo = (nextIndex: number) => {
    if (visibleCards.length === 0) return
    setIsFlipped(false)
    setIndex(((nextIndex % visibleCards.length) + visibleCards.length) % visibleCards.length)
  }

  const handleNext = () => goTo(safeIndex + 1)
  const handlePrev = () => goTo(safeIndex - 1)
  const handleFlip = () => setIsFlipped((flipped) => !flipped)

  const shuffle = () => {
    const ids = visibleCards.map((card) => card.id)
    // Fisher–Yates
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }
    setShuffledIds(ids)
    setIndex(0)
    setIsFlipped(false)
  }

  const clearShuffle = () => {
    setShuffledIds(null)
    setIndex(0)
    setIsFlipped(false)
  }

  // Ohodnocení kartičky rovnou posune na další — jinak by uživatel musel
  // po každém klepnutí mačkat ještě "Další".
  const rateCurrent = (known: boolean) => {
    if (!currentCard) return
    setKnown(currentCard.id, known)

    // Při filtru "jen neznámé" i "jen k opakování dnes" kartička po
    // správné odpovědi ze seznamu zmizí sama (buď je teď "umím", nebo
    // ji Leitnerova krabice odsunula na pozdější termín) — na stejném
    // indexu se tak objeví rovnou další a druhé volání handleNext by
    // jednu kartičku přeskočilo.
    if (known && (onlyUnknown || onlyDueToday)) {
      setIsFlipped(false)
      return
    }
    handleNext()
  }

  const removeCurrent = () => {
    if (!currentCard) return
    deleteCard(currentCard.id)
    setIsFlipped(false)
  }

  const changeDeck = (deck: string) => {
    setActiveDeck(deck)
    setIndex(0)
    setIsFlipped(false)
  }

  const toggleOnlyUnknown = () => {
    setOnlyUnknown((value) => !value)
    setIndex(0)
    setIsFlipped(false)
  }

  const toggleOnlyDueToday = () => {
    setOnlyDueToday((value) => !value)
    setIndex(0)
    setIsFlipped(false)
  }

  // Přejmenovaný/smazaný balíček může být zrovna ten vybraný — appka
  // pak aktivní filtr sama přesune, ať neukazuje prázdný seznam pro
  // balíček, co už má jiné jméno nebo neexistuje.
  const renameDeck = (oldDeck: string, newDeck: string) => {
    renameDeckInStore(oldDeck, newDeck)
    const trimmed = newDeck.trim()
    if (activeDeck === oldDeck && trimmed && trimmed !== oldDeck) changeDeck(trimmed)
  }

  const deleteDeck = (deck: string) => {
    deleteDeckInStore(deck)
    if (activeDeck === deck) changeDeck(ALL_DECKS)
  }

  return {
    // data
    currentCard,
    currentIndex: safeIndex,
    totalCards: visibleCards.length,
    deckTotal: deckCards.length,
    knownCount,
    dueTodayCount,
    progressPercent,
    decks,
    deckCounts,
    activeDeck,
    onlyUnknown,
    onlyDueToday,
    isFlipped,
    isShuffled: shuffledIds !== null,
    hasAnyCard: cards.length > 0,

    // ovládání studia
    handleFlip,
    handleNext,
    handlePrev,
    rateCurrent,
    shuffle,
    clearShuffle,
    changeDeck,
    toggleOnlyUnknown,
    toggleOnlyDueToday,

    // správa kartiček
    addCard,
    updateCard,
    removeCurrent,
    resetDeckProgress,

    // správa balíčků
    renameDeck,
    deleteDeck,
  }
}
