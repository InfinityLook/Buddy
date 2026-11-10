import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { normalizeText } from '@/core/utils/text'
import { cleanNoteHtml, escapeNote, notePlainText } from './noteContent'
import {
  ALL_NOTES,
  DEFAULT_NOTEBOOKS,
  DEMO_NOTE_IDS,
  DEMO_NOTE_TITLES,
  folderFor,
  NOTE_CATEGORIES,
  noteId,
} from './types'
import type {
  Note,
  NoteCategory,
  NoteDraft,
  Notebook,
  NoteResult,
  NoteSortMode,
} from './types'

const obj = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const time = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null

const text = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback

export const parseNoteTags = (value: string) =>
  [...new Set(
    value
      .split(',')
      .map(tag => tag.trim().replace(/^#/, '').slice(0, 40))
      .filter(Boolean)
  )].slice(0, 12)

const dateLabel = () =>
  new Date().toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
  })

export const normalizeNotes = (value: unknown): Note[] => {
  if (!Array.isArray(value)) return []

  const result = new Map<string, Note>()

  for (const item of value) {
    if (
      !obj(item) ||
      !text(item.id) ||
      (
        DEMO_NOTE_IDS.includes(text(item.id)) &&
        DEMO_NOTE_TITLES.includes(text(item.title))
      )
    ) {
      continue
    }

    let html: string | undefined

    try {
      if (typeof item.html === 'string') html = cleanNoteHtml(item.html)
    } catch {
      html = undefined
    }

    const category = NOTE_CATEGORIES.includes(item.category as NoteCategory)
      ? item.category as NoteCategory
      : 'Osobní'

    const note: Note = {
      id: text(item.id),
      title: text(item.title).slice(0, 300) || 'Bez názvu',
      content: html !== undefined
        ? notePlainText(html)
        : text(item.content),
      html,
      category,
      folderId: text(item.folderId) || folderFor(category),
      tags: Array.isArray(item.tags)
        ? parseNoteTags(
          item.tags.filter(tag => typeof tag === 'string').join(',')
        )
        : [],
      createdAt: text(item.createdAt),
      createdAtTs: time(item.createdAtTs),
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : null,
      updatedAtTs: time(item.updatedAtTs),
      pinned: item.pinned === true,
      archivedAt: time(item.archivedAt),
      deletedAt: time(item.deletedAt),
      revision: Math.floor(time(item.revision) ?? 0),
    }

    if (
      !result.has(note.id) ||
      (note.updatedAtTs ?? 0) >= (result.get(note.id)!.updatedAtTs ?? 0)
    ) {
      result.set(note.id, note)
    }
  }

  return [...result.values()]
}

export interface NotesState {
  notes: Note[]
  notebooks: Notebook[]
  rewardDay: string
  rewardCount: number
  saveDraft: (draft: NoteDraft) => NoteResult
  addNote: (
    title: string,
    content: string,
    category: NoteCategory
  ) => void
  updateNote: (
    id: string,
    title: string,
    content: string,
    category: NoteCategory
  ) => void
  deleteNote: (id: string) => void
  restoreNote: (id: string) => void
  purgeNote: (id: string) => void
  togglePin: (id: string) => void
  toggleArchive: (id: string) => void
  addNotebook: (name: string) => void
  deleteNotebook: (id: string) => void
  importNotes: (payload: unknown) => number
}

const localDay = () => {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export const noteToDraft = (note?: Note): NoteDraft => ({
  id: note?.id ?? noteId(),
  baseRevision: note ? note.revision ?? 0 : null,
  title: note?.title ?? '',
  html: note?.html ?? escapeNote(note?.content ?? ''),
  category: note?.category ?? 'Osobní',
  folderId: note?.folderId ?? 'personal',
  tagsText: (note?.tags ?? []).join(', '),
})

export const useQuickNotesStore = create<NotesState>()(
  persist((set, get) => {
    const commit = (patch: Partial<NotesState>) => {
      const previous = get()

      try {
        set(patch)
      } catch {
        try {
          set(previous)
        } catch {
          /* Zachováme předchozí uložený stav. */
        }

        throw new Error(
          'Poznámku se nepodařilo uložit do zařízení. Zkontroluj volné místo. Text zůstává otevřený.'
        )
      }
    }

    const patchNote = (id: string, change: (note: Note) => Note) =>
      commit({
        notes: get().notes.map(note =>
          note.id === id
            ? {
              ...change(note),
              revision: (note.revision ?? 0) + 1,
              updatedAtTs: Date.now(),
              updatedAt: dateLabel(),
            }
            : note
        ),
      })

    return {
      notes: [],
      notebooks: DEFAULT_NOTEBOOKS,
      rewardDay: '',
      rewardCount: 0,

      saveDraft: draft => {
        const state = get()
        const existing = state.notes.find(note => note.id === draft.id)

        if (existing?.deletedAt) {
          return {
            ok: false,
            error: 'Poznámka byla smazána. Text můžeš uložit jako novou poznámku.',
          }
        }

        if (
          existing &&
          (existing.revision ?? 0) !== draft.baseRevision
        ) {
          return {
            ok: false,
            error: 'Poznámka se mezitím změnila. Ulož svůj text jako novou poznámku, aby se jiná verze nepřepsala.',
          }
        }

        if (!existing && draft.baseRevision !== null) {
          return {
            ok: false,
            error: 'Původní poznámka už není dostupná. Ulož text jako novou poznámku.',
          }
        }

        try {
          const html = cleanNoteHtml(draft.html)
          const content = notePlainText(html)

          if (!draft.title.trim() && !content.trim()) {
            return {
              ok: false,
              error: 'Napiš název nebo obsah poznámky.',
            }
          }

          if (draft.title.length > 300) {
            return {
              ok: false,
              error: 'Název může mít nejvýš 300 znaků.',
            }
          }

          const title =
            draft.title.trim() ||
            content.split('\n').find(line => line.trim())?.trim().slice(0, 80) ||
            'Bez názvu'

          const tags = parseNoteTags(draft.tagsText)

          const folderId = state.notebooks.some(
            book => book.id === draft.folderId
          )
            ? draft.folderId
            : 'personal'

          if (
            existing &&
            existing.title === title &&
            existing.html === html &&
            existing.folderId === folderId &&
            existing.category === draft.category &&
            JSON.stringify(existing.tags ?? []) === JSON.stringify(tags)
          ) {
            return { ok: true, note: existing }
          }

          const now = Date.now()

          const note: Note = {
            ...(existing ?? {
              id: draft.id,
              createdAt: dateLabel(),
              createdAtTs: now,
              pinned: false,
              archivedAt: null,
              deletedAt: null,
            }),
            title,
            content,
            html,
            tags,
            folderId,
            category: draft.category,
            updatedAt: dateLabel(),
            updatedAtTs: now,
            revision: (existing?.revision ?? 0) + 1,
          }

          const day = localDay()
          const count = state.rewardDay === day ? state.rewardCount : 0
          const reward = !existing && count < 3

          commit({
            notes: existing
              ? state.notes.map(item => item.id === note.id ? note : item)
              : [note, ...state.notes],
            rewardDay: day,
            rewardCount: count + (reward ? 1 : 0),
          })

          // Nejvýš tři odměněné nové poznámky za den, žádná odměna za další autosave.
          if (reward) {
            try {
              useGamificationStore.getState().recordAction('note', 5)
            } catch {
              /* Poznámka už je bezpečně uložená. */
            }
          }

          return { ok: true, note }
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : 'Uložení selhalo.',
          }
        }
      },

      addNote: (title, content, category) => {
        if (!title.trim() && !content.trim()) return

        const result = get().saveDraft({
          ...noteToDraft(),
          title,
          html: escapeNote(content),
          category,
          folderId: folderFor(category),
        })

        if (!result.ok) throw new Error(result.error)
      },

      updateNote: (id, title, content, category) => {
        const note = get().notes.find(
          item => item.id === id && !item.deletedAt
        )
        if (!note) return

        const result = get().saveDraft({
          ...noteToDraft(note),
          title,
          html: content === note.content
            ? note.html ?? escapeNote(content)
            : escapeNote(content),
          category,
          folderId: category === note.category
            ? note.folderId ?? folderFor(category)
            : folderFor(category),
        })

        if (!result.ok) throw new Error(result.error)
      },

      deleteNote: id =>
        patchNote(id, note => ({ ...note, deletedAt: Date.now() })),

      restoreNote: id =>
        patchNote(id, note => ({ ...note, deletedAt: null })),

      purgeNote: id =>
        commit({
          notes: get().notes.filter(
            note => !(note.id === id && note.deletedAt)
          ),
        }),

      togglePin: id =>
        patchNote(id, note => ({ ...note, pinned: !note.pinned })),

      toggleArchive: id =>
        patchNote(id, note => ({
          ...note,
          archivedAt: note.archivedAt ? null : Date.now(),
        })),

      addNotebook: name => {
        const value = name.trim()

        if (!value || value.length > 60) {
          throw new Error('Název zápisníku musí mít 1–60 znaků.')
        }

        if (
          get().notebooks.some(
            book => normalizeText(book.name) === normalizeText(value)
          )
        ) {
          throw new Error('Takový zápisník už existuje.')
        }

        commit({
          notebooks: [...get().notebooks, { id: noteId(), name: value }],
        })
      },

      deleteNotebook: id => {
        if (DEFAULT_NOTEBOOKS.some(book => book.id === id)) return

        commit({
          notebooks: get().notebooks.filter(book => book.id !== id),
          notes: get().notes.map(note =>
            note.folderId === id
              ? {
                ...note,
                folderId: 'personal',
                revision: (note.revision ?? 0) + 1,
                updatedAtTs: Date.now(),
              }
              : note
          ),
        })
      },

      importNotes: payload => {
        if (
          !obj(payload) ||
          payload.format !== 'buddy-notes-v1' ||
          !Array.isArray(payload.notes) ||
          payload.notes.length > 1000
        ) {
          throw new Error(
            'Vyber platný export Buddy Notes, nejvýš 1 000 poznámek.'
          )
        }

        const notebooks = [...get().notebooks]
        const mapping = new Map<string, string>()

        if (Array.isArray(payload.notebooks)) {
          for (const raw of payload.notebooks.slice(0, 200)) {
            if (
              !obj(raw) ||
              !text(raw.id) ||
              !text(raw.name).trim()
            ) {
              continue
            }

            const name = text(raw.name).trim().slice(0, 60)
            let book = notebooks.find(
              item => normalizeText(item.name) === normalizeText(name)
            )

            if (!book) {
              book = { id: noteId(), name }
              notebooks.push(book)
            }

            mapping.set(text(raw.id), book.id)
          }
        }

        const notes = normalizeNotes(payload.notes)
          .filter(note => !note.deletedAt)
          .map(note => ({
            ...note,
            id: noteId(),
            folderId:
              mapping.get(note.folderId ?? '') ?? folderFor(note.category),
            revision: 1,
            deletedAt: null,
          }))

        commit({
          notebooks,
          notes: [...notes, ...get().notes],
        })

        return notes.length
      },
    }
  }, {
    name: 'schoolbuddy-quick-notes-storage',
    storage: createJSONStorage(() => secureStorage),

    partialize: state => ({
      notes: state.notes,
      notebooks: state.notebooks,
      rewardDay: state.rewardDay,
      rewardCount: state.rewardCount,
    }),

    merge: (persisted, current) => {
      const data = obj(persisted) ? persisted : {}
      const books = new Map(
        DEFAULT_NOTEBOOKS.map(book => [book.id, book])
      )

      if (Array.isArray(data.notebooks)) {
        for (const book of data.notebooks) {
          if (obj(book) && text(book.id) && text(book.name).trim()) {
            books.set(text(book.id), {
              id: text(book.id),
              name: text(book.name).slice(0, 60),
            })
          }
        }
      }

      return {
        ...current,
        notes: normalizeNotes(data.notes),
        notebooks: [...books.values()],
        rewardDay: text(data.rewardDay),
        rewardCount: Math.min(3, time(data.rewardCount) ?? 0),
      }
    },
  })
)

// Původní rozhraní pro Buddyho nezpřístupňuje smazané poznámky.
export const getQuickNotesState = () => {
  const state = useQuickNotesStore.getState()

  return {
    ...state,
    notes: state.notes.filter(note => !note.deletedAt),
  }
}

export const useQuickNotes = () => {
  const state = useQuickNotesStore()
  const [filter, setFilter] = useState<string>(ALL_NOTES)
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<NoteSortMode>('newest')

  const notes = useMemo(() => {
    const query = normalizeText(search.trim())

    return state.notes
      .filter(note =>
        !note.deletedAt &&
        !note.archivedAt &&
        (filter === ALL_NOTES || note.category === filter) &&
        normalizeText(`${note.title} ${note.content}`).includes(query)
      )
      .sort((a, b) =>
        Number(!!b.pinned) - Number(!!a.pinned) ||
        (
          sortMode === 'alphabetical'
            ? a.title.localeCompare(b.title, 'cs')
            : sortMode === 'oldest'
              ? (a.createdAtTs ?? 0) - (b.createdAtTs ?? 0)
              : sortMode === 'updated'
                ? (b.updatedAtTs ?? b.createdAtTs ?? 0) -
                  (a.updatedAtTs ?? a.createdAtTs ?? 0)
                : (b.createdAtTs ?? 0) - (a.createdAtTs ?? 0)
        )
      )
  }, [state.notes, filter, search, sortMode])

  return {
    ...state,
    notes,
    totalCount: state.notes.filter(
      note => !note.deletedAt && !note.archivedAt
    ).length,
    filter,
    setFilter,
    search,
    setSearch,
    sortMode,
    setSortMode,
  }
}

export const useNoteDraftStore = create<{
  draft: NoteDraft | null
  put: (draft: NoteDraft | null) => void
}>()(
  persist((set, get) => ({
    draft: null,

    put: draft => {
      const previous = get().draft

      try {
        set({ draft })
      } catch {
        try {
          set({ draft: previous })
        } catch {
          /* Původní koncept zůstává na disku. */
        }

        throw new Error(
          'Koncept se nepodařilo uložit. Text ponech otevřený nebo si ho zkopíruj.'
        )
      }
    },
  }), {
    name: 'buddy-quick-note-draft-v1',
    storage: createJSONStorage(() => secureStorage),

    partialize: state => ({ draft: state.draft }),

    merge: (saved, current) => {
      const raw = obj(saved) && obj(saved.draft) ? saved.draft : null
      let draft: NoteDraft | null = null

      if (raw && text(raw.id)) {
        try {
          draft = {
            id: text(raw.id),
            baseRevision: time(raw.baseRevision),
            title: text(raw.title).slice(0, 300),
            html: cleanNoteHtml(text(raw.html)),
            tagsText: text(raw.tagsText),
            folderId: text(raw.folderId) || 'personal',
            category: NOTE_CATEGORIES.includes(raw.category as NoteCategory)
              ? raw.category as NoteCategory
              : 'Osobní',
          }
        } catch {
          /* Poškozený koncept neotevíráme. */
        }
      }

      return { ...current, draft }
    },
  })
)
