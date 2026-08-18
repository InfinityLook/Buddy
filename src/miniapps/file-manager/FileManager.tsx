import React, { useRef, useState } from 'react'
import { useFileManager } from './useFileManager'
import { FileItem, FileKind, formatSize } from './types'
import './FileManager.css'

const TYPE_ICONS: Record<FileKind, string> = {
  pdf: '📄',
  doc: '📝',
  img: '🖼️',
  zip: '📦',
  other: '📎',
}

export const FileManager: React.FC = () => {
  const { files, totalCount, search, setSearch, uploadFile, downloadFile, deleteFile, isAvailable } =
    useFileManager()

  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const showMessage = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(null), 2600)
  }

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (selected.length === 0) return

    setBusy(true)
    let added = 0
    for (const file of selected) {
      const result = await uploadFile(file)
      if (result.ok) added += 1
      else showMessage(result.error)
    }
    setBusy(false)

    if (added > 0) showMessage(added === 1 ? 'Soubor uložen ✓' : `Uloženo souborů: ${added} ✓`)
  }

  const handleDownload = async (item: FileItem) => {
    const result = await downloadFile(item)
    if (!result.ok) showMessage(result.error)
  }

  return (
    <div className="fm-app">
      <div className="fm-header">
        <h2>File Manager</h2>
        <button className="fm-add-btn" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Ukládám…' : '+ Nahrát'}
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={handleFilesSelected} />
      </div>

      <input
        type="text"
        className="fm-search"
        placeholder="Hledat soubor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {message && <p className="fm-message">{message}</p>}

      <div className="fm-list">
        {files.length === 0 ? (
          <p className="fm-empty">
            {totalCount === 0 ? 'Zatím tu nemáš žádné soubory. Nahraj první 📎' : 'Žádné soubory nenalezeny'}
          </p>
        ) : (
          files.map((f) => {
            const available = isAvailable(f.id)
            return (
              <div key={f.id} className={`fm-card ${available ? '' : 'fm-card--missing'}`}>
                <span className="fm-icon">{TYPE_ICONS[f.type]}</span>
                <div className="fm-info">
                  <span className="fm-name">{f.name}</span>
                  <span className="fm-meta">
                    {available ? `${formatSize(f.size)} • ${f.date}` : 'Obsah v tomto zařízení chybí'}
                  </span>
                </div>
                {available && (
                  <button
                    className="fm-dl-btn"
                    onClick={() => handleDownload(f)}
                    aria-label={`Stáhnout ${f.name}`}
                  >
                    ⬇️
                  </button>
                )}
                <button
                  className="fm-del-btn"
                  onClick={() => deleteFile(f.id)}
                  aria-label={`Smazat ${f.name}`}
                >
                  ✕
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
