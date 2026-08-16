export interface Flashcard {
  id: string
  question: string
  answer: string
}

export const INITIAL_CARDS: Flashcard[] = [
  { id: '1', question: 'Co je to React Hook?', answer: 'Speciální funkce umožňující používat state a další vlastnosti Reactu bez psaní tříd.' },
  { id: '2', question: 'Jaký je rozdíl mezi LET a CONST?', answer: 'LET umožňuje přepisovat hodnotu proměnné, CONST vytváří neměnnou referenci.' },
  { id: '3', question: 'Co znamená zkratka DOM?', answer: 'Document Object Model – stromová struktura reprezentující HTML dokument.' },
]
