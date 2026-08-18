import { useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { FileItem, INITIAL_FILES } from './types'

const XP_PER_FILE = 5

interface FileManagerState {
  files: FileItem[]
  addFile: (name: string, type: FileItem['type']) => void
  deleteFile: (id: string) => void
}

const useFileManagerStore = create<FileManagerState>()(
  persist(
    (set) => ({
      files: INITIAL_FILES,

      addFile: (name, type) => {
        if (!name.trim()) return
        const newFile: FileItem = {
          id: Date.now().toString(),
          name: name.includes('.') ? name : `${name}.${type}`,
          size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
          type,
          date: new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
        }
        set((state) => ({ files: [newFile, ...state.files] }))
        useGamificationStore.getState().recordAction('file', XP_PER_FILE)
      },

      deleteFile: (id) =>
        set((state) => ({ files: state.files.filter((f) => f.id !== id) })),
    }),
    {
      name: 'schoolbuddy-file-manager-storage',
      storage: createJSONStorage(() => secureStorage),
    }
  )
)

export const useFileManager = () => {
  const { files, addFile, deleteFile } = useFileManagerStore()
  const [search, setSearch] = useState('')

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  return { files: filteredFiles, search, setSearch, addFile, deleteFile }
}
