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
  createdAt: string
  updatedAt?: string | null
  pinned?: boolean
  updatedAtTs?: number | null
  createdAtTs?: number | null
  html?: string
  folderId?: string
  tags?: string[]
  archivedAt?: number | null
  deletedAt?: number | null
  revision?: number
}

export interface Notebook {
  id: string
  name: string
}

export interface NoteDraft {
  id: string
  baseRevision: number | null
  title: string
  html: string
  category: NoteCategory
  folderId: string
  tagsText: string
}

export const INITIAL_NOTES: Note[] = []
export const DEMO_NOTE_IDS = ['1', '2']
export const DEMO_NOTE_TITLES = ['Projekt do Matematiky', 'Koupit učebnici']

export const DEFAULT_NOTEBOOKS: Notebook[] = [
  { id: 'school', name: 'Škola' },
  { id: 'personal', name: 'Osobní' },
  { id: 'ideas', name: 'Nápady' },
]

export const folderFor = (category: NoteCategory) =>
  category === 'Škola' ? 'school' : category === 'Nápady' ? 'ideas' : 'personal'

export const noteId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`

export const MAX_NOTE_HTML = 100000

export type NoteResult =
  | { ok: true; note: Note }
  | { ok: false; error: string }
