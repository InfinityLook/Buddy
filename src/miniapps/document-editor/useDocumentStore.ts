import { create } from 'zustand'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { validateDocumentEditorData } from '@/core/utils/documentEditorValidation'
import { secureStorage } from '@/core/utils/secureStorage'
import { sanitizeHtml } from './importContent'
import type { DocumentState } from './types'

const STORAGE_KEY = 'schoolbuddy-document-editor-storage'
const DEFAULT_TITLE = 'Nový dokument'

function newDocumentId(): string {
  return `doc-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
}

interface EditorState {
  documents: DocumentState[]
  activeDocId: string | null
  currentTitle: string
  currentContent: string
  isSaved: boolean
  revision: number
}

interface DocumentStore extends EditorState {
  setTitle: (title: string) => void
  setContent: (content: string) => void
  saveCurrentDocument: () => void
  autosaveCurrent: () => void
  createNewDocument: () => void
  loadDocument: (id: string) => void
  deleteDocument: (id: string) => void
  importDocument: (title: string, content: string) => void
}

function emptyDocument(revision: number) {
  return {
    activeDocId: null,
    currentTitle: DEFAULT_TITLE,
    currentContent: '',
    isSaved: true,
    revision,
  }
}

export function toPlainText(html: string): string {
  const template = document.createElement('template')
  template.innerHTML = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|li|tr|blockquote|pre)>/gi, '$&\n')

  return (template.content.textContent ?? '').replace(/\u00a0/g, ' ')
}

function titleFor(title: string, content: string): string {
  const trimmed = title.trim()
  if (trimmed && trimmed !== DEFAULT_TITLE) return trimmed

  return toPlainText(content)
    .split('\n')
    .find(line => line.trim())
    ?.trim()
    .slice(0, 80) || DEFAULT_TITLE
}

let lastStoredValue: string | null | undefined

function readInitialState(): EditorState {
  const fallback = { documents: [], ...emptyDocument(0) }

  try {
    lastStoredValue = localStorage.getItem(STORAGE_KEY)
    const raw = secureStorage.getItem(STORAGE_KEY)
    if (typeof raw !== 'string' || !raw) return fallback

    const result = validateDocumentEditorData(JSON.parse(raw).state)
    return result.success ? result.data : fallback
  } catch {
    return fallback
  }
}

function snapshot(state: EditorState): EditorState {
  return {
    documents: state.documents,
    activeDocId: state.activeDocId,
    currentTitle: state.currentTitle,
    currentContent: state.currentContent,
    isSaved: state.isSaved,
    revision: state.revision,
  }
}

function savedDocument(state: EditorState, force = false) {
  if (!force && state.isSaved) return { state, reward: false }

  const content = sanitizeHtml(state.currentContent)
  const title = titleFor(state.currentTitle, content)
  const text = toPlainText(content).trim()

  if (
    !force &&
    !state.activeDocId &&
    !text &&
    !content.includes('<img') &&
    state.currentTitle.trim() === DEFAULT_TITLE
  ) {
    return { state: { ...state, isSaved: true }, reward: false }
  }

  const exists = state.documents.some(doc => doc.id === state.activeDocId)
  const id = exists ? state.activeDocId! : newDocumentId()
  const doc = { id, title, content, lastModified: new Date().toISOString() }

  return {
    state: {
      ...state,
      documents: exists
        ? state.documents.map(item => item.id === id ? doc : item)
        : [doc, ...state.documents],
      activeDocId: id,
      currentTitle: title,
      currentContent: content,
      isSaved: true,
    },
    reward: !exists && text.length >= 15,
  }
}

export const useDocumentStore = create<DocumentStore>((set, get) => {
  function commit(state: EditorState, reward = false) {
    if (localStorage.getItem(STORAGE_KEY) !== lastStoredValue) {
      throw new Error(
        'Dokumenty se změnily v jiné kartě. Stáhni si rozepsaný text a obnov stránku.'
      )
    }

    // Zachováváme formát uloženého stavu používaný i v zálohách Buddyho.
    secureStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: snapshot(state), version: 0 })
    )
    lastStoredValue = localStorage.getItem(STORAGE_KEY)
    set(state)

    if (reward) {
      try {
        useGamificationStore.getState().recordAction('document', 15)
      } catch {
        // Dokument už je uložený i v případě chyby při zápisu odměny.
      }
    }
  }

  return {
    ...readInitialState(),

    setTitle: title => {
      if (title !== get().currentTitle) {
        set({ currentTitle: title, isSaved: false })
      }
    },

    setContent: content => {
      if (content !== get().currentContent) {
        set({ currentContent: content, isSaved: false })
      }
    },

    saveCurrentDocument: () => {
      const next = savedDocument(snapshot(get()), true)
      commit(next.state, next.reward)
    },

    autosaveCurrent: () => {
      if (get().isSaved) return
      const next = savedDocument(snapshot(get()))
      commit(next.state, next.reward)
    },

    createNewDocument: () => {
      const next = savedDocument(snapshot(get()))

      commit({
        ...next.state,
        ...emptyDocument(next.state.revision + 1),
      }, next.reward)
    },

    loadDocument: id => {
      if (!get().documents.some(doc => doc.id === id)) return

      const next = savedDocument(snapshot(get()))
      const doc = next.state.documents.find(item => item.id === id)!

      commit({
        ...next.state,
        activeDocId: doc.id,
        currentTitle: doc.title,
        currentContent: sanitizeHtml(doc.content),
        isSaved: true,
        revision: next.state.revision + 1,
      }, next.reward)
    },

    deleteDocument: id => {
      const state = snapshot(get())
      const documents = state.documents.filter(doc => doc.id !== id)

      commit(state.activeDocId === id
        ? { documents, ...emptyDocument(state.revision + 1) }
        : { ...state, documents })
    },

    importDocument: (title, content) => {
      const next = savedDocument(snapshot(get()))
      const clean = sanitizeHtml(content)

      const doc = {
        id: newDocumentId(),
        title: titleFor(title, clean),
        content: clean,
        lastModified: new Date().toISOString(),
      }

      commit({
        ...next.state,
        documents: [doc, ...next.state.documents],
        activeDocId: doc.id,
        currentTitle: doc.title,
        currentContent: doc.content,
        isSaved: true,
        revision: next.state.revision + 1,
      }, next.reward)
    },
  }
})
