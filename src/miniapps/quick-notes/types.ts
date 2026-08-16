export interface Note {
  id: string
  title: string
  content: string
  category: 'Škola' | 'Osobní' | 'Nápady'
  createdAt: string
}

export const INITIAL_NOTES: Note[] = [
  {
    id: '1',
    title: 'Projekt do Matematiky',
    content: 'Odevzdat lineární algebru do příštího pátku.',
    category: 'Škola',
    createdAt: '16. 8.',
  },
  {
    id: '2',
    title: 'Koupit učebnici',
    content: 'Sehnat druhotisk z fyziky.',
    category: 'Osobní',
    createdAt: '15. 8.',
  },
]
