export type NoteCategory = 'Škola' | 'Osobní' | 'Nápady'

export const NOTE_CATEGORIES: NoteCategory[] = ['Škola', 'Osobní', 'Nápady']

export const ALL_NOTES = 'Vše'

export type NoteSortMode = 'newest' | 'oldest' | 'updated' | 'alphabetical'

export const NOTE_SORT_MODES: NoteSortMode[] = ['newest', 'oldest', 'updated', 'alphabetical']

export const SORT_LABELS: Record<NoteSortMode, string> = {
  newest: 'Nejnovější',
  oldest: 'Nejstarší',
  updated: 'Naposledy upravené',
  alphabetical: 'Abecedně',
}

export interface Note {
  id: string
  title: string
  content: string
  category: NoteCategory
  // Datum vzniku jako zobrazovaný řetězec ("16. 8."). Zůstává řetězcem
  // kvůli poznámkám uloženým dřív, než přibylo cokoli dalšího — a na
  // řazení je stejně nepoužitelný (bez roku, řetězcové porovnání by dalo
  // "16. 8." před "9. 8."). Skutečné pořadí drží pole samo (addNote nové
  // poznámky vkládá na začátek) a updatedAtTs níž.
  createdAt: string
  // Doplní se až při první úpravě, ať je poznat, že se text změnil
  updatedAt?: string | null
  // Připnutá poznámka se v seznamu drží vždycky nahoře, bez ohledu na
  // zvolené řazení. Optional — u poznámek uložených před touhle změnou
  // chybí, což se chová jako "nepřipnuto".
  pinned?: boolean
  // Skutečný časový otisk poslední úpravy pro řazení "Naposledy
  // upravené" — na rozdíl od updatedAt výš (jen zobrazovaný text).
  // null u nikdy needitované poznámky; useQuickNotes.ts pak řadí podle
  // pozice v poli místo podle tohohle pole.
  updatedAtTs?: number | null
}

// Nový uživatel začíná s prázdným seznamem — viz DEMO_NOTE_IDS níž.
export const INITIAL_NOTES: Note[] = []

// Ukázkové poznámky ("Projekt do Matematiky", "Koupit učebnici") vypadaly
// jako uživatelova data, přitom mu nepatřily. Poznáme je podle id
// i názvu zároveň, ať se nesmaže vlastní poznámka se stejným id.
export const DEMO_NOTE_IDS = ['1', '2']
export const DEMO_NOTE_TITLES = ['Projekt do Matematiky', 'Koupit učebnici']
