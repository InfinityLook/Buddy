import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { DocumentState } from './types'
import { useGamificationStore } from '@/core/store/useGamificationStore'

// XP jen za první uložení dokumentu — přepsat už uložený text
// není nová práce a nemá se odměňovat pokaždé znovu
const XP_PER_NEW_DOCUMENT = 15

// Kolik čistého textu musí dokument mít, aby se sám uložil. Bez téhle
// hranice by automatické ukládání zakládalo prázdné dokumenty pokaždé,
// co uživatel editor jen otevře — a připisovalo za ně XP.
const MIN_AUTOSAVE_CHARS = 15

const DEFAULT_TITLE = 'Nový dokument'

const toPlainText = (html: string): string =>
  html
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/li)\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

const plainTextLength = (html: string): number => toPlainText(html).trim().length

// Dokud si uživatel název nezměnil, odvodíme ho z prvního řádku textu.
// Bez toho se seznam plnil dokumenty pojmenovanými shodně "Nový dokument"
// a nedaly se od sebe rozeznat.
const deriveTitle = (title: string, content: string): string => {
  if (title.trim() !== DEFAULT_TITLE) return title

  const firstLine = toPlainText(content)
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)

  if (!firstLine) return title
  return firstLine.length > 60 ? `${firstLine.slice(0, 60).trimEnd()}…` : firstLine
}

interface DocumentStore {
  documents: DocumentState[]
  activeDocId: string | null
  currentTitle: string
  currentContent: string
  isSaved: boolean
  // Zvýší se při každém přepnutí/resetu dokumentu (nový/otevřený/importovaný),
  // aby EditorPaper poznal, kdy má přepsat obsah contentEditable divu
  revision: number

  setTitle: (title: string) => void
  setContent: (content: string) => void
  saveCurrentDocument: () => void
  // Uloží rozdělanou práci, ale jen když stojí za uložení
  autosaveCurrent: () => void
  createNewDocument: () => void
  loadDocument: (id: string) => void
  deleteDocument: (id: string) => void
  importDocument: (title: string, content: string) => void
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      documents: [],
      activeDocId: null,
      currentTitle: DEFAULT_TITLE,
      currentContent: '',
      isSaved: true,
      revision: 0,

      setTitle: (title) => set({ currentTitle: title, isSaved: false }),
      setContent: (content) => set({ currentContent: content, isSaved: false }),

      saveCurrentDocument: () => {
        const { activeDocId, currentContent, documents } = get()
        const now = new Date().toISOString()
        const currentTitle = deriveTitle(get().currentTitle, currentContent)

        if (activeDocId) {
          set({
            documents: documents.map((doc) =>
              doc.id === activeDocId ? { ...doc, title: currentTitle, content: currentContent, lastModified: now } : doc
            ),
            currentTitle,
            isSaved: true,
          })
        } else {
          const newId = `doc-${Date.now()}`
          set({
            activeDocId: newId,
            documents: [
              { id: newId, title: currentTitle, content: currentContent, lastModified: now },
              ...documents,
            ],
            currentTitle,
            isSaved: true,
          })
          useGamificationStore.getState().recordAction('document', XP_PER_NEW_DOCUMENT)
        }
      },

      autosaveCurrent: () => {
        const { isSaved, activeDocId, currentContent } = get()
        if (isSaved) return
        // Nový dokument zakládáme, až když v něm něco je; u už uloženého
        // dokumentu ukládáme každou změnu.
        if (!activeDocId && plainTextLength(currentContent) < MIN_AUTOSAVE_CHARS) return
        get().saveCurrentDocument()
      },

      createNewDocument: () => {
        // Rozdělaná práce se dřív při založení nového dokumentu ztratila
        // bez jediného upozornění.
        get().autosaveCurrent()

        set((state) => ({
          activeDocId: null,
          currentTitle: DEFAULT_TITLE,
          currentContent: '',
          isSaved: true,
          revision: state.revision + 1,
        }))
      },

      loadDocument: (id) => {
        get().autosaveCurrent()

        const doc = get().documents.find((d) => d.id === id)
        if (doc) {
          set((state) => ({
            activeDocId: doc.id,
            currentTitle: doc.title,
            currentContent: doc.content,
            isSaved: true,
            revision: state.revision + 1,
          }))
        }
      },

      deleteDocument: (id) => {
        const { activeDocId, documents } = get()
        const updated = documents.filter((d) => d.id !== id)

        if (activeDocId === id) {
          set((state) => ({
            documents: updated,
            activeDocId: null,
            currentTitle: DEFAULT_TITLE,
            currentContent: '',
            isSaved: true,
            revision: state.revision + 1,
          }))
        } else {
          set({ documents: updated })
        }
      },

      importDocument: (title, content) => {
        const newId = `doc-${Date.now()}`
        const now = new Date().toISOString()
        const importedDoc = { id: newId, title, content, lastModified: now }

        set((state) => ({
          documents: [importedDoc, ...state.documents],
          activeDocId: newId,
          currentTitle: title,
          currentContent: content,
          isSaved: true,
          revision: state.revision + 1,
        }))
      },
    }),
    {
      name: 'schoolbuddy-document-editor-storage',
      storage: createJSONStorage(() => secureStorage),
    }
  )
)
