import { useState } from 'react'
import { FileItem, INITIAL_FILES } from './types'

export const useFileManager = () => {
  const [files, setFiles] = useState<FileItem[]>(INITIAL_FILES)
  const [search, setSearch] = useState('')

  const addFile = (name: string, type: FileItem['type']) => {
    if (!name.trim()) return
    const newFile: FileItem = {
      id: Date.now().toString(),
      name: name.includes('.') ? name : `${name}.${type}`,
      size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
      type,
      date: new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
    }
    setFiles((prev) => [newFile, ...prev])
  }

  const deleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  return { files: filteredFiles, search, setSearch, addFile, deleteFile }
}
