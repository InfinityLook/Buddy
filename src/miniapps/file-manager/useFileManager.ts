import { useCallback, useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { normalizeText } from '@/core/utils/text'
import {
  MAX_FILE_BYTES,
  deleteFileBlob,
  getFileBlob,
  listStoredFileIds,
  putFileBlob,
} from '@/core/utils/fileStorage'
import {
  ALL_FOLDERS,
  FileItem,
  FileKind,
  SortMode,
  UNSORTED_FOLDER,
  kindFromFile,
} from './types'

const XP_PER_FILE = 5

interface FileManagerState {
  files: FileItem[]
  sortMode: SortMode
  addFile: (item: FileItem) => void
  updateFile: (id: string, name: string, folder: string) => void
  removeFile: (id: string) => void
  setSortMode: (mode: SortMode) => void
}

const useFileManagerStore = create<FileManagerState>()(
  persist(
    (set) => ({
      // Žádné ukázkové soubory — seznam začíná prázdný, protože každý
      // záznam musí mít v IndexedDB skutečný obsah.
      files: [],
      sortMode: 'date',

      addFile: (item) => set((state) => ({ files: [item, ...state.files] })),

      updateFile: (id, name, folder) => {
        if (!name.trim()) return
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id
              ? { ...f, name: name.trim(), folder: folder.trim() || UNSORTED_FOLDER }
              : f
          ),
        }))
      },

      removeFile: (id) => set((state) => ({ files: state.files.filter((f) => f.id !== id) })),

      setSortMode: (mode) => set({ sortMode: mode }),
    }),
    {
      name: 'schoolbuddy-file-manager-storage',
      storage: createJSONStorage(() => secureStorage),

      // Starší verze ukládala velikost jako řetězec ("2.4 MB") a za
      // záznamem nebyl žádný soubor. Takové položky zahodíme, ať seznam
      // neslibuje obsah, který nikdy neexistoval.
      merge: (persisted, current) => {
        const saved = persisted as Partial<FileManagerState> | undefined
        const files = (saved?.files ?? [])
          .filter((f) => typeof f.size === 'number')
          // Soubory uložené dřív, než přibyly složky a čas přidání
          .map((f) => ({
            ...f,
            folder: f.folder?.trim() || UNSORTED_FOLDER,
            addedAt: f.addedAt ?? 0,
          }))
        return { ...current, ...saved, files, sortMode: saved?.sortMode ?? 'date' }
      },
    }
  )
)

export type AddFileResult = { ok: true } | { ok: false; error: string }

export const useFileManager = () => {
  const { files, sortMode, addFile, updateFile, removeFile, setSortMode } = useFileManagerStore()

  const [search, setSearch] = useState('')
  const [folder, setFolder] = useState<string>(ALL_FOLDERS)
  const [kindFilter, setKindFilter] = useState<FileKind | 'all'>('all')
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

  const uploadFile = async (file: File, targetFolder?: string): Promise<AddFileResult> => {
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
      addedAt: Date.now(),
      // Nahrává-li se do otevřené složky, soubor rovnou patří do ní
      folder: targetFolder && targetFolder !== ALL_FOLDERS ? targetFolder : UNSORTED_FOLDER,
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

  const folders = useMemo(
    () =>
      [...new Set(files.map((f) => f.folder || UNSORTED_FOLDER))].sort((a, b) =>
        a.localeCompare(b, 'cs')
      ),
    [files]
  )

  // Typy, které se mezi soubory skutečně vyskytují — filtr tak nikdy
  // nenabídne kategorii, pod kterou nic není.
  const availableKinds = useMemo(
    () => [...new Set(files.map((f) => f.type))],
    [files]
  )

  const visibleFiles = useMemo(() => {
    const query = normalizeText(search.trim())

    const filtered = files.filter((f) => {
      const inFolder = folder === ALL_FOLDERS || (f.folder || UNSORTED_FOLDER) === folder
      const matchesKind = kindFilter === 'all' || f.type === kindFilter
      const matchesSearch = query === '' || normalizeText(f.name).includes(query)
      return inFolder && matchesKind && matchesSearch
    })

    const byName = (a: FileItem, b: FileItem) => a.name.localeCompare(b.name, 'cs')

    switch (sortMode) {
      case 'name':
        return [...filtered].sort(byName)
      case 'size':
        return [...filtered].sort((a, b) => b.size - a.size || byName(a, b))
      case 'date':
      default:
        return [...filtered].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0) || byName(a, b))
    }
  }, [files, folder, kindFilter, search, sortMode])

  const totalBytes = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files])

  return {
    files: visibleFiles,
    totalCount: files.length,
    totalBytes,
    folders,
    availableKinds,
    folder,
    setFolder,
    kindFilter,
    setKindFilter,
    sortMode,
    setSortMode,
    search,
    setSearch,
    uploadFile,
    downloadFile,
    updateFile,
    deleteFile,
    // null = ještě nevíme (IndexedDB se načítá), pak je to seznam id
    isAvailable: (id: string) => availableIds === null || availableIds.includes(id),
  }
}

// Náhledy obrázků. Object URL se musí po odmountování uvolnit, jinak
// blob zůstane v paměti až do zavření stránky.
export const useImageThumbnails = (files: FileItem[]): Record<string, string> => {
  const [urls, setUrls] = useState<Record<string, string>>({})

  // Závislost přes id, ne přes pole — jinak by se efekt spouštěl při
  // každém překreslení a náhledy by blikaly.
  const imageIds = files
    .filter((f) => f.type === 'img')
    .map((f) => f.id)
    .join(',')

  useEffect(() => {
    let cancelled = false
    const created: string[] = []

    const load = async () => {
      const ids = imageIds ? imageIds.split(',') : []
      const next: Record<string, string> = {}

      for (const id of ids) {
        const blob = await getFileBlob(id)
        if (!blob) continue
        const url = URL.createObjectURL(blob)
        created.push(url)
        next[id] = url
      }

      if (cancelled) {
        created.forEach((url) => URL.revokeObjectURL(url))
        return
      }
      setUrls(next)
    }

    void load()

    return () => {
      cancelled = true
      created.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [imageIds])

  return urls
}
