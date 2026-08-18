import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { DocumentState } from './types'
import { useGamificationStore } from '@/core/store/useGamificationStore'

// XP jen za první uložení dokumentu — přepsat už uložený text
// není nová práce a nemá se odměňovat pokaždé znovu
const XP_PER_NEW_DOCUMENT = 15

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
      currentTitle: 'Nový dokument',
      currentContent: '',
      isSaved: true,
      revision: 0,

      setTitle: (title) => set({ currentTitle: title, isSaved: false }),
      setContent: (content) => set({ currentContent: content, isSaved: false }),

      saveCurrentDocument: () => {
        const { activeDocId, currentTitle, currentContent, documents } = get()
        const now = new Date().toISOString()

        if (activeDocId) {
          set({
            documents: documents.map((doc) =>
              doc.id === activeDocId ? { ...doc, title: currentTitle, content: currentContent, lastModified: now } : doc
            ),
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
            isSaved: true,
          })
          useGamificationStore.getState().recordAction('document', XP_PER_NEW_DOCUMENT)
        }
      },

      createNewDocument: () => {
        set((state) => ({
          activeDocId: null,
          currentTitle: 'Nový dokument',
          currentContent: '',
          isSaved: true,
          revision: state.revision + 1,
        }))
      },

      loadDocument: (id) => {
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
            currentTitle: 'Nový dokument',
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
