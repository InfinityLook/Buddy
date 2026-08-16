import React, { useState } from 'react'
import { useFileManager } from './useFileManager'
import { FileItem } from './types'
import './FileManager.css'

export const FileManager: React.FC = () => {
  const { files, search, setSearch, addFile, deleteFile } = useFileManager()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<FileItem['type']>('pdf')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addFile(name, type)
    setName('')
    setShowAdd(false)
  }

  const getTypeIcon = (t: FileItem['type']) => {
    switch (t) {
      case 'pdf': return '📄'
      case 'doc': return '📝'
      case 'img': return '🖼️'
      case 'zip': return '📦'
    }
  }

  return (
    <div className="fm-app">
      <div className="fm-header">
        <h2>File Manager</h2>
        <button className="fm-add-btn" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '✕' : '+ Nahrát'}
        </button>
      </div>

      <input
        type="text"
        className="fm-search"
        placeholder="Hledat soubor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {showAdd && (
        <form className="fm-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Název souboru..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="fm-form-row">
            <select value={type} onChange={(e) => setType(e.target.value as FileItem['type'])}>
              <option value="pdf">PDF dokument</option>
              <option value="doc">Word / Text</option>
              <option value="img">Obrázek</option>
              <option value="zip">Archiv ZIP</option>
            </select>
            <button type="submit" className="fm-submit-btn">Uložit</button>
          </div>
        </form>
      )}

      <div className="fm-list">
        {files.length === 0 ? (
          <p className="fm-empty">Žádné soubory nenalezeny</p>
        ) : (
          files.map((f) => (
            <div key={f.id} className="fm-card">
              <span className="fm-icon">{getTypeIcon(f.type)}</span>
              <div className="fm-info">
                <span className="fm-name">{f.name}</span>
                <span className="fm-meta">{f.size} • {f.date}</span>
              </div>
              <button className="fm-del-btn" onClick={() => deleteFile(f.id)}>✕</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
              }
