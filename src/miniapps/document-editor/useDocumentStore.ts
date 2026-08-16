import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { DocumentState } from './types'

interface DocumentStore {
  documents: DocumentState[]
  activeDocId: string | null
  currentTitle: string
  currentContent: string
  isSaved: boolean
  
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
        }
      },

      createNewDocument: () => {
        set({
          activeDocId: null,
          currentTitle: 'Nový dokument',
          currentContent: '',
          isSaved: true,
        })
      },

      loadDocument: (id) => {
        const doc = get().documents.find((d) => d.id === id)
        if (doc) {
          set({
            activeDocId: doc.id,
            currentTitle: doc.title,
            currentContent: doc.content,
            isSaved: true,
          })
        }
      },

      deleteDocument: (id) => {
        const { activeDocId, documents } = get()
        const updated = documents.filter((d) => d.id !== id)
        
        if (activeDocId === id) {
          set({
            documents: updated,
            activeDocId: null,
            currentTitle: 'Nový dokument',
            currentContent: '',
            isSaved: true,
          })
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
        }))
      },
    }),
    {
      name: 'word-pro-mobile-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
              
