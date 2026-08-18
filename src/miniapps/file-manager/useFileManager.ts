import { useCallback, useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import {
  MAX_FILE_BYTES,
  deleteFileBlob,
  getFileBlob,
  listStoredFileIds,
  putFileBlob,
} from '@/core/utils/fileStorage'
import { FileItem, kindFromFile } from './types'

const XP_PER_FILE = 5

interface FileManagerState {
  files: FileItem[]
  addFile: (item: FileItem) => void
  removeFile: (id: string) => void
}

const useFileManagerStore = create<FileManagerState>()(
  persist(
    (set) => ({
      // Žádné ukázkové soubory — seznam začíná prázdný, protože každý
      // záznam musí mít v IndexedDB skutečný obsah.
      files: [],

      addFile: (item) => set((state) => ({ files: [item, ...state.files] })),

      removeFile: (id) => set((state) => ({ files: state.files.filter((f) => f.id !== id) })),
    }),
    {
      name: 'schoolbuddy-file-manager-storage',
      storage: createJSONStorage(() => secureStorage),

      // Starší verze ukládala velikost jako řetězec ("2.4 MB") a za
      // záznamem nebyl žádný soubor. Takové položky zahodíme, ať seznam
      // neslibuje obsah, který nikdy neexistoval.
      merge: (persisted, current) => {
        const saved = persisted as Partial<FileManagerState> | undefined
        const files = (saved?.files ?? []).filter((f) => typeof f.size === 'number')
        return { ...current, ...saved, files }
      },
    }
  )
)

export type AddFileResult = { ok: true } | { ok: false; error: string }

export const useFileManager = () => {
  const { files, addFile, removeFile } = useFileManagerStore()
  const [search, setSearch] = useState('')
  // Id souborů, ke kterým máme i obsah. Po obnově ze zálohy z jiného
  // zařízení můžou existovat metadata bez dat — viz core/utils/fileStorage.
  const [availableIds, setAvailableIds] = useState<string[] | null>(null)

  const refreshAvailable = useCallback(() => {
    listStoredFileIds()
      .then(setAvailableIds)
      .catch(() => setAvailableIds([]))
  }, [])

  useEffect(() => {
    refreshAvailable()
  }, [refreshAvailable])

  const uploadFile = async (file: File): Promise<AddFileResult> => {
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, error: `Soubor je moc velký (limit je ${MAX_FILE_BYTES / 1024 / 1024} MB).` }
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    try {
      await putFileBlob(id, file)
    } catch {
      return { ok: false, error: 'Soubor se nepodařilo uložit do zařízení.' }
    }

    addFile({
      id,
      name: file.name,
      size: file.size,
      type: kindFromFile(file),
      mime: file.type || 'application/octet-stream',
      date: new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
    })

    refreshAvailable()
    useGamificationStore.getState().recordAction('file', XP_PER_FILE)
    return { ok: true }
  }

  // Stažení zpátky do zařízení — teprve tímhle je správce souborů k něčemu
  const downloadFile = async (item: FileItem): Promise<AddFileResult> => {
    const blob = await getFileBlob(item.id)
    if (!blob) return { ok: false, error: 'Obsah tohoto souboru v zařízení není.' }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = item.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return { ok: true }
  }

  const deleteFile = async (id: string) => {
    removeFile(id)
    try {
      await deleteFileBlob(id)
    } catch {
      // Metadata jsou pryč, osamocený blob nikomu nevadí a uklidí se
      // při příštím pokusu o zápis pod stejným id.
    }
    refreshAvailable()
  }

  const filteredFiles = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))

  return {
    files: filteredFiles,
    totalCount: files.length,
    search,
    setSearch,
    uploadFile,
    downloadFile,
    deleteFile,
    // null = ještě nevíme (IndexedDB se načítá), pak je to seznam id
    isAvailable: (id: string) => availableIds === null || availableIds.includes(id),
  }
}
