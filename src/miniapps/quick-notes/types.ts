export type NoteCategory = 'Škola' | 'Osobní' | 'Nápady'

export const NOTE_CATEGORIES: NoteCategory[] = ['Škola', 'Osobní', 'Nápady']

export const ALL_NOTES = 'Vše'

export interface Note {
  id: string
  title: string
  content: string
  category: NoteCategory
  // Datum vzniku jako zobrazovaný řetězec ("16. 8."). Zůstává řetězcem
  // kvůli poznámkám uloženým dřív, než přibylo cokoli dalšího.
  createdAt: string
  // Doplní se až při první úpravě, ať je poznat, že se text změnil
  updatedAt?: string | null
}

// Nový uživatel začíná s prázdným seznamem — viz DEMO_NOTE_IDS níž.
export const INITIAL_NOTES: Note[] = []

// Ukázkové poznámky ("Projekt do Matematiky", "Koupit učebnici") vypadaly
// jako uživatelova data, přitom mu nepatřily. Poznáme je podle id
// i názvu zároveň, ať se nesmaže vlastní poznámka se stejným id.
export const DEMO_NOTE_IDS = ['1', '2']
export const DEMO_NOTE_TITLES = ['Projekt do Matematiky', 'Koupit učebnici']
